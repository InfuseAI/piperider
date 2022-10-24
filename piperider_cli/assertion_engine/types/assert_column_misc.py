from datetime import datetime

from sqlalchemy import select, MetaData, Table

from piperider_cli.assertion_engine import AssertionContext, AssertionResult
from piperider_cli.assertion_engine.assertion import ValidationResult
from piperider_cli.assertion_engine.types.base import BaseAssertionType
from piperider_cli.assertion_engine.types.assert_metrics import AssertMetric


class AssertColumnNotNull(BaseAssertionType):
    def name(self):
        return "assert_column_not_null"

    def execute(self, context: AssertionContext):
        return assert_column_not_null(context)

    def validate(self, context: AssertionContext) -> ValidationResult:
        return ValidationResult(context).keep_no_args()


class AssertColumnNull(BaseAssertionType):
    def name(self):
        return "assert_column_null"

    def execute(self, context: AssertionContext):
        return assert_column_null(context)

    def validate(self, context: AssertionContext) -> ValidationResult:
        return ValidationResult(context).keep_no_args()


class AssertColumnUnique(BaseAssertionType):
    def name(self):
        return "assert_column_unique"

    def execute(self, context: AssertionContext):
        return assert_column_unique(context)

    def validate(self, context: AssertionContext) -> ValidationResult:
        return ValidationResult(context).keep_no_args()


class AssertColumnExist(BaseAssertionType):
    def name(self):
        return "assert_column_exist"

    def execute(self, context: AssertionContext):
        return assert_column_exist(context)

    def validate(self, context: AssertionContext) -> ValidationResult:
        return ValidationResult(context).keep_no_args()


class AssertColumnValue(BaseAssertionType):
    def __init__(self):
        self.set_ops = ['in']
        self.range_ops = ['gte', 'lte', 'gt', 'lt']

    def name(self):
        return "assert_column_value"

    def execute(self, context: AssertionContext):
        table = context.table
        column = context.column
        metrics = context.profiler_result

        target_metrics = metrics.get('tables', {}).get(table)
        if column:
            target_metrics = target_metrics.get('columns', {}).get(column)

        if not target_metrics:
            return context.result.fail_with_metric_not_found_error(context.table, context.column)

        assert_ops = list(context.asserts.keys())
        if assert_ops[0] in self.range_ops:
            return self._assert_column_value_range(context, target_metrics)
        elif assert_ops[0] in self.set_ops:
            return self._assert_column_value_set(context, target_metrics)

        return context.result.fail()

    def validate(self, context: AssertionContext) -> ValidationResult:
        results = ValidationResult(context)

        ops = self.set_ops + self.range_ops

        results = results.allow_only(*ops)
        if context.asserts is None:
            results.errors.append(f'At least one of {ops} is needed.')

        if results.errors:
            return results

        assert_ops = list(context.asserts.keys())
        if assert_ops[0] in self.range_ops:
            results = results.require_metric_consistency(*self.range_ops)
            if results.errors:
                return results

            self._assert_value_validation(context.asserts, results)
        elif assert_ops[0] in self.set_ops:
            results = results.require_same_types(*self.set_ops)

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

    @staticmethod
    def _assert_column_value_range(context, target_metrics):
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

    @staticmethod
    def _assert_column_value_set(context, target_metrics):
        table = context.table
        column = context.column

        assert_set = list(context.asserts.values())[0]
        context.result.expected = assert_set
        assert_set = set(assert_set)
        distinct = target_metrics.get('distinct')
        topk = []
        if target_metrics.get('topk'):
            topk = target_metrics.get('topk').get('values', [])

        if len(assert_set) < distinct:
            return context.result.fail()

        # TODO: define topk default max length
        if len(topk) < 50:
            if len(assert_set) < len(topk):
                return context.result.fail()

            for k in topk:
                if k not in assert_set:
                    return context.result.fail()
        else:
            metadata = MetaData()
            Table(table, metadata, autoload_with=context.engine)
            t = metadata.tables[table]
            c = t.columns[column]
            with context.engine.connect() as conn:
                stmt = select([
                    c
                ]).select_from(
                    t
                ).where(
                    c.isnot(None)
                ).group_by(
                    c
                )
                result = conn.execute(stmt).fetchmany(size=len(assert_set) + 1)

                if len(result) > len(assert_set):
                    return context.result.fail()

                for row, in result:
                    if row not in assert_set:
                        return context.result.fail()

        return context.result.success()


def assert_column_not_null(context: AssertionContext) -> AssertionResult:
    table = context.table
    column = context.column
    metrics = context.profiler_result

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


def assert_column_null(context: AssertionContext) -> AssertionResult:
    table = context.table
    column = context.column
    metrics = context.profiler_result

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


def assert_column_unique(context: AssertionContext) -> AssertionResult:
    table = context.table
    column = context.column
    metrics = context.profiler_result

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


def assert_column_exist(context: AssertionContext) -> AssertionResult:
    table = context.table
    column = context.column
    metrics = context.profiler_result

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
