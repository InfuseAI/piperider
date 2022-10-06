from typing import Union

from piperider_cli.assertion_engine import AssertionContext, ValidationResult
from piperider_cli.assertion_engine.types.base import BaseAssertionType


class AssertMetric(BaseAssertionType):

    def __init__(self):
        self.mapping = MetricName()

    def name(self):
        return ''

    def execute(self, context: AssertionContext, table: str, column: str, metrics: dict):
        target_metrics = metrics.get('tables', {}).get(table)
        if column:
            target_metrics = target_metrics.get('columns', {}).get(column)

        if not target_metrics:
            return context.result.fail_with_metric_not_found_error(context.table, context.column)

        value = target_metrics.get(context.metric)

        context.result.name = self.mapping.get(context.metric, target_metrics.get('type'))
        context.result.actual = value

        if self._assert_metric_boundary(value, context.asserts):
            return context.result.success()

        return context.result.fail()

    def validate(self, context: AssertionContext) -> ValidationResult:
        names = ['gte', 'lte', 'gt', 'lt', 'eq', 'ne']
        results = ValidationResult(context) \
            .allow_only(*names) \
            .if_present(int, *names)

        if context.asserts is None:
            results.errors.append(f'At least one of {names} is needed.')

        if results.errors:
            return results

        self._assert_metric_validation(context.asserts, results)

        return results

    @staticmethod
    def _assert_metric_boundary(metric: Union[int, float], metric_boundary: dict) -> bool:
        for op, v in metric_boundary.items():
            if op == 'gt' and not metric > v:
                return False
            elif op == 'gte' and not metric >= v:
                return False
            elif op == 'eq' and not metric == v:
                return False
            elif op == 'ne' and not metric != v:
                return False
            elif op == 'lt' and not metric < v:
                return False
            elif op == 'lte' and not metric <= v:
                return False
        return True

    @staticmethod
    def _assert_metric_validation(metric_boundary: dict, results: ValidationResult):
        if len(metric_boundary.keys()) == 1:
            pass
        elif len(metric_boundary.keys()) == 2:
            lower = None
            upper = None
            for op, v in metric_boundary.items():
                if op == 'eq' or op == 'ne':
                    results.errors.append('Only one operator allowed if the expression contains \'eq\' and \'ne\'')
                    return

                if op.startswith('lt'):
                    upper = v
                elif op.startswith('gt'):
                    lower = v

            if upper is None or lower is None:
                results.errors.append('Please specified your metric upper and lower boundary')
            elif upper < lower:
                results.errors.append('The max value should be greater than or equal to the min value.')
        else:
            results.errors.append('The number of operator should be 1 or 2.')


class MetricName:
    def __init__(self):
        self.mapping = {}
        self.all_type = 'ALL'

        self._add('row_count', 'Row count')
        self._add('min', 'Min', ['integer', 'numeric', 'datetime'])
        self._add('min', 'Min length', ['string'])
        self._add('nulls', 'Missing count')

    def _add(self, field, name, col_types: list[str] = None):
        if col_types is None or len(col_types) == 0:
            if self.all_type not in self.mapping:
                self.mapping[self.all_type] = {}
            self.mapping[self.all_type][field] = name
        else:
            for t in col_types:
                if t not in self.mapping:
                    self.mapping[t] = {}
                self.mapping[t][field] = name

    def get(self, field, col_type=None):
        name = self.mapping[self.all_type].get(field)

        if name is None and col_type is not None:
            name = self.mapping[col_type].get(field)

        return name
