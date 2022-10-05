from typing import Union

from piperider_cli.assertion_engine import AssertionContext, AssertionResult
from piperider_cli.assertion_engine.assertion import ValidationResult
from piperider_cli.assertion_engine.types.base import BaseAssertionType


class AssertRowCountInRange(BaseAssertionType):

    def name(self):
        return "assert_row_count_in_range"

    def execute(self, context: AssertionContext, table: str, column: str, metrics: dict):
        return assert_row_count_in_range(context, table, column, metrics)

    def validate(self, context: AssertionContext) -> ValidationResult:
        return ValidationResult(context).require('count').require_int_pair('count')


class AssertRowCount(BaseAssertionType):
    def name(self):
        return "assert_row_count"

    def execute(self, context: AssertionContext, table: str, column: str, metrics: dict):
        return assert_row_count(context, table, column, metrics)

    def validate(self, context: AssertionContext) -> ValidationResult:
        results = ValidationResult(context) \
            .require_one_of_parameters(['min', 'max']) \
            .int_if_present('min') \
            .int_if_present('max')

        if results.errors:
            return results

        if context.asserts.get('min') is not None and context.asserts.get('max') is not None:
            if context.asserts.get('min') > context.asserts.get('max'):
                results.errors.append('The max value should be greater than or equal to the min value.')

        return results


class AssertMetric(BaseAssertionType):

    def name(self):
        return "row count"

    def execute(self, context: AssertionContext, table: str, column: str, metrics: dict):
        table_metrics = metrics.get('tables', {}).get(table)
        if not table_metrics:
            return context.result.fail_with_metric_not_found_error(context.table, context.column)

        # Get the metric for the current table
        row_count = table_metrics.get('row_count')
        context.result.name = 'Row Count'
        context.result.actual = row_count

        if assert_metric_boundary(row_count, context.asserts):
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

        assert_metric_validation(context.asserts, results)

        return results


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


def assert_metric_boundary(metric: Union[int, float], metric_boundary: dict) -> bool:
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


def assert_metric_validation(metric_boundary: dict, results: ValidationResult):
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
