from datetime import datetime

from .assertion import AssertionEngine, AssertionContext, AssertionResult


def assert_row_count(context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
    table_metrics = metrics.get('tables', {}).get(table)
    if not table_metrics:
        # cannot find the table in the metrics
        return context.result.fail()

    # Get the metric for the current table
    row_count = table_metrics.get('row_count')
    context.result.actual = row_count

    between_criteria = context.asserts.get('count', [])

    # TODO check assert args
    # TODO should make sure lower value at the first params
    if len(between_criteria) != 2:
        return context.result.fail()

    # TODO would we follow inclusive exclusive convention [m,n) ?
    if between_criteria[0] <= row_count <= between_criteria[1]:
        return context.result.success()

    return context.result.fail()


def assert_column_type(context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
    column_metrics = metrics.get('tables', {}).get(table, {}).get('columns', {}).get(column)
    if not column_metrics:
        # cannot find the column in the metrics
        return context.result.fail_with_syntax_error()

    # Check assertion input
    assert_type = context.asserts.get('type').lower()
    column_type = column_metrics.get('type').lower()

    context.result.actual = column_type

    if column_type == assert_type:
        return context.result.success()

    return context.result.fail()


def assert_column_min_in_range(context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
    return _assert_column_in_range(context, table, column, metrics, target_metric='min')


def assert_column_max_in_range(context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
    return _assert_column_in_range(context, table, column, metrics, target_metric='max')


def _assert_column_in_range(context: AssertionContext, table: str, column: str, metrics: dict,
                            **kwargs) -> AssertionResult:
    table_metrics = metrics.get('tables', {}).get(table)
    if not table_metrics:
        # cannot find the table in the metrics
        return context.result.fail_with_syntax_error()

    column_metrics = table_metrics.get('columns', {}).get(column)
    if not column_metrics:
        # cannot find the column in the metrics
        return context.result.fail_with_syntax_error()

    # Check assertion input
    target_metric = kwargs.get('target_metric')
    values = context.asserts.get(target_metric)
    if not values or len(values) != 2:
        return context.result.fail_with_syntax_error()

    if not column_metrics.get(target_metric):
        return context.result.fail_with_syntax_error()

    context.result.actual = {target_metric: column_metrics.get(target_metric)}

    if column_metrics.get('type') == 'datetime':
        # TODO: check datetime format. Maybe we can leverage the format checking by YAML parser
        actual = datetime.strptime(column_metrics.get(target_metric), '%Y-%m-%d %H:%M:%S.%f')
        from_value = values[0]
        to_value = values[1]

        if from_value <= actual <= to_value:
            # TODO: store actual value
            return context.result.success()
        return context.result.fail()
    elif column_metrics.get('type') == 'numeric':
        actual = column_metrics.get(target_metric)
        if values[0] <= actual <= values[1]:
            # TODO: store actual value
            return context.result.success()
        return context.result.fail()
    else:
        # column not support range
        return context.result.fail_with_syntax_error()

    pass
