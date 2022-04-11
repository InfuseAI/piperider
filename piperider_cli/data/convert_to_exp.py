from ruamel.yaml import YAML
import json
import re

yaml = YAML(typ="safe")
yaml.default_flow_style = False

expectation_type_map = {
    'shouldExist': 'expect_column_to_exist',
    'shouldBeUnique': 'expect_column_values_to_be_unique',
    'shouldBeNull': 'expect_column_values_to_be_null',
    'shouldNotBeNull': 'expect_column_values_to_not_be_null',
    'shouldBeConst': 'expect_column_values_to_be_in_set',
    'shouldNotBeConst': 'expect_column_values_to_not_be_in_set',
    'shouldBeInRange': 'expect_column_values_to_be_between',
    'shouldMaxBeInRange': 'expect_column_max_to_be_between',
    'shouldMinBeInRange': 'expect_column_min_to_be_between',
    'shouldMeanBeInRange': 'expect_column_mean_to_be_between',
    'shouldMedianBeInRange': 'expect_column_median_to_be_between',
    'shouldSumBeInRange': 'expect_column_sum_to_be_between',
}


def get_expectation_type(name):
    if name in expectation_type_map:
        return expectation_type_map[name]
    return None


def generate_expectation(test):
    exp = {
        'expectation_type': get_expectation_type(test['function']),
        'kwargs': {
            'column': test['column'],
        },
        'meta': {},
    }
    if re.match(r'.*BeConst$', test['function']):
        exp['kwargs']['value_set'] = test['params']
    elif re.match(r'.*InRange$', test['function']):
        exp['kwargs']['min_value'] = test['params'][0]
        exp['kwargs']['max_value'] = test['params'][1]
    return exp


def convert_to_ge_expectations(stage_file):
    with open(stage_file, 'r') as fh:
        stage = yaml.load(fh)
    results = []
    for e in stage.keys():
        expectations = []
        for test in stage[e]['tests']:
            if type(test['column']) == list:
                for col in test['column']:
                    expectations.append(generate_expectation({
                        'function': test['function'],
                        'column': col,
                    }))
            else:
                expectations.append(generate_expectation(test))

        output = {
            'data_asset_type': None,
            'expectation_suite_name': 'mydata',
            'expectations': expectations,
            'ge_cloud_id': None,
            'meta': {},
        }
        results.append(output)
    return results
    # json.dumps(output, indent=2, sort_keys=True))
