from piperider_cli.assertion_engine import AssertionContext, AssertionResult
from piperider_cli.assertion_engine.types.base import BaseAssertionType

COLUMN_TYPES = ['string', 'integer', 'numeric', 'datetime', 'date', 'time', 'boolean', 'other']


class AssertColumnSchemaType(BaseAssertionType):
    def name(self):
        return "assert_column_schema_type"

    def execute(self, context: AssertionContext, table: str, column: str, metrics: dict):
        return assert_column_schema_type(context, table, column, metrics)

    def validate(self, context: AssertionContext) -> bool:
        pass


class AssertColumnType(BaseAssertionType):
    def name(self):
        return "assert_column_type"

    def execute(self, context: AssertionContext, table: str, column: str, metrics: dict):
        return assert_column_type(context, table, column, metrics)

    def validate(self, context: AssertionContext) -> bool:
        pass


class AssertColumnInTypes(BaseAssertionType):
    def name(self):
        return "assert_column_in_types"

    def execute(self, context: AssertionContext, table: str, column: str, metrics: dict):
        return assert_column_in_types(context, table, column, metrics)

    def validate(self, context: AssertionContext) -> bool:
        pass


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
