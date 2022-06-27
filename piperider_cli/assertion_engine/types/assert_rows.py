from piperider_cli.assertion_engine import AssertionContext, AssertionResult
from piperider_cli.assertion_engine.types.base import BaseAssertionType


class AssertRowCountInRange(BaseAssertionType):

    def name(self):
        return "assert_row_count_in_range"

    def execute(self, context: AssertionContext, table: str, column: str, metrics: dict):
        return assert_row_count_in_range(context, table, column, metrics)

    def validate(self, context: AssertionContext) -> AssertionResult:
        # TODO verify "count" exists
        # TODO verify two parameters in same type and all integer values
        pass


class AssertRowCount(BaseAssertionType):
    def name(self):
        return "assert_row_count"

    def execute(self, context: AssertionContext, table: str, column: str, metrics: dict):
        return assert_row_count(context, table, column, metrics)

    def validate(self, context: AssertionContext) -> AssertionResult:
        # TODO verify "min" and "max" exists
        # TODO verify two parameters in same type and all integer values
        pass


def assert_row_count(context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
    table_metrics = metrics.get('tables', {}).get(table)
    if not table_metrics:
        return context.result.fail_with_metric_not_found_error(context.table, context.column)

    # Get the metric for the current table
    row_count = table_metrics.get('row_count')
    context.result.actual = row_count

    min = context.asserts.get('min', 0)
    max = context.asserts.get('max')

    if context.asserts.get('min') is None and context.asserts.get('max') is None:
        return context.result.fail_with_assertion_error('Expect a min or max value.')
    if not isinstance(min, int):
        return context.result.fail_with_assertion_error('The min value should be an integer.')
    if min < 0:
        return context.result.fail_with_assertion_error('The min value should be greater than or equal to 0.')

    # Only provide min
    if max is None:
        if min <= row_count:
            return context.result.success()
    else:
        if not isinstance(max, int):
            return context.result.fail_with_assertion_error('The max value should be an integer.')
        if max < min:
            return context.result.fail_with_assertion_error(
                'The max value should be greater than or equal to the min value.')
        if min <= row_count <= max:
            return context.result.success()
    return context.result.fail()


def assert_row_count_in_range(context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
    table_metrics = metrics.get('tables', {}).get(table)
    if not table_metrics:
        return context.result.fail_with_metric_not_found_error(context.table, context.column)

    # Get the metric for the current table
    row_count = table_metrics.get('row_count')
    context.result.actual = row_count

    between_criteria = context.asserts.get('count', [])

    if len(between_criteria) != 2:
        return context.result.fail_with_assertion_error('Expect a range [min_value, max_value].')

    valid_type = isinstance(between_criteria[0], int) and isinstance(between_criteria[1], int)
    if not valid_type:
        return context.result.fail_with_assertion_error('The range should be integers.')

    if between_criteria[0] > between_criteria[1]:
        return context.result.fail_with_assertion_error(
            'The minimum value of the range should be the first number.')

    if between_criteria[0] <= row_count <= between_criteria[1]:
        return context.result.success()

    return context.result.fail()
