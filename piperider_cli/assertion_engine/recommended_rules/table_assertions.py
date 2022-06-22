from typing import Dict
from . import RecommendedAssertion


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


def recommended_column_min_assertion(table, column, profiling_result) -> (str, Dict):
    if column is None:
        return None

    column_type = profiling_result['tables'][table]['columns'][column]['type']
    if column_type == 'numeric':
        column_min = profiling_result['tables'][table]['columns'][column]['min']
        test_function_name = 'assert_column_min_in_range'
        assertion_values = {
            'min': [int(column_min * 0.9), int(column_min * 1.1)]
        }
        assertion = RecommendedAssertion(test_function_name, assertion_values)
        return assertion
    else:
        return None
