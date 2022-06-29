from piperider_cli.assertion_engine.assertion import AssertionContext, AssertionResult, ValidationResult
from piperider_cli.assertion_engine.types import BaseAssertionType, register_assertion_function


class AssertNothingTableExample(BaseAssertionType):
    def name(self):
        return 'assert_nothing_table_example'

    def execute(self, context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
        table_metrics = metrics.get('tables', {}).get(table)
        if table_metrics is None:
            # cannot find the table in the metrics
            return context.result.fail()

        # 1. Get the metric for the current table
        # We support two metrics for table level metrics: ['row_count', 'col_count']
        row_count = table_metrics.get('row_count')
        # col_count = table_metrics.get('col_count')

        # 2. Get expectation from assert input
        expected = context.asserts.get('something', [])

        # 3. Implement your logic to check requirement between expectation and actual value in the metrics

        # 4. send result

        # 4.1 mark it as failed result
        # return context.result.fail('what I saw in the metric')

        # 4.2 mark it as success result
        # return context.result.success('what I saw in the metric')

        return context.result.success('what I saw in the metric')

    def validate(self, context: AssertionContext) -> ValidationResult:
        result = ValidationResult(context)
        # result.errors.append(('ERROR', 'explain to users why this broken'))
        return result


class AssertNothingColumnExample(BaseAssertionType):
    def name(self):
        return "assert_nothing_column_example"

    def execute(self, context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
        column_metrics = metrics.get('tables', {}).get(table, {}).get('columns', {}).get(column)
        if column_metrics is None:
            # cannot find the column in the metrics
            return context.result.fail()

        # 1. Get the metric for the column metrics
        total = column_metrics.get('total')
        non_nulls = column_metrics.get('non_nulls')

        # 2. Get expectation from assert input
        expected = context.asserts.get('something', [])

        # 3. Implement your logic to check requirement between expectation and actual value in the metrics

        # 4. send result

        # 4.1 mark it as failed result
        # return context.result.fail('what I saw in the metric')

        # 4.2 mark it as success result
        # return context.result.success('what I saw in the metric')

        return context.result.success('what I saw in the metric')

    def validate(self, context: AssertionContext) -> ValidationResult:
        result = ValidationResult(context)
        # result.errors.append(('ERROR', 'explain to users why this broken'))
        return result


# register new assertions
register_assertion_function(AssertNothingTableExample)
register_assertion_function(AssertNothingColumnExample)
