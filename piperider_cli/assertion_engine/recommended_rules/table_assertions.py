from piperider_cli.assertion_engine.recommended_rules.recommender_assertion import RecommendedAssertion


def recommended_table_row_count_assertion(table, column, profiling_result) -> RecommendedAssertion:
    if column is not None:
        return None

    row_count = profiling_result['tables'][table]['row_count']
    test_function_name = 'assert_row_count'
    assertion_values = {
        'min': int(row_count * 0.9),
    }
    assertion = RecommendedAssertion(test_function_name, assertion_values)
    return assertion


def recommended_column_schema_type_assertion(table, column, profiling_result) -> RecommendedAssertion:
    if column is None:
        return None

    schema_type = profiling_result['tables'][table]['columns'][column]['schema_type']
    test_function_name = 'assert_column_schema_type'
    assertion_values = {
        'schema_type': schema_type
    }
    assertion = RecommendedAssertion(test_function_name, assertion_values)
    return assertion


def recommended_column_min_assertion(table, column, profiling_result) -> RecommendedAssertion:
    if column is None:
        return None

    column_metric = profiling_result['tables'][table]['columns'][column]
    column_type = column_metric['type']
    if column_type == 'numeric':
        total = column_metric['total']
        column_min = column_metric['min']
        distribution_counts = column_metric['distribution']['counts'] if column_metric['distribution'] else []

        count = 0
        for i, v in enumerate(reversed(distribution_counts)):
            count = count + v
            if i == len(distribution_counts) // 2:
                break

        if count / total > 0.95:
            test_function_name = 'assert_column_min_in_range'
            assertion_values = {
                'min': sorted([round(column_min * 0.9, 4), round(column_min * 1.1, 4)])
            }
            assertion = RecommendedAssertion(test_function_name, assertion_values)
            return assertion
    else:
        return None


def recommended_column_max_assertion(table, column, profiling_result) -> RecommendedAssertion:
    if column is None:
        return None

    column_metric = profiling_result['tables'][table]['columns'][column]
    column_type = column_metric['type']
    if column_type == 'numeric':
        total = column_metric['total']
        column_max = column_metric['max']
        distribution_counts = column_metric['distribution']['counts'] if column_metric['distribution'] else []

        count = 0
        for i, v in enumerate(distribution_counts):
            count = count + v
            if i == len(distribution_counts) // 2:
                break

        if count / total > 0.95:
            test_function_name = 'assert_column_max_in_range'
            assertion_values = {
                'max': sorted([round(column_max * 0.9, 4), round(column_max * 1.1, 4)])
            }
            assertion = RecommendedAssertion(test_function_name, assertion_values)
            return assertion
    else:
        return None


def recommended_column_unique_assertion(table, column, profiling_result) -> RecommendedAssertion:
    if column is None:
        return None

    column_metric = profiling_result['tables'][table]['columns'][column]
    column_type = column_metric['type']
    if column_type == 'string':
        non_nulls = column_metric['non_nulls']
        distinct = column_metric['distinct']

        if non_nulls > 0 and distinct == non_nulls:
            test_function_name = 'assert_column_unique'
            assertion = RecommendedAssertion(test_function_name, None)
            return assertion
    else:
        return None


def recommended_column_not_null_assertion(table, column, profiling_result) -> RecommendedAssertion:
    if column is None:
        return None

    column_metric = profiling_result['tables'][table]['columns'][column]
    non_nulls = column_metric['non_nulls']
    total = column_metric['total']

    if total > 0 and non_nulls == total:
        test_function_name = 'assert_column_not_null'
        assertion = RecommendedAssertion(test_function_name, None)
        return assertion
    else:
        return None
