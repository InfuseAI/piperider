from datetime import datetime

from .assertion import AssertionEngine, AssertionContext, AssertionResult


COLUMN_TYPES = ['string', 'integer', 'numeric', 'datetime', 'date', 'time', 'boolean', 'other']


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
        return context.result.fail_with_assertion_error('The minimun value of the range should be the first number.')

    if between_criteria[0] <= row_count <= between_criteria[1]:
        return context.result.success()

    return context.result.fail()


def assert_column_type(context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
    column_metrics = metrics.get('tables', {}).get(table, {}).get('columns', {}).get(column)
    if not column_metrics:
        return context.result.fail_with_metric_not_found_error(context.table, context.column)

    # Check assertion input
    assert_type = context.asserts.get('type').lower()
    if not assert_type:
        return context.result.fail_with_assertion_error(f'Expect a type in {COLUMN_TYPES}')

    if assert_type not in COLUMN_TYPES:
        return context.result.fail_with_assertion_error(f'The column type should one of {COLUMN_TYPES}.')

    column_type = column_metrics.get('type')

    context.result.actual = column_type

    if column_type == assert_type:
        return context.result.success()

    return context.result.fail()


def assert_column_in_types(context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
    column_metrics = metrics.get('tables', {}).get(table, {}).get('columns', {}).get(column)
    if not column_metrics:
        return context.result.fail_with_metric_not_found_error(context.table, context.column)

    # Check assertion input
    assert_types = context.asserts.get('types', [])
    assert_types = [x.lower() for x in assert_types]
    if not assert_types:
        return context.result.fail_with_assertion_error(f'Expect a list of types in {COLUMN_TYPES}')

    invalid_types = [t for t in assert_types if t not in COLUMN_TYPES]
    if invalid_types:
        return context.result.fail_with_assertion_error(f'Invalid types {invalid_types}. The column type should one of {COLUMN_TYPES}.')

    column_type = column_metrics.get('type')

    context.result.actual = column_type

    if column_type in set(assert_types):
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
        return context.result.fail_with_metric_not_found_error(context.table, None)

    column_metrics = table_metrics.get('columns', {}).get(column)
    if not column_metrics:
        return context.result.fail_with_metric_not_found_error(context.table, context.column)

    # Check assertion input
    target_metric = kwargs.get('target_metric')
    values = context.asserts.get(target_metric)
    if not values or len(values) != 2:
        return context.result.fail_with_assertion_error('Expect a range [min_value, max_value].')

    if not column_metrics.get(target_metric):
        return context.result.fail_with_metric_not_found_error(context.table, context.column)

    context.result.actual = {target_metric: column_metrics.get(target_metric)}

    if column_metrics.get('type') == 'datetime':
        # TODO: check datetime format. Maybe we can leverage the format checking by YAML parser
        actual = datetime.strptime(column_metrics.get(target_metric), '%Y-%m-%d %H:%M:%S.%f')
    elif column_metrics.get('type') in ['integer', 'numeric']:
        actual = column_metrics.get(target_metric)
    else:
        return context.result.fail_with_assertion_error('Column not support range.')

    if values[0] <= actual <= values[1]:
        return context.result.success()
    return context.result.fail()


def assert_column_not_null(context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
    column_metrics = metrics.get('tables', {}).get(table, {}).get('columns', {}).get(column)
    if not column_metrics:
        return context.result.fail_with_metric_not_found_error(context.table, context.column)

    if context.asserts:
        return context.result.fail_with_no_assert_is_required()

    total = column_metrics.get('total')
    non_nulls = column_metrics.get('non_nulls')

    success = (total == non_nulls)
    context.result.actual = dict(success=success)

    if success:
        return context.result.success()

    return context.result.fail()


def assert_column_null(context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
    column_metrics = metrics.get('tables', {}).get(table, {}).get('columns', {}).get(column)
    if not column_metrics:
        # cannot find the column in the metrics
        return context.result.fail_with_metric_not_found_error(context.table, context.column)

    if context.asserts:
        return context.result.fail_with_no_assert_is_required()

    non_nulls = column_metrics.get('non_nulls')

    success = (non_nulls == 0)
    context.result.actual = dict(success=success)

    if success:
        return context.result.success()

    return context.result.fail()


def assert_column_unique(context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
    column_metrics = metrics.get('tables', {}).get(table, {}).get('columns', {}).get(column)
    if not column_metrics:
        # cannot find the column in the metrics
        return context.result.fail_with_metric_not_found_error(context.table, context.column)

    if context.asserts:
        return context.result.fail_with_no_assert_is_required()

    non_nulls = column_metrics.get('non_nulls')
    distinct = column_metrics.get('distinct')

    success = (non_nulls == distinct)
    context.result.actual = dict(success=success)

    if success:
        return context.result.success()

    return context.result.fail()


def assert_column_exist(context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
    table_metrics = metrics.get('tables', {}).get(table)
    if not table_metrics:
        # cannot find the table in the metrics
        return context.result.fail_with_metric_not_found_error(context.table, None)

    if context.asserts:
        return context.result.fail_with_no_assert_is_required()

    column_metrics = table_metrics.get('columns', {}).get(column)
    if column_metrics:
        context.result.actual = dict(success=True)
        return context.result.success()

    context.result.actual = dict(success=False)
    return context.result.fail()
