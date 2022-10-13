from datetime import datetime

from piperider_cli.assertion_engine import AssertionContext, AssertionResult
from piperider_cli.assertion_engine.assertion import ValidationResult
from piperider_cli.assertion_engine.types.base import BaseAssertionType
from piperider_cli.assertion_engine.types.assert_metrics import AssertMetric


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


class AssertColumnValue(BaseAssertionType):
    def name(self):
        return "assert_column_value"

    def execute(self, context: AssertionContext, table: str, column: str, metrics: dict):
        target_metrics = metrics.get('tables', {}).get(table)
        if column:
            target_metrics = target_metrics.get('columns', {}).get(column)

        if not target_metrics:
            return context.result.fail_with_metric_not_found_error(context.table, context.column)

        context.result.expected = AssertMetric.to_interval_notation(context.asserts)
        has_fail = False

        if target_metrics.get('min') is not None:
            if not AssertMetric.assert_metric_boundary(target_metrics.get('min'), context.asserts):
                has_fail = True
        else:
            return context.result.fail()

        if target_metrics.get('max') is not None:
            if not AssertMetric.assert_metric_boundary(target_metrics.get('max'), context.asserts):
                has_fail = True
        else:
            return context.result.fail()

        context.result.actual = AssertMetric.to_interval_notation({
            'gte': target_metrics.get('min'),
            'lte': target_metrics.get('max')
        })

        if has_fail:
            return context.result.fail()
        return context.result.success()

    def validate(self, context: AssertionContext) -> ValidationResult:
        results = ValidationResult(context)

        names = ['gte', 'lte', 'gt', 'lt']
        results = results.allow_only(*names) \
            .require_metric_consistency(*names)

        if context.asserts is None:
            results.errors.append(f'At least one of {names} is needed.')

        if results.errors:
            return results

        self._assert_value_validation(context.asserts, results)

        return results

    @staticmethod
    def _assert_value_validation(value_boundary: dict, results: ValidationResult):
        if len(value_boundary.keys()) == 1:
            pass
        elif len(value_boundary.keys()) == 2:
            lower = None
            upper = None
            for op, v in value_boundary.items():
                if op.startswith('lt'):
                    upper = v
                elif op.startswith('gt'):
                    lower = v

            if upper is None or lower is None:
                results.errors.append('Please specified your metric upper and lower boundary')
                return

            if isinstance(upper, str) and isinstance(lower, str):
                upper = datetime.fromisoformat(upper)
                lower = datetime.fromisoformat(lower)
            if upper < lower:
                results.errors.append("The 'lt' or 'lte' value should be greater than or equal to "
                                      "the 'gt' or 'gte' value.")
        else:
            results.errors.append('The number of operator should be 1 or 2.')


def assert_column_not_null(context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
    column_metrics = metrics.get('tables', {}).get(table, {}).get('columns', {}).get(column)
    if not column_metrics:
        return context.result.fail_with_metric_not_found_error(context.table, context.column)

    if context.asserts:
        return context.result.fail_with_no_assert_is_required()

    samples = column_metrics.get('samples')
    non_nulls = column_metrics.get('non_nulls')

    success = (samples == non_nulls)
    context.result.actual = None

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

    valids = column_metrics.get('valids')
    distinct = column_metrics.get('distinct')

    success = (valids == distinct)
    context.result.actual = None

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
