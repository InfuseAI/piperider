from piperider_cli.assertion_engine import AssertionContext, AssertionResult
from piperider_cli.assertion_engine.assertion import ValidationResult
from piperider_cli.assertion_engine.types.base import BaseAssertionType


class AssertColumnNotNull(BaseAssertionType):
    def name(self):
        return "assert_column_not_null"

    def execute(self, context: AssertionContext, table: str, column: str, metrics: dict):
        return assert_column_not_null(context, table, column, metrics)

    def validate(self, context: AssertionContext) -> ValidationResult:
        return ValidationResult(context).keep_no_args()


class AssertColumnNull(BaseAssertionType):
    def name(self):
        return "assert_column_null"

    def execute(self, context: AssertionContext, table: str, column: str, metrics: dict):
        return assert_column_null(context, table, column, metrics)

    def validate(self, context: AssertionContext) -> ValidationResult:
        return ValidationResult(context).keep_no_args()


class AssertColumnUnique(BaseAssertionType):
    def name(self):
        return "assert_column_unique"

    def execute(self, context: AssertionContext, table: str, column: str, metrics: dict):
        return assert_column_unique(context, table, column, metrics)

    def validate(self, context: AssertionContext) -> ValidationResult:
        return ValidationResult(context).keep_no_args()


class AssertColumnExist(BaseAssertionType):
    def name(self):
        return "assert_column_exist"

    def execute(self, context: AssertionContext, table: str, column: str, metrics: dict):
        return assert_column_exist(context, table, column, metrics)

    def validate(self, context: AssertionContext) -> ValidationResult:
        return ValidationResult(context).keep_no_args()


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
