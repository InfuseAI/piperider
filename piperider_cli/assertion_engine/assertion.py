import json
import os
import sys
from datetime import datetime
from importlib import import_module
from typing import List, Dict

from ruamel import yaml
from ruamel.yaml.comments import CommentedMap, CommentedSeq

from piperider_cli.assertion_engine.recommender import AssertionRecommender
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
                    content.update(payload)
    # TODO: Handle multiple assertion defined

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
    def __init__(self, table_name: str, column_name: str, assertion_name: str, payload: dict):
        self.name: str = assertion_name
        self.table: str = table_name
        self.column: str = column_name
        self.parameters: dict = {}
        self.asserts: dict = {}
        self.tags: list = []

        # result
        self.result: AssertionResult = AssertionResult()

        self._load(payload)

    def _load(self, payload):
        def _find_name(r: list, name: str):
            for i in r:
                if i.get('name') == name:
                    return i

        table = payload.get(self.table)
        if self.column:
            column = table.get('columns', {}).get(self.column, {})
            assertion = _find_name(column.get('tests', []), self.name)
        else:
            assertion = _find_name(table.get('tests', []), self.name)

        self.parameters = assertion.get('parameters', {})
        self.asserts = assertion.get('assert', {})
        self.tags = assertion.get('tags', [])
        self.result._expected = assertion.get('assert', dict(success=True))
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

    def load_assertions(self):
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

        # Load assertion
        for t in self.assertions_content:
            # only append specified table's assertions
            if t in list(self.profiler.metadata.tables):
                for ta in self.assertions_content[t].get('tests', []):
                    self.assertions.append(AssertionContext(t, None, ta.get('name'), self.assertions_content))
                for c in self.assertions_content[t].get('columns', {}):
                    for ca in self.assertions_content[t]['columns'][c].get('tests', []):
                        self.assertions.append(AssertionContext(t, c, ca.get('name'), self.assertions_content))

    def generate_recommended_assertions(self, profiling_result, is_assertions_exist, selected_tables=None):
        # Load existing assertions
        if not self.assertions_content:
            self.load_assertions()

        tables = self.profiler.metadata.tables
        if isinstance(selected_tables, str):
            tables = {selected_tables: tables[selected_tables]}
        elif isinstance(selected_tables, list):
            tables = {t: tables[t] for t in selected_tables}

        recommended_assertions = self._generate_assertion_template(tables)

        # TODO: Generate recommended assertions
        recommender = AssertionRecommender(recommended_assertions, profiling_result)
        recommender.recommend()

        # Update existing recommended assertions
        if is_assertions_exist:
            self._update_existing_recommended_assertions(recommended_assertions)

        # Dump recommended assertions
        return self._dump_assertions_files(recommended_assertions)

    def _generate_assertion_template(self, tables):
        recommended_assertions: Dict[CommentedMap] = {}
        for name, table in tables.items():
            # Generate template of assertions
            table_assertions = CommentedSeq()
            columns = CommentedMap()

            # Generate assertions for columns
            for column in table.columns:
                column_name = str(column.name)
                column_assertions = CommentedSeq()
                columns[column_name] = CommentedMap({
                    'tests': column_assertions,
                })
                columns[column_name].yaml_set_comment_before_after_key('tests', indent=6,
                                                                       before='Test Cases for Column')
                columns.yaml_add_eol_comment('Column Name', column_name)

            # Generate assertions for table
            recommended_assertion = CommentedMap({
                name: CommentedMap({
                    'tests': table_assertions,
                    'columns': columns,
                })})
            recommended_assertion.yaml_set_start_comment(f'# Auto-generated by Piperider based on table "{table}"')
            recommended_assertion.yaml_add_eol_comment('Table Name', name)
            recommended_assertion[name].yaml_set_comment_before_after_key('tests', indent=2,
                                                                          before='Test Cases for Table')
            recommended_assertions[name] = recommended_assertion
        return recommended_assertions

    def _update_existing_recommended_assertions(self, recommended_assertions):
        def merge_assertions(existed: List, new_generating: List):
            for existed_assertion in existed:
                for new_assertion in new_generating:
                    if new_assertion['name'] == existed_assertion['name']:
                        if dict(new_assertion['assert']) != existed_assertion['assert']:
                            # Update new generating assertion with new assert in comment
                            recommended_assertion_value = json.dumps(new_assertion["assert"]).replace('\"', '')
                            new_assertion.yaml_add_eol_comment(
                                f'TODO: {recommended_assertion_value} (new recommended assert)',
                                'assert')
                            new_assertion['assert'] = existed_assertion['assert']
            pass

        for name, recommended_assertion in recommended_assertions.items():
            existing_assertion_path = os.path.join(self.assertion_search_path, self._recommend_assertion_filename(name))
            if os.path.exists(existing_assertion_path):
                existing_assertion = safe_load_yaml(existing_assertion_path)
                if existing_assertion:
                    # Table assertions
                    merge_assertions(existing_assertion[name]['tests'], recommended_assertion[name]['tests'])

                    # Column assertions
                    for ca in recommended_assertion[name]['columns']:
                        merge_assertions(existing_assertion[name]['columns'][ca]['tests'],
                                         recommended_assertion[name]['columns'][ca]['tests'])
            elif self.assertions_content.get(name):
                print(
                    f'Skip recommended assertions for table "{name}" because it already exists user-defined assertions.')
                recommended_assertions[name]['skip'] = True
        pass

    def _recommend_assertion_filename(self, name):
        return f'recommended_{name}.yml'

    def _dump_assertions_files(self, assertions):
        paths = []
        for name, assertion in assertions.items():
            file_path = os.path.join(self.assertion_search_path, f'recommended_{name}.yml')
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
