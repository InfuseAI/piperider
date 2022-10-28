from piperider_cli.assertion_engine import AssertionContext, AssertionResult
from piperider_cli.assertion_engine.assertion import ValidationResult
from piperider_cli.assertion_engine.types.base import BaseAssertionType

COLUMN_TYPES = ['string', 'integer', 'numeric', 'datetime', 'date', 'time', 'boolean', 'other']


class AssertColumnSchemaType(BaseAssertionType):
    def name(self):
        return "assert_column_schema_type"

    def execute(self, context: AssertionContext):
        return assert_column_schema_type(context)

    def validate(self, context: AssertionContext) -> ValidationResult:
        # type list: https://docs.sqlalchemy.org/en/14/core/type_basics.html#sql-standard-and-multiple-vendor-types
        return ValidationResult(context).require('schema_type', str)


class AssertColumnType(BaseAssertionType):
    def name(self):
        return "assert_column_type"

    def execute(self, context: AssertionContext):
        return assert_column_type(context)

    def validate(self, context: AssertionContext) -> ValidationResult:
        result = ValidationResult(context).require('type', str)
        if result.has_errors():
            return result

        if not set([context.asserts.get("type")]).issubset(set(COLUMN_TYPES)):
            result.errors.append(
                f'type parameter should be one of {COLUMN_TYPES}, input: {context.asserts.get("type")}')
        return result


class AssertColumnInTypes(BaseAssertionType):
    def name(self):
        return "assert_column_in_types"

    def execute(self, context: AssertionContext):
        return assert_column_in_types(context)

    def validate(self, context: AssertionContext) -> ValidationResult:
        result = ValidationResult(context).require('types', list)
        if result.has_errors():
            return result

        if not set(context.asserts.get("types")).issubset(set(COLUMN_TYPES)):
            result.errors.append(f'types parameter should be one of {COLUMN_TYPES}, '
                                 f'input: {context.asserts.get("types")}')

        return result


def assert_column_schema_type(context: AssertionContext) -> AssertionResult:
    table = context.table
    column = context.column
    metrics = context.profiler_result

    column_metrics = metrics.get('tables', {}).get(table, {}).get('columns', {}).get(column)
    if not column_metrics:
        return context.result.fail_with_metric_not_found_error(context.table, context.column)

    # Check assertion input
    assert_schema_type = context.asserts.get('schema_type').upper()
    if not assert_schema_type:
        return context.result.fail_with_assertion_error('Expect a SQL schema type')
    context.result.expected = assert_schema_type

    schema_type = column_metrics.get('schema_type')
    context.result.actual = schema_type

    if schema_type == assert_schema_type:
        return context.result.success()

    return context.result.fail()


def assert_column_type(context: AssertionContext) -> AssertionResult:
    table = context.table
    column = context.column
    metrics = context.profiler_result

    column_metrics = metrics.get('tables', {}).get(table, {}).get('columns', {}).get(column)
    if not column_metrics:
        return context.result.fail_with_metric_not_found_error(context.table, context.column)

    # Check assertion input
    assert_type = context.asserts.get('type').lower()
    if not assert_type:
        return context.result.fail_with_assertion_error(f'Expect a type in {COLUMN_TYPES}')

    if assert_type not in COLUMN_TYPES:
        return context.result.fail_with_assertion_error(f'The column type should one of {COLUMN_TYPES}.')

    context.result.expected = assert_type

    column_type = column_metrics.get('type')

    context.result.actual = column_type

    if column_type == assert_type:
        return context.result.success()

    return context.result.fail()


def assert_column_in_types(context: AssertionContext) -> AssertionResult:
    table = context.table
    column = context.column
    metrics = context.profiler_result

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

    context.result.expected = assert_types

    column_type = column_metrics.get('type')

    context.result.actual = column_type

    if column_type in set(assert_types):
        return context.result.success()

    return context.result.fail()
