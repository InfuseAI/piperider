import concurrent.futures
import decimal
import itertools
from typing import List, Union

from sqlalchemy import select, func, distinct, literal_column, join, outerjoin, Column, Date
from sqlalchemy.engine import Engine
from sqlalchemy.pool import SingletonThreadPool
from sqlalchemy.sql.expression import text, union_all, case
from sqlalchemy.sql.selectable import CTE

from piperider_cli.datasource import DataSource
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
    def __init__(
        self,
        name,
        table,
        schema,
        database,
        expression,
        timestamp,
        calculation_method,
        time_grains=None,
        dimensions=None,
        filters=None,
        label=None,
        description=None
    ):
        self.name = name
        self.table = table
        self.database = database
        self.schema = schema.lower() if schema is not None else None
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

    def __init__(
        self,
        data_source: DataSource,
        metrics,
        event_handler: MetricEventHandler = DefaultMetricEventHandler()
    ):
        self.data_source = data_source
        self.metrics = metrics
        self.event_handler = event_handler

    @staticmethod
    def _get_query_param(metric: Metric) -> (str, List[str]):
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
    def _compose_query_name(grain: str, dimensions: List[str], label=False) -> str:
        if grain == 'day':
            grain = 'daily'
        else:
            grain += 'ly'

        if label:
            grain = grain.upper()[0] + grain[1:]

        return grain

    def _get_query_stmt(self, metric: Metric, grain: str, dimension: List[str], date_spine_model: CTE):
        metric_column_name = metric.name

        if metric.calculation_method == 'derived':
            selectable = None

            # Join all parent metrics
            for ref_metric in metric.ref_metrics:
                cte = self._get_query_stmt(ref_metric, grain, dimension, date_spine_model).cte(
                    f'{ref_metric.name}_model')
                if selectable is None:
                    selectable = cte
                else:
                    selectable = join(selectable, cte, selectable.c.d == cte.c.d)

            # a / b / c -> a / nullif(b, 0) / nullif(c, 0)
            expression = metric.expression
            if '/' in expression:
                expression_list = expression.split('/')
                dividend = expression_list[0]
                divisors = [f'nullif({divisor}, 0)' for divisor in expression_list[1:]]
                expression = f"{dividend} / {'/'.join(divisors)}"

            return select([
                cte.c.d,
                literal_column(expression).label(metric_column_name)
            ]).select_from(
                selectable
            ).order_by(
                cte.c.d,
            )
        else:
            # Source model
            if self.data_source.type_name == 'bigquery':
                source_model = text(f"`{metric.database}.{metric.schema}.{metric.table}`")
            else:
                source_model = text(f"{metric.database}.{metric.schema}.{metric.table}")

            # Base model
            # 1. map expression to 'c'
            # 2. map truncated timestamp to 'd'
            # 3. Filter only the last n grain
            # 4. Filter according to metric filters
            start_date = self.date_trunc(grain, func.current_date()) - self._interval(grain,
                                                                                      self._slot_count_by_grain(grain))
            stmt = select([
                literal_column(metric.expression).label('c'),
                self.date_trunc(grain, func.cast(literal_column(metric.timestamp), Date)).label('d'),
            ]).select_from(
                source_model
            ).where(
                func.cast(literal_column(metric.timestamp), Date) >= start_date
            )
            for f in metric.filters:
                stmt = stmt.where(text(f"{f.get('field')} {f.get('operator')} {f.get('value')}"))
            base_model = stmt.cte(f"{metric.name}_base_model")

            # Aggregated model
            # 1. select 'd'
            # 1. aggrgate by calculation method as 'm'
            # 1. group by 'd'

            if metric.calculation_method == 'count':
                agg_expression = func.count(base_model.columns['c'])
            elif metric.calculation_method == 'count_distinct':
                agg_expression = func.count(distinct(base_model.columns['c']))
            elif metric.calculation_method == 'sum':
                agg_expression = func.sum(base_model.columns['c'])
            elif metric.calculation_method == 'average':
                agg_expression = func.avg(base_model.columns['c'])
            elif metric.calculation_method == 'min':
                agg_expression = func.min(base_model.columns['c'])
            elif metric.calculation_method == 'max':
                agg_expression = func.max(base_model.columns['c'])
            else:
                return None

            agg_model = select([
                base_model.c.d,
                agg_expression.label('m')
            ]).select_from(
                base_model
            ).group_by(
                base_model.c.d
            ).cte(name=f"{metric.name}_agg_model")

            metric_column = agg_model.c.m
            if metric.calculation_method in ['count', 'count_distinct', 'sum']:
                metric_column = case(
                    [(metric_column.is_(None), 0)],
                    else_=metric_column
                )

            return select([
                date_spine_model.c.d,
                metric_column.label(metric_column_name)
            ]).select_from(
                outerjoin(date_spine_model, agg_model, date_spine_model.c.d == agg_model.c.d)
            ).order_by(
                date_spine_model.c.d
            )

    def _interval(self, grain: str, n):
        if self.data_source.type_name == 'bigquery':
            return text(f"interval {n} {grain}")
        else:
            if grain == 'quarter':
                return text(f"interval '{n * 3} months'")
            else:
                return text(f"interval '{n} {grain}s'")

    def _slot_count_by_grain(self, grain: str):
        if grain == 'year':
            return 10
        elif grain == 'quarter':
            return 12
        elif grain == 'month':
            return 12
        elif grain == 'week':
            return 12
        else:
            return 30

    def _date_spine(self, grain: str):
        '''
        Generate the date spine for left join
        https://github.com/dbt-labs/dbt-utils#date_spine-source
        '''

        n = self._slot_count_by_grain(grain)
        dates = []
        for i in range(n):
            one_date = select([
                (self.date_trunc(grain, func.current_date()) - self._interval(grain, i + 1)).label('d')
            ])
            dates.append(one_date)

        current_date = select([
            self.date_trunc(grain, func.current_date()).label('d')
        ])

        return union_all(*dates, current_date)

    def _query_metric(self, engine: Engine, metric: Metric, grain: str, dimension: List[str]) -> dict:
        '''
        Query a metric with given parameter. Just implement the behavior of 'metrics.calculate'
        ref: https://docs.getdbt.com/docs/build/metrics#querying-your-metric

        :param metric:
        :param grain:
        :param dimension:
        :return:
        '''
        headers = [f'date_{grain}'] + dimension + [metric.name]

        query_result = {
            'name': f'{metric.name}_{self._compose_query_name(grain, dimension)}',
            'label': f'{metric.label} ({self._compose_query_name(grain, dimension, label=True)})',
            'description': metric.description,
            'grain': grain,
            'dimensions': dimension,
            'headers': headers,
            'data': []
        }

        with engine.connect() as conn:
            date_spine_model = self._date_spine(grain).cte(name="date_spine_model")
            stmt = self._get_query_stmt(metric, grain, dimension, date_spine_model)

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

        self.event_handler.handle_run_start()
        total_metric = len(metrics)
        completed_metric = 0

        for metric in metrics:
            self.event_handler.handle_run_progress(total_metric, completed_metric)
            self.event_handler.handle_metric_start(metric.label)

            total_param = len(list(self._get_query_param(metric)))
            completed_param = 0
            engine = self.data_source.get_engine_by_database(metric.database)
            if isinstance(engine.pool, SingletonThreadPool):
                for grain, dimension in self._get_query_param(metric):
                    self.event_handler.handle_metric_progress(metric.label, total_param, completed_param)
                    self.event_handler.handle_param_query_start(metric.label,
                                                                self._compose_query_name(grain, dimension))
                    query_result = self._query_metric(engine, metric, grain, dimension)

                    results.append(query_result)

                    self.event_handler.handle_param_query_end(metric.label)
                    completed_param += 1
            else:
                with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                    query_results = {}
                    future_to_query = {}
                    for grain, dimension in self._get_query_param(metric):
                        # to keep the order
                        query_param = self._compose_query_name(grain, dimension)
                        query_results[query_param] = None

                        future = executor.submit(self._query_metric, engine, metric, grain, dimension)
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

    def date_trunc(self, date_part, date_expression) -> Column:
        type_name = self.data_source.type_name
        if type_name == 'sqlite':
            if date_part == "YEAR":
                return func.strftime("%Y-01-01", date_expression)
            elif date_part == "MONTH":
                return func.strftime("%Y-%m-01", date_expression)
            else:
                return func.strftime("%Y-%m-%d", date_expression)
        elif type_name == 'bigquery':
            return func.date_trunc(date_expression, text(date_part))
        else:
            return func.date_trunc(date_part, date_expression)
