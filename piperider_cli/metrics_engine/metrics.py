import concurrent.futures
import decimal
import itertools
from typing import List, Union

from sqlalchemy import select, func, distinct, literal_column, join, Date, outerjoin, Column
from sqlalchemy.engine import Engine, Connection
from sqlalchemy.pool import SingletonThreadPool
from sqlalchemy.sql.expression import table as table_clause, column as column_clause, text
from sqlalchemy.sql.selectable import CTE

from piperider_cli.metrics_engine.event import MetricEventHandler, DefaultMetricEventHandler


def dtof(value: Union[int, float, decimal.Decimal]) -> Union[int, float]:
    """
    dtof is helpler function to transform decimal value to float. Decimal is not json serializable type.

    :param value:
    :return:
    """
    if isinstance(value, decimal.Decimal):
        return float(value)
    return value


class Metric:
    def __init__(self, name, table, schema, expression, timestamp, calculation_method, time_grains=None, dimensions=None,
                 filters=None, label=None, description=None):
        self.name = name
        self.table = table
        self.schema = schema
        self.expression = expression
        self.timestamp = timestamp
        self.calculation_method = calculation_method
        self.time_grains = time_grains
        self.dimensions = dimensions
        self.filters = filters
        self.label = label
        self.description = description
        self.ref_metrics: List[Metric] = []


