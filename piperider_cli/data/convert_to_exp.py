from collections import OrderedDict
from typing import Dict

import pandas as pd
from ruamel.yaml import YAML

from piperider_cli import create_logger
from piperider_cli.config import get_sources
from piperider_cli.stage import StageFile

GE_CUSTOM_ASSERTION_KEY = 'expect_column_values_pass_with_assertion'

yaml = YAML(typ="safe")
yaml.default_flow_style = False

__scheduled_custom_tests__ = OrderedDict()

logger = create_logger('expectation-converter')

expectation_type_map = {
    'shouldExist': 'expect_column_to_exist',
    'shouldBeUnique': 'expect_column_values_to_be_unique',
    'shouldBeNull': 'expect_column_values_to_be_null',
    'shouldNotBeNull': 'expect_column_values_to_not_be_null',
    'shouldBeInSet': 'expect_column_values_to_be_in_set',
    'shouldNotBeInSet': 'expect_column_values_to_not_be_in_set',
    'shouldDistinctBeInSet': 'expect_column_distinct_values_to_be_in_set',
    'shouldDistinctContainSet': 'expect_column_distinct_values_to_contain_set',
    'shouldDistinctEqualSet': 'expect_column_distinct_values_to_equal_set',
    'shouldBeType': 'expect_column_values_to_be_of_type',
    'shouldBeInTypes': 'expect_column_values_to_be_in_type_list',
    'shouldBeInRange': 'expect_column_values_to_be_between',
    'shouldMaxBeInRange': 'expect_column_max_to_be_between',
    'shouldMinBeInRange': 'expect_column_min_to_be_between',
    'shouldMeanBeInRange': 'expect_column_mean_to_be_between',
    'shouldMedianBeInRange': 'expect_column_median_to_be_between',
    'shouldSumBeInRange': 'expect_column_sum_to_be_between',
    'shouldStdevBeInRange': 'expect_column_stdev_to_be_between',
    'shouldLengthBeInRange': 'expect_column_value_lengths_to_be_between',
    'shouldBeJSONParseable': 'expect_column_values_to_be_json_parseable',
    'shouldBeDateParseable': 'expect_column_values_to_be_dateutil_parseable',
    'shouldMatchRegex': 'expect_column_values_to_match_regex',
    'shouldNotMatchRegex': 'expect_column_values_to_not_match_regex',
    'shouldMatchRegexList': 'expect_column_values_to_match_regex_list',
    'shouldNotMatchRegexList': 'expect_column_values_to_not_match_regex_list',
    'tableRowCountEqual': 'expect_table_row_count_to_equal',
    'tableRowCountInRange': 'expect_table_row_count_to_be_between',
    'tableColumnCountEqual': 'expect_table_column_count_to_equal',
    'tableColumnCountInRange': 'expect_table_column_count_to_be_between',
    'tableColumnMatchList': 'expect_table_columns_to_match_ordered_list',
    'tableColumnMatchSet': 'expect_table_columns_to_match_set',
}


def get_expectation_type(name):
    if name in expectation_type_map:
        return expectation_type_map[name]

    from piperider_cli.great_expectations.ge_custom_assertion import has_assertion_id as has_ge_assertion_id
    if has_ge_assertion_id(name):
        return GE_CUSTOM_ASSERTION_KEY

    return None


