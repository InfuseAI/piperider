from piperider_cli.assertion_engine.recommended_rules.recommender_assertion import RecommendedAssertion


def recommended_row_count_in_range_table_assertion(table, column, profiling_result) -> RecommendedAssertion:
    if column is not None:
        return None

    row_count = profiling_result['tables'][table]['row_count']
    test_function_name = 'assert_row_count_in_range'
    assertion_values = {
        'count': [int(row_count * 0.9), int(row_count * 1.1)]
    }
    assertion = RecommendedAssertion(test_function_name, assertion_values)
    return assertion


def recommended_column_type_assertion(table, column, profiling_result) -> RecommendedAssertion:
    if column is None:
        return None

    column_type = profiling_result['tables'][table]['columns'][column]['type']
    test_function_name = 'assert_column_type'
    assertion_values = {
        'type': column_type
    }
    assertion = RecommendedAssertion(test_function_name, assertion_values)
    return assertion


def recommended_column_min_assertion(table, column, profiling_result) -> RecommendedAssertion:
    if column is None:
        return None

    column_type = profiling_result['tables'][table]['columns'][column]['type']
    if column_type == 'numeric':
        column_min = profiling_result['tables'][table]['columns'][column]['min']
        test_function_name = 'assert_column_min_in_range'
        assertion_values = {
            'min': [float(column_min * 0.9), float(column_min * 1.1)]
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

        count = 0
        for i, v in enumerate(column_metric['distribution']['counts']):
            count = count + v
            if i == len(column_metric['distribution']['counts']) // 2:
                break

        if count / total > 0.95:
            test_function_name = 'assert_column_max_in_range'
            assertion_values = {
                'max': [float(column_max * 0.9), float(column_max * 1.1)]
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

        if non_nulls > 0 and distinct / non_nulls == 1:
            test_function_name = 'assert_column_unique'
            assertion = RecommendedAssertion(test_function_name, None)
            return assertion
    else:
        return None