class MetricEngine:
    """
    Profiler profile tables and columns by a sqlalchemy engine.
    """

    def __init__(self, engine: Engine, metrics, event_handler: MetricEventHandler = DefaultMetricEventHandler()):
        self.engine = engine
        self.metrics = metrics
        self.event_handler = event_handler

    @staticmethod
    def get_query_param(metric: Metric) -> (str, List[str]):
        for grain in metric.time_grains:
            if grain not in ['day', 'week', 'month', 'quarter', 'year']:
                continue
            if not metric.dimensions:
                yield grain, []
            else:
                for r in range(1, len(metric.dimensions) + 1):
                    for dims in itertools.combinations(metric.dimensions, r):
                        yield grain, list(dims)

    @staticmethod
    def compose_query_name(grain: str, dimensions: List[str], label=False) -> str:
        if grain == 'day':
            grain = 'daily'
        else:
            grain += 'ly'

        if label:
            grain = grain.upper()[0] + grain[1:]

        return grain

    def get_query_statement(self, metric: Metric, grain: str, dimension: List[str]):
        date_column_name = f'date_{grain}'
        if metric.calculation_method != 'derived':
            column = [column_clause(metric.timestamp), literal_column(metric.expression)]
            selectable = table_clause(metric.table, *column, schema=metric.schema)
        else:
            selectable = None
            for ref_metric in metric.ref_metrics:
                cte = self.get_query_statement(ref_metric, grain, dimension).cte()
                if selectable is None:
                    selectable = cte
                else:
                    selectable = join(selectable, cte, selectable.c[date_column_name] == cte.c[date_column_name])

        if metric.calculation_method == 'count':
            agg_expression = func.count(selectable.columns[metric.expression])
        elif metric.calculation_method == 'count_distinct':
            agg_expression = func.count(distinct(selectable.columns[metric.expression]))
        elif metric.calculation_method == 'sum':
            agg_expression = func.sum(selectable.columns[metric.expression])
        elif metric.calculation_method == 'average':
            agg_expression = func.avg(selectable.columns[metric.expression])
        elif metric.calculation_method == 'min':
            agg_expression = func.min(selectable.columns[metric.expression])
        elif metric.calculation_method == 'max':
            agg_expression = func.max(selectable.columns[metric.expression])
        elif metric.calculation_method == 'derived':
            agg_expression = literal_column(metric.expression)
        else:
            return None

        if metric.calculation_method != 'derived':
            stmt = select([
                self.date_trunc(grain, selectable.columns[metric.timestamp]).label(date_column_name),
                agg_expression.label(metric.name)
            ]).select_from(
                selectable
            )
            stmt = self.set_query_start_date(stmt, selectable.columns[metric.timestamp], grain)

            for f in metric.filters:
                stmt = stmt.where(text(f"{f.get('field')} {f.get('operator')} {f.get('value')}"))

            stmt = stmt.group_by(self.date_trunc(grain, selectable.columns[metric.timestamp]))

            calendar_cte = self.get_calendar_cte(grain)
            base_cte = stmt.cte()

            stmt = select([
                calendar_cte.c.date.label(date_column_name),
                base_cte.c[metric.name]
            ]).select_from(
                outerjoin(calendar_cte, base_cte, calendar_cte.c.date == base_cte.c[date_column_name])
            )
        else:
            stmt = select([
                selectable.left.c[date_column_name],
                agg_expression.label(metric.name)
            ]).select_from(
                selectable
            )

        return stmt

    def set_query_start_date(self, stmt: select, timestamp_column: Column, grain: str):
        if grain == 'day':
            n = -30
        elif grain == 'week':
            n = -12
        elif grain == 'month':
            n = -12
        elif grain == 'quarter':
            n = -10
        elif grain == 'year':
            n = -10
        else:
            return stmt

        end_date = func.dateadd(grain, 1, self.date_trunc(grain, func.current_date()))
        start_date = func.dateadd(grain, n, end_date)

        return stmt.where(
            self.date_trunc(grain, timestamp_column) >= start_date
        )

    def get_calendar_cte(self, grain: str) -> CTE:
        if grain == 'day':
            n = -30
        elif grain == 'week':
            n = -12
        elif grain == 'month':
            n = -12
        elif grain == 'quarter':
            n = -10
        elif grain == 'year':
            n = -10

        end_date = func.dateadd(grain, 1, self.date_trunc(grain, func.current_date()))
        start_date = func.dateadd(grain, n, end_date)

        calendar_cte = select([
            func.cast(start_date, Date).label('date'),
            func.cast(end_date, Date).label('end_date')
        ]).cte(recursive=True)
        calendar_cte = calendar_cte.union_all(
            select([
                func.dateadd(grain, 1, calendar_cte.c.date),
                calendar_cte.c.end_date
            ]).select_from(
                calendar_cte
            ).where(
                func.dateadd(grain, 1, calendar_cte.c.date) < calendar_cte.c.end_date
            )
        )

        return calendar_cte

    def get_query_result(self, conn: Connection, metric: Metric, grain: str, dimension: List[str]) -> dict:
        headers = [f'date_{grain}'] + dimension + [metric.name]

        query_result = {
            'name': f'{metric.name}_{self.compose_query_name(grain, dimension)}',
            'label': f'{metric.label}::{self.compose_query_name(grain, dimension, label=True)}',
            'description': metric.description,
            'grain': grain,
            'dimensions': dimension,
            'headers': headers,
            'data': []
        }

        stmt = self.get_query_statement(metric, grain, dimension)
        stmt.order_by(literal_column(grain))
        result = conn.execute(stmt)

        for row in result:
            row = list(row)
            row[0] = str(row[0])
            row[-1] = dtof(row[-1])
            query_result['data'].append(row)

        return query_result

    def execute(self) -> List[dict]:
        metrics = self.metrics
        results = []
        with self.engine.connect() as conn:
            self.event_handler.handle_run_start()
            total_metric = len(metrics)
            completed_metric = 0

            for metric in metrics:
                self.event_handler.handle_run_progress(total_metric, completed_metric)
                self.event_handler.handle_metric_start(metric.label)

                total_param = len(list(self.get_query_param(metric)))
                completed_param = 0
                if isinstance(self.engine.pool, SingletonThreadPool):
                    for grain, dimension in self.get_query_param(metric):
                        self.event_handler.handle_metric_progress(metric.label, total_param, completed_param)
                        self.event_handler.handle_param_query_start(metric.label, self.compose_query_name(grain, dimension))
                        query_result = self.get_query_result(conn, metric, grain, dimension)

                        results.append(query_result)

                        self.event_handler.handle_param_query_end(metric.label)
                        completed_param += 1
                else:
                    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                        query_results = {}
                        future_to_query = {}
                        for grain, dimension in self.get_query_param(metric):
                            # to keep the order
                            query_param = self.compose_query_name(grain, dimension)
                            query_results[query_param] = None

                            future = executor.submit(self.get_query_result, conn, metric, grain, dimension)
                            future_to_query[future] = query_param

                        for future in concurrent.futures.as_completed(future_to_query):
                            query_param = future_to_query[future]
                            self.event_handler.handle_metric_progress(metric.label, total_param, completed_param)
                            self.event_handler.handle_param_query_start(metric.label, query_param)
                            query_results[query_param] = future.result()

                            self.event_handler.handle_param_query_end(metric.label)
                            completed_param += 1

                        for query_result in query_results.values():
                            results.append(query_result)

                self.event_handler.handle_metric_end(metric.label)
                completed_metric += 1
            self.event_handler.handle_run_end()
        return results

    def date_trunc(self, *args) -> Column:
        if self.engine.url.get_backend_name() == 'sqlite':
            if args[0] == "YEAR":
                return func.strftime("%Y-01-01", args[1])
            elif args[0] == "MONTH":
                return func.strftime("%Y-%m-01", args[1])
            else:
                return func.strftime("%Y-%m-%d", args[1])
        elif self.engine.url.get_backend_name() == 'bigquery':
            date_expression = args[1]
            date_part = args[0]
            return func.date_trunc(date_expression, text(date_part))
        else:
            return func.date_trunc(*args)
