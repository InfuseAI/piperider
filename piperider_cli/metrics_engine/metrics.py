import itertools

from sqlalchemy import Table, MetaData, select, func, distinct
from sqlalchemy.engine import Engine


class Metric:
    def __init__(self, name, table, schema, expression, timestamp, calculation_method, time_grains=None, dimensions=None,
                 label=None, description=None):
        self.name = name
        self.table = table
        self.schema = schema
        self.expression = expression
        self.timestamp = timestamp
        self.calculation_method = calculation_method
        self.time_grains = time_grains
        self.dimensions = dimensions
        self.label = label
        self.description = description


class MetricEngine:
    """
    Profiler profile tables and columns by a sqlalchemy engine.
    """

    def __init__(self, engine: Engine, metrics):
        self.engine = engine
        self.metrics = metrics

    def get_query_statement(self, metric: Metric, grain, dimension):
        metadata_table = Table(metric.table, MetaData(), autoload_with=self.engine, schema=metric.schema)

        if metric.calculation_method == 'count':
            agg_expression = func.count(metadata_table.columns[metric.expression])
        elif metric.calculation_method == 'count_distinct':
            agg_expression = func.count(distinct(metadata_table.columns[metric.expression]))
        elif metric.calculation_method == 'sum':
            agg_expression = func.sum(metadata_table.columns[metric.expression])
        elif metric.calculation_method == 'average':
            agg_expression = func.average(metadata_table.columns[metric.expression])
        elif metric.calculation_method == 'min':
            agg_expression = func.min(metadata_table.columns[metric.expression])
        elif metric.calculation_method == 'max':
            agg_expression = func.max(metadata_table.columns[metric.expression])
        else:
            return None

        stmt = select([
            func.date_trunc(grain, metadata_table.columns[metric.timestamp]),
            agg_expression
        ]).select_from(
            metadata_table
        ).group_by(
            func.date_trunc(grain, metadata_table.columns[metric.timestamp])
        ).order_by(
            func.date_trunc(grain, metadata_table.columns[metric.timestamp])
        )

        return stmt

    @staticmethod
    def get_query_param(metric: Metric) -> (str, list[str]):
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
                    result = conn.execute(stmt)

                    for row in result:
                        row = list(row)
                        row[0] = str(row[0])
                        query_result['data'].append(row)

                    metric_result['results'].append(query_result)

                results.append(metric_result)
        return results
