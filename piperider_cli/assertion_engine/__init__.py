from .assertion import AssertionEngine, AssertionContext, AssertionResult


def assert_row_count(context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
    table_metrics = metrics.get('tables', {}).get(table)
    if not table_metrics:
        # cannot find the table in the metrics
        return context.result.fail()

    # Get the metric for the current table
    row_count = table_metrics.get('row_count')
    between_criteria = context.asserts.get('count', [])

    # TODO check assert args
    # TODO should make sure lower value at the first params
    if len(between_criteria) != 2:
        return context.result.fail()

    # TODO would we follow inclusive exclusive convention [m,n) ?
    if between_criteria[0] <= row_count <= between_criteria[1]:
        return context.result.success()

    return context.result.fail()
