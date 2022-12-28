import decimal
import itertools
from typing import List, Union

from sqlalchemy import select, func, distinct, literal_column, join
from sqlalchemy.engine import Engine
from sqlalchemy.sql.expression import table as table_clause, column as column_clause, text


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

    def __init__(self, engine: Engine, metrics):
        self.engine = engine
        self.metrics = metrics

    def get_query_statement(self, metric: Metric, grain, dimension):
        if metric.calculation_method != 'derived':
            column = [column_clause(metric.timestamp), column_clause(metric.expression)]
            for f in metric.filters:
                field = f.get('field')
                if field == metric.timestamp or field == metric.expression:
                    continue
                column.append(column_clause(field))
            selectable = table_clause(metric.table, *column, schema=metric.schema)
        else:
            selectable = None
            for ref_metric in metric.ref_metrics:
                cte = self.get_query_statement(ref_metric, grain, dimension).cte()
                if selectable is None:
                    selectable = cte
                else:
                    selectable = join(selectable, cte, selectable.c[grain] == cte.c[grain])

        if metric.calculation_method == 'count':
            agg_expression = func.count(selectable.columns[metric.expression])
        elif metric.calculation_method == 'count_distinct':
            agg_expression = func.count(distinct(selectable.columns[metric.expression]))
        elif metric.calculation_method == 'sum':
            agg_expression = func.sum(selectable.columns[metric.expression])
        elif metric.calculation_method == 'average':
            agg_expression = func.average(selectable.columns[metric.expression])
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
                self.date_trunc(grain, selectable.columns[metric.timestamp]).label(grain),
                agg_expression.label(metric.name)
            ]).select_from(
                selectable
            )
            for f in metric.filters:
                stmt = stmt.where(text(f"{f.get('field')} {f.get('operator')} {f.get('value')}"))

            stmt = stmt.group_by(self.date_trunc(grain, selectable.columns[metric.timestamp]))
        else:
            stmt = select([
                selectable.left.c[grain],
                agg_expression.label(metric.name)
            ]).select_from(
                selectable
            )

        return stmt

    @staticmethod
    def get_query_param(metric: Metric) -> (str, List[str]):
        for grain in metric.time_grains:
            if not metric.dimensions:
                yield grain, []
            else:
                for r in range(1, len(metric.dimensions) + 1):
                    for dims in itertools.combinations(metric.dimensions, r):
                        yield grain, list(dims)

    def execute(self):
        metrics = self.metrics
        results = []
        with self.engine.connect() as conn:
            for metric in metrics:
                metric_result = dict(
                    name=metric.name,
                    label=metric.label,
                    description=metric.description,
                    results=[]
                )

                for grain, dimension in self.get_query_param(metric):
                    headers = [grain] + dimension + [metric.name]

                    query_result = {
                        'name': grain,
                        'params': {
                            'dimensions': dimension,
                            'grain': grain
                        },
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

                    metric_result['results'].append(query_result)

                results.append(metric_result)
        return results

    def date_trunc(self, *args):
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
