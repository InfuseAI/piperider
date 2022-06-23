from datetime import datetime

from piperider_cli.assertion_engine.assertion import AssertionEngine, AssertionContext, AssertionResult

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
        return context.result.fail_with_assertion_error('The minimum value of the range should be the first number.')

    if between_criteria[0] <= row_count <= between_criteria[1]:
        return context.result.success()

    return context.result.fail()


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


def assert_column_schema_type(context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
    column_metrics = metrics.get('tables', {}).get(table, {}).get('columns', {}).get(column)
    if not column_metrics:
        return context.result.fail_with_metric_not_found_error(context.table, context.column)

    # Check assertion input
    assert_schema_type = context.asserts.get('schema_type').upper()
    if not assert_schema_type:
        return context.result.fail_with_assertion_error('Expect a SQL schema type')

    schema_type = column_metrics.get('schema_type')
    context.result.actual = schema_type

    if schema_type == assert_schema_type:
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
        return context.result.fail_with_assertion_error(
            f'Invalid types {invalid_types}. The column type should one of {COLUMN_TYPES}.')

    column_type = column_metrics.get('type')

    context.result.actual = column_type

    if column_type in set(assert_types):
        return context.result.success()

    return context.result.fail()


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
