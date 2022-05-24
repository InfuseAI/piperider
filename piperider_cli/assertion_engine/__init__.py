from .assertion import AssertionEngine, Assertion, AssertionResult


def assert_row_count(assertion: Assertion, table: str, column: str, metrics_result: dict, **kwargs) -> AssertionResult:
    table_metrics = metrics_result.get('tables', {}).get(table)
    if not table_metrics:
        # cannot find the table in the metrics
        return assertion.result.fail()

    # Get the metric for the current table
    row_count = table_metrics.get('row_count')
    between_criteria = assertion.asserts.get('count', [])

    # TODO check assert args
    # TODO should make sure lower value at the first params
    if len(between_criteria) != 2:
        return assertion.result.fail()

    # TODO would we follow inclusive exclusive convention [m,n) ?
    if between_criteria[0] <= row_count <= between_criteria[1]:
        return assertion.result.success()

    return assertion.result.fail()
