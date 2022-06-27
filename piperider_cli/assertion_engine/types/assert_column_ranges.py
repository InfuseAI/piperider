from datetime import datetime

from piperider_cli.assertion_engine import AssertionContext, AssertionResult
from piperider_cli.assertion_engine.types.base import BaseAssertionType


class AssertColumnMinInRange(BaseAssertionType):
    def name(self):
        return "assert_column_min_in_range"

    def execute(self, context: AssertionContext, table: str, column: str, metrics: dict):
        return assert_column_min_in_range(context, table, column, metrics)

    def validate(self, context: AssertionContext) -> AssertionResult:
        # TODO verify "min" exists
        # TODO verify two parameters in same type and all numeric values (including datetime, date, time)
        pass


class AssertColumnMaxInRange(BaseAssertionType):
    def name(self):
        return "assert_column_max_in_range"

    def execute(self, context: AssertionContext, table: str, column: str, metrics: dict):
        return assert_column_max_in_range(context, table, column, metrics)

    def validate(self, context: AssertionContext) -> AssertionResult:
        # TODO verify "max" exists
        # TODO verify two parameters in same type and all numeric values (including datetime, date, time)
        pass


class AssertColumnInRange(BaseAssertionType):
    def name(self):
        return "assert_column_in_range"

    def execute(self, context: AssertionContext, table: str, column: str, metrics: dict):
        return assert_column_in_range(context, table, column, metrics)

    def validate(self, context: AssertionContext) -> AssertionResult:
        # TODO verify "range" exists
        # TODO verify two parameters in same type and all numeric values (including datetime, date, time)
        pass


def assert_column_min_in_range(context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
    return _assert_column_in_range(context, table, column, metrics, target_metric='min')


def assert_column_max_in_range(context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
    return _assert_column_in_range(context, table, column, metrics, target_metric='max')


def assert_column_in_range(context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
    return _assert_column_in_range(context, table, column, metrics, target_metric='range')


def _assert_column_in_range(context: AssertionContext, table: str, column: str, metrics: dict,
                            **kwargs) -> AssertionResult:
    table_metrics = metrics.get('tables', {}).get(table)
    if table_metrics is None:
        return context.result.fail_with_metric_not_found_error(context.table, None)

    column_metrics = table_metrics.get('columns', {}).get(column)
    if column_metrics is None:
        return context.result.fail_with_metric_not_found_error(context.table, context.column)

    # Check assertion input
    target_metric = kwargs.get('target_metric')
    values = context.asserts.get(target_metric)
    if values is None or len(values) != 2:
        return context.result.fail_with_assertion_error('Expect a range [min_value, max_value].')

    class Observed(object):
        def __init__(self, column_metrics: dict, target_metric: str):
            self.column_metrics = column_metrics
            self.target_metric = target_metric
            self.column_type = column_metrics.get('type')
            self.actual = []

            if self.target_metric == 'range':
                self.actual = [column_metrics.get('min'), column_metrics.get('max')]
            else:
                self.actual = [column_metrics.get(target_metric)]

        def is_metric_available(self):
            return [x for x in self.actual if x is None] == []

        def check_range(self, min_value, max_value):
            for metric in self.actual:
                metric = self.to_numeric(metric)
                if metric is None:
                    yield context.result.fail_with_assertion_error('Column not support range.')
                else:
                    yield min_value <= metric <= max_value

        def to_numeric(self, metric):
            if self.column_type == 'datetime':
                # TODO: check datetime format. Maybe we can leverage the format checking by YAML parser
                return datetime.strptime(metric, '%Y-%m-%d %H:%M:%S.%f')
            elif self.column_type in ['integer', 'numeric']:
                return metric
            else:
                return None

        def actual_value(self):
            if len(self.actual) == 1:
                return self.actual[0]
            return self.actual

    observed = Observed(column_metrics, target_metric)
    if not observed.is_metric_available():
        return context.result.fail_with_metric_not_found_error(context.table, context.column)

    context.result.actual = {target_metric: observed.actual_value()}

    results = []
    for result in observed.check_range(values[0], values[1]):
        results.append(result)

    non_bools = [x for x in results if not isinstance(x, bool)]
    if non_bools:
        return non_bools[0]

    bools = [x for x in results if isinstance(x, bool)]
    if set(bools) == set([True]):
        return context.result.success()
    return context.result.fail()