def generate_expectation(test: dict):
    expectation_name = get_expectation_type(test['function'])

    exp = {
        'expectation_type': expectation_name,
        'kwargs': {},
        'meta': {},
    }
    if test['function'].startswith('should'):
        exp['kwargs']['column'] = test['column']

    if test['function'] == 'tableColumnMatchList':
        exp['kwargs']['column_list'] = test['params']
    elif test['function'] == 'tableColumnMatchSet':
        exp['kwargs']['column_set'] = test['params']
    elif test['function'] == 'shouldBeType':
        exp['kwargs']['type_'] = test['params']
    elif test['function'] == 'shouldBeInTypes':
        exp['kwargs']['type_list'] = test['params']
    elif test['function'].endswith('Set'):
        exp['kwargs']['value_set'] = test['params']
    elif test['function'].endswith('InRange'):
        exp['kwargs']['min_value'] = test['params'][0]
        exp['kwargs']['max_value'] = test['params'][1]
    elif test['function'].endswith('Regex'):
        exp['kwargs']['regex'] = test['params']
    elif test['function'].endswith('RegexList'):
        exp['kwargs']['regex_list'] = test['params']
    elif test['function'].endswith('Equal'):
        exp['kwargs']['value'] = test['params']

    if expectation_name == GE_CUSTOM_ASSERTION_KEY:
        exp['kwargs']['assertion_id'] = test['function']
        exp['kwargs']['params'] = test['params']
    return exp


class CustomAssertionTestAction(object):

    def __init__(self, stage_file: StageFile, stage_name, test_definition: dict):
        self.stage_file = stage_file
        self.stage_name = stage_name
        self.test_definition = test_definition

        from piperider_cli.custom_assertion import find_assert
        self.function_name = test_definition['function']
        self.assertion = find_assert(self.function_name)

    def key(self):
        return f'{self.stage_file.filename}::{self.stage_name}::{self.function_name}'

    def execute_and_remove_from_queue(self, context):
        try:
            column = self.test_definition.get('column')
            df = self.dataframe_from_source(context, column)
            params = self.test_definition.get('params')
            if not params:
                params = []
            return self.assertion(df, cfg=self.test_definition, params=params)
        except:
            raise
        finally:
            # remove from schedule
            del __scheduled_custom_tests__[self.key()]

    def dataframe_from_source(self, context, column: str):
        stage = self.stage_file.get(self.stage_name)
        source = get_sources(stage.source_file)

        cfg = source['data']
        if 'file' == cfg['type']:
            filepath = cfg['file']
            if column:
                return pd.read_csv(filepath)[[column]]
            else:
                return pd.read_csv(filepath)

        if 'snowflake' == cfg['type']:
            from great_expectations.cli.toolkit import select_datasource
            from great_expectations.datasource.new_datasource import BaseDatasource
            datasource: BaseDatasource = select_datasource(context, 'my_datasource')
            engine = datasource.execution_engine.engine
            with engine.connect() as connection:
                if not column:
                    column = "*"
                return pd.read_sql(f"SELECT {column} FROM {cfg['table']}", connection)
        return None


def bind_test_with_custom_assertion(stage_file: StageFile, stage_name, test_definition):
    action = CustomAssertionTestAction(stage_file, stage_name, test_definition)
    __scheduled_custom_tests__[action.key()] = action
    logger.info(f'binding {stage_name}@{action.function_name} to {action.assertion}')


def get_scheduled_tests() -> Dict[str, CustomAssertionTestAction]:
    return __scheduled_custom_tests__


def convert_to_ge_expectations(stage_file: StageFile, stage_name):
    if not isinstance(stage_file, StageFile):
        raise ValueError('Type error: stage_file should be a StageFile instance')

    stage = stage_file.get(stage_name)
    expectations = []
    for test in stage.tests():

        function_name = test['function']

        # piperider's custom assertion is not a kind of ge-expectation
        from piperider_cli.custom_assertion import has_assertion_id
        if has_assertion_id(function_name):
            bind_test_with_custom_assertion(stage_file, stage_name, test)
            continue

        if 'column' in test and type(test['column']) == list:
            for col in test['column']:

                expectation = generate_expectation({'function': function_name, 'column': col, })
                if expectation:
                    expectations.append(expectation)
                else:
                    logger.debug(f'cannot create expectation from {test}')
        else:
            expectation = generate_expectation(test)
            if expectation:
                expectations.append(expectation)
            else:
                logger.debug(f'cannot create expectation from {test}')

    output = {
        'data_asset_type': None,
        'expectation_suite_name': 'mydata',
        'expectations': expectations,
        'ge_cloud_id': None,
        'meta': {},
    }

    return output
