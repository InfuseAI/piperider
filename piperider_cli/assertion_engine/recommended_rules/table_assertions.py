import math
from typing import Optional

from .recommender_assertion import RecommendedAssertion


def recommended_table_row_count_assertion(table, column, profiling_result) -> RecommendedAssertion:
    if column is not None:
        return None

    row_count = profiling_result['tables'][table].get('row_count')
    if row_count is None:
        return None

    test_metric_name = 'row_count'
    assertion_values = {
        'gte': int(row_count * 0.9),
    }
    assertion = RecommendedAssertion(None, test_metric_name, assertion_values)
    return assertion


def recommended_column_schema_type_assertion(table, column, profiling_result) -> RecommendedAssertion:
    if column is None:
        return None

    schema_type = profiling_result['tables'][table]['columns'][column].get('schema_type')
    if schema_type is None:
        return None

    test_function_name = 'assert_column_schema_type'
    assertion_values = {
        'schema_type': schema_type
    }
    assertion = RecommendedAssertion(test_function_name, None, assertion_values)
    return assertion


def recommended_column_min_assertion(table, column, profiling_result) -> RecommendedAssertion:
    if column is None:
        return None

    column_metric = profiling_result['tables'][table]['columns'][column]
    column_type = column_metric['type']
    if column_type == 'numeric':
        valids = column_metric.get('valids')
        if not valids:
            return None

        column_min = column_metric['min']
        histogram_counts = column_metric['histogram']['counts'] if column_metric['histogram'] else []

        count = 0
        for i, v in enumerate(reversed(histogram_counts)):
            count = count + v
            if i == len(histogram_counts) // 2:
                break

        if count / valids > 0.95:
            test_function_name = 'assert_column_min_in_range'
            assertion_values = {
                'min': sorted([round(column_min * 0.9, 4), round(column_min * 1.1, 4)])
            }
            assertion = RecommendedAssertion(test_function_name, None, assertion_values)
            return assertion
    else:
        return None


def recommended_column_max_assertion(table, column, profiling_result) -> RecommendedAssertion:
    if column is None:
        return None

    column_metric = profiling_result['tables'][table]['columns'][column]
    column_type = column_metric['type']
    if column_type == 'numeric':
        valids = column_metric.get('valids')
        if not valids:
            return None

        column_max = column_metric['max']
        histogram_counts = column_metric['histogram']['counts'] if column_metric['histogram'] else []

        count = 0
        for i, v in enumerate(histogram_counts):
            count = count + v
            if i == len(histogram_counts) // 2:
                break

        if count / valids > 0.95:
            test_function_name = 'assert_column_max_in_range'
            assertion_values = {
                'max': sorted([round(column_max * 0.9, 4), round(column_max * 1.1, 4)])
            }
            assertion = RecommendedAssertion(test_function_name, None, assertion_values)
            return assertion
    else:
        return None


def recommended_column_value_assertion(table, column, profiling_result) -> Optional[RecommendedAssertion]:
    if column is None:
        return None

    column_metric = profiling_result['tables'][table]['columns'][column]
    column_type = column_metric['type']
    assert_name = 'assert_column_value'
    if column_type == 'numeric':
        valids = column_metric.get('valids')
        if not valids:
            return None

        histogram_counts = column_metric['histogram']['counts'] if column_metric['histogram'] else []
        if not histogram_counts:
            return None

        column_min = column_metric.get('min')
        column_max = column_metric.get('max')

        if column_min is None or column_max is None:
            return None

        count_first_half = sum(histogram_counts[0:len(histogram_counts) // 2])
        count_second_half = sum(histogram_counts[math.ceil(len(histogram_counts) / 2):])

        if count_first_half / valids > 0.95:
            boundary = column_max * 1.1 if column_max > 0 else column_max * 0.9
            assertion_values = {
                'lte': round(boundary, 4)
            }
            return RecommendedAssertion(assert_name, None, assertion_values)
        elif count_second_half / valids > 0.95:
            boundary = column_min * 0.9 if column_min > 0 else column_min * 1.1
            assertion_values = {
                'gte': round(boundary, 4)
            }
            return RecommendedAssertion(assert_name, None, assertion_values)
    elif column_type == 'string':
        distinct = column_metric.get('distinct')
        if distinct is None:
            return None

        topk = []
        if column_metric.get('topk'):
            topk = column_metric.get('topk').get('values', [])

        if distinct and distinct <= 50 and topk:
            assertion_values = {
                'in': topk
            }
            return RecommendedAssertion(assert_name, None, assertion_values)
    else:
        return None


def recommended_column_unique_assertion(table, column, profiling_result) -> RecommendedAssertion:
    if column is None:
        return None

    column_metric = profiling_result['tables'][table]['columns'][column]
    column_type = column_metric.get('type')
    if column_type is None:
        return None

    if column_type == 'string':
        valids = column_metric.get('valids')
        distinct = column_metric.get('distinct')

        if valids is None or distinct is None:
            return None

        if valids > 0 and distinct == valids:
            test_function_name = 'assert_column_unique'
            assertion = RecommendedAssertion(test_function_name, None, None)
            return assertion
    else:
        return None


def recommended_column_not_null_assertion(table, column, profiling_result) -> RecommendedAssertion:
    if column is None:
        return None

    column_metric = profiling_result['tables'][table]['columns'][column]
    non_nulls = column_metric.get('non_nulls')
    if non_nulls is None:
        return

    total = column_metric['total']

    if total > 0 and non_nulls == total:
        test_function_name = 'assert_column_not_null'
        assertion = RecommendedAssertion(test_function_name, None, None)
        return assertion
    else:
        return None


RecommendedRules = [
    recommended_table_row_count_assertion,
    recommended_column_schema_type_assertion,
    recommended_column_unique_assertion,
    recommended_column_not_null_assertion,
    recommended_column_value_assertion
]
