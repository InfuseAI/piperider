import json
import os
import sys
from datetime import datetime
from importlib import import_module
from typing import List, Dict

from deepmerge import always_merger
from ruamel import yaml
from ruamel.yaml.comments import CommentedMap

from piperider_cli.assertion_engine.recommender import AssertionRecommender
from piperider_cli.assertion_engine.recommender import RECOMMENDED_ASSERTION_TAG
from piperider_cli.error import \
    AssertionError, \
    IllegalStateAssertionError


def safe_load_yaml(file_path):
    payload = None
    with open(file_path, 'r') as f:
        try:
            payload = yaml.safe_load(f)
        except yaml.YAMLError as e:
            print(e)
            return None
    return payload


def load_yaml_configs(path):
    passed: List[str] = []
    failed: List[str] = []
    content: Dict = {}
    for root, dirs, files in os.walk(path):
        for file in files:
            if file.endswith('.yml') or file.endswith('.yaml'):
                file_path = os.path.join(root, file)
                payload = safe_load_yaml(file_path)
                if not payload:
                    failed.append(file_path)
                else:
                    passed.append(file_path)
                    always_merger.merge(content, payload)

    return passed, failed, content


class AssertionResult:

    def __init__(self):
        self._success: bool = False
        self._exception: Exception = None
        self.actual: dict = None
        self._expected: dict = None

    def status(self):
        return self._success

    def expected(self):
        def _castDatetimeToString(obj):
            if isinstance(obj, dict):
                obj = {k: _castDatetimeToString(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                obj = [_castDatetimeToString(i) for i in obj]
            elif isinstance(obj, datetime):
                return str(obj)
            return obj

        return _castDatetimeToString(dict(self._expected))

    @property
    def exception(self):
        return self._exception

    def validate(self):
        if self._exception:
            return self

        if not self.actual or not self._expected:
            return self.fail_with_assertion_implementation_error()

        return self

    def success(self, actual=None):
        if actual:
            self.actual = actual

        self._success = True
        return self

    def fail(self, actual=None):
        if actual:
            self.actual = actual

        self._success = False
        return self

    def fail_with_exception(self, exception):
        self._success = False
        self._exception = exception
        return self

    def fail_with_assertion_error(self, message):
        self._success = False
        self._exception = AssertionError(message)
        return self

    def fail_with_metric_not_found_error(self, table, column):
        self._success = False
        if not column:
            self._exception = AssertionError(
                f"Table '{table}' metric not found.")
        else:
            self._exception = AssertionError(
                f"Column '{column}' metric not found.")
        return self

    def fail_with_no_assert_is_required(self):
        self._success = False
        self._exception = AssertionError("No assert is required.")
        return self

    def fail_with_assertion_implementation_error(self):
        self._success = False
        self._exception = IllegalStateAssertionError(
            "Assertion Function should fill 'actual' and 'expected' fields.")
        return self

    def get_internal_error(self):
        if isinstance(self._exception, AssertionError):
            return self._exception

    def __repr__(self):
        return str(dict(success=self._success,
                        exception=str(self._exception),
                        actual=self.actual,
                        expected=self.expected()))


class AssertionContext:
    def __init__(self, table_name: str, column_name: str, payload: dict):
        self.name: str = payload.get('name')
        self.table: str = table_name
        self.column: str = column_name
        self.parameters: dict = {}
        self.asserts: dict = {}
        self.tags: list = []

        # result
        self.result: AssertionResult = AssertionResult()

        self._load(payload)

    def _load(self, payload):
        self.parameters = payload.get('parameters', {})
        self.asserts = payload.get('assert', {})
        self.tags = payload.get('tags', [])
        self.result._expected = payload.get('assert', dict(success=True))
        pass

    def __repr__(self):
        return str(self.__dict__)

    def to_result_entry(self):
        return dict(
            name=self.name,
            status='passed' if self.result._success is True else 'failed',
            parameters=self.parameters,
            expected=self.result.expected(),
            actual=self.result.actual,
            tags=self.tags,
        )


class AssertionEngine:
    """
    This class is used to evaluate the assertion.
    """
    PIPERIDER_WORKSPACE_NAME = '.piperider'
    PIPERIDER_ASSERTION_SEARCH_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'assertions')
    PIPERIDER_ASSERTION_PLUGIN_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'plugins')
    PIPERIDER_ASSERTION_SUPPORT_METRICS = ['distribution', 'range', 'missing_value']

    def __init__(self, profiler, assertion_search_path=PIPERIDER_ASSERTION_SEARCH_PATH):
        self.profiler = profiler
        self.assertion_search_path = assertion_search_path
        self.assertions_content: Dict = {}
        self.assertions: List[AssertionContext] = []
        self.recommender: AssertionRecommender = AssertionRecommender()

        self.default_plugins_dir = AssertionEngine.PIPERIDER_ASSERTION_PLUGIN_PATH
        if not os.path.isdir(self.default_plugins_dir):
            self.default_plugins_dir = None

    @staticmethod
    def check_assertions_syntax(assertion_search_path=PIPERIDER_ASSERTION_SEARCH_PATH):
        """
        This method is used to check the syntax of the assertion.
        :param assertion_search_path:
        :return:
        """
        return load_yaml_configs(assertion_search_path)

    def load_assertions(self, profiling_result=None):
        """
        This method is used to load assertions from the specific path.
        :param assertion_search_path:
        :return:
        """
        """
        Example:
        {'nodes': {'tests': [], 'columns': {'uid': {'tests': []}, 'type': {'tests': []}, 'name': {'tests': []}, 'created_at': {'tests': []}, 'updated_at': {'tests': []}, 'metadata': {'tests': []}}}, 'edges': {'tests': [], 'columns': {'n1_uid': {'tests': []}, 'n2_uid': {'tests': []}, 'created_at': {'tests': []}, 'updated_at': {'tests': []}, 'type': {'tests': []}, 'metadata': {'tests': []}}}}
        """
        self.assertions = []
        passed_assertion_files, failed_assertion_files, self.assertions_content = load_yaml_configs(
            self.assertion_search_path)

        # Load assertio
        if profiling_result:
            selected_tables = profiling_result.get('tables').keys()
        else:
            selected_tables = list(self.profiler.metadata.tables)
        for t in self.assertions_content:
            # only append specified table's assertions
            if t in selected_tables:
                for ta in self.assertions_content[t].get('tests', []):
                    self.assertions.append(AssertionContext(t, None, ta))
                for c in self.assertions_content[t].get('columns', {}):
                    for ca in self.assertions_content[t]['columns'][c].get('tests', []):
                        self.assertions.append(AssertionContext(t, c, ca))

    def generate_template_assertions(self, profiling_result):
        self.recommender.prepare_assertion_template(profiling_result)
        template_assertions = self.recommender.assertions
        return self._dump_assertions_files(template_assertions)

    def generate_recommended_assertions(self, profiling_result, assertion_exist=False):
        # Load existing assertions
        if not self.assertions_content:
            self.load_assertions(profiling_result=profiling_result)

        # Generate recommended assertions based on the profiling result
        self.recommender.prepare_assertion_template(profiling_result)
        self.recommender.run(profiling_result)

        recommended_assertions = self.recommender.assertions

        # Update existing recommended assertions
        if assertion_exist:
            self._update_existing_recommended_assertions(recommended_assertions)
            self._backup_assertion_file(recommended_assertions, prefix='recommended')

        # Dump recommended assertions
        return self._dump_assertions_files(recommended_assertions, prefix='recommended')

    def _update_existing_recommended_assertions(self, recommended_assertions):

        def merge_assertions(target: str, existed_items: List, new_generating_items: List):
            if new_generating_items.get(target) is None:
                new_generating_items[target] = CommentedMap(existed_items[target])
                is_generated_by_us = False
                for assertion in new_generating_items[target].get('tests', []):
                    if RECOMMENDED_ASSERTION_TAG in assertion.get('tags', []):
                        is_generated_by_us = True
                        break
                if is_generated_by_us:
                    new_generating_items.yaml_add_eol_comment(
                        'TODO: Suggest to remove following assertions (no recommended found)', target)
            else:
                # Merge with existed
                for existed_assertion in existed_items[target]['tests']:
                    is_new_assertion_found = False
                    for new_assertion in new_generating_items[target]['tests']:
                        if new_assertion['name'] == existed_assertion['name']:
                            is_new_assertion_found = True
                            if existed_assertion.get('assert') is None:
                                continue
                            if dict(new_assertion['assert']) != existed_assertion['assert']:
                                # Update new generating assertion with new assert in comment
                                recommended_assertion_value = json.dumps(new_assertion['assert']).replace('\"', '')
                                new_assertion.yaml_add_eol_comment(
                                    f'TODO: {recommended_assertion_value} (new recommended assert)',
                                    'assert')
                                new_assertion['assert'] = existed_assertion['assert']
                    if is_new_assertion_found is False:
                        # Add new generating assertion
                        new_generating_items[target]['tests'].append(existed_assertion)
            return new_generating_items

        for name, recommended_assertion in recommended_assertions.items():
            existing_assertion_path = os.path.join(self.assertion_search_path, self._recommend_assertion_filename(name))
            if os.path.exists(existing_assertion_path):
                existing_assertion = safe_load_yaml(existing_assertion_path)
                if existing_assertion:
                    # Table assertions
                    recommended_assertion = merge_assertions(name, existing_assertion, recommended_assertion)

                    # Column assertions
                    for ca in existing_assertion[name]['columns']:
                        recommended_assertion[name]['columns'] = merge_assertions(ca,
                                                                                  existing_assertion[name]['columns'],
                                                                                  recommended_assertion[name][
                                                                                      'columns'])
        pass

    def _recommend_assertion_filename(self, name):
        return f'recommended_{name}.yml'

    def _backup_assertion_file(self, assertions, prefix=''):
        for name in assertions.keys():
            filename = f'{prefix}_{name}.yml' if prefix else f'{name}.yml'
            file_path = os.path.join(self.assertion_search_path, filename)
            if os.path.exists(file_path):
                backup_file_name = f'{filename}.bak'
                backup_path = os.path.join(self.assertion_search_path, backup_file_name)
                os.rename(file_path, backup_path)

    def _dump_assertions_files(self, assertions, prefix=''):
        paths = []
        os.makedirs(self.assertion_search_path, exist_ok=True)
        for name, assertion in assertions.items():
            filename = f'{prefix}_{name}.yml' if prefix else f'{name}.yml'
            file_path = os.path.join(self.assertion_search_path, filename)
            if assertion.get('skip'):  # skip if it already exists user-defined assertions
                continue
            with open(file_path, 'w') as f:
                yaml.YAML().dump(assertion, f)
                paths.append(file_path)
        return paths

    def evaluate(self, assertion: AssertionContext, metrics_result):
        """
        This method is used to evaluate the assertion.
        :param assertion:
        :return:
        """

        """
        example:

        - name: get_outliers # test method used under distribution metric
            parameters:
              method: method1 # get_outliers's input parameter
              window: 3 # get_outliers's input parameter
              threshold: [15,100] # get_outliers's input parameter, range from 15 to 100
            assert:
              outliers: 5 # in get_outliers's verification logic, check outliers parameter and return true if it's less than 5
        """

        func = None

        self.configure_plugins_path()
        try:
            # assertion name with "." suppose to be a user-defined test function
            is_user_defined_test_function = ("." in assertion.name)
            if not is_user_defined_test_function:
                # locate the builtin assertion from the piperider_cli.assertion_engine
                # fetch the assertion function
                assertion_module = import_module('piperider_cli.assertion_engine')
                func = getattr(assertion_module, assertion.name)
            else:
                assertion_def = assertion.name.split(".")
                module_name = ".".join(assertion_def[0:-1])
                function_name = assertion_def[-1]
                assertion_module = import_module(module_name)
                func = getattr(assertion_module, function_name)
        except ModuleNotFoundError as e:
            assertion.result.fail_with_exception(AssertionError(f'Cannot find the assertion: {assertion.name}', e))
            return assertion
        except ImportError as e:
            assertion.result.fail_with_exception(AssertionError(f'Cannot find the assertion: {assertion.name}', e))
            return assertion
        except Exception as e:
            assertion.result.fail_with_exception(AssertionError(f'Cannot find the assertion: {assertion.name}', e))
            return assertion

        try:
            result = func(assertion, assertion.table, assertion.column, metrics_result)
            result.validate()
        except Exception as e:
            assertion.result.fail_with_exception(e)

        return assertion

    def evaluate_all(self, metrics_result):
        results = []
        exceptions = []

        for assertion in self.assertions:
            try:
                assertion_result: AssertionContext = self.evaluate(assertion, metrics_result)
                results.append(assertion_result)

                if assertion_result.result.get_internal_error():
                    raise assertion_result.result.get_internal_error()
            except AssertionError as e:
                exceptions.append((assertion, e))
            except IllegalStateAssertionError as e:
                exceptions.append((assertion, e))
            except BaseException as e:
                exceptions.append((assertion, e))
        return results, exceptions

    def configure_plugins_path(self):
        plugin_context = os.environ.get('PIPERIDER_PLUGINS')
        if plugin_context:
            sys.path.append(plugin_context)
        if self.default_plugins_dir:
            sys.path.append(self.default_plugins_dir)
