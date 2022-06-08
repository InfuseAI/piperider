import os
import sys
from datetime import datetime
from importlib import import_module

from ruamel import yaml
from ruamel.yaml.comments import CommentedMap, CommentedSeq


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
    passed = []
    failed = []
    content = {}
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

    return passed, failed, content


class IllegalStateAssertionException(BaseException):
    pass


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

    def fail_with_syntax_error(self):
        self._success = False
        self._exception = SyntaxError()
        return self

    def fail_with_metric_not_found_error(self, table, column):
        self._success = False
        if not column:
            self._exception = IllegalStateAssertionException(
                f"Table '{table}' metric not found")
        else:
            self._exception = IllegalStateAssertionException(
                f"Column '{column}' metric not found")
        return self

    def fail_with_assertion_implementation_error(self):
        self._success = False
        self._exception = IllegalStateAssertionException(
            "Assertion Function should fill 'actual' and 'expected' fields.")
        return self

    def get_internal_error(self):
        if isinstance(self._exception, AssertionException):
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
        self.result._expected = assertion.get('assert', True)
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


class AssertionException(BaseException):
    pass


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
        self.assertions_content = {}
        self.assertions = []

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
        passed_assertion_files, failed_assertion_files, self.assertions_content = load_yaml_configs(
            self.assertion_search_path)

        # Load assertion
        for t in self.assertions_content:
            for ta in self.assertions_content[t].get('tests', []):
                self.assertions.append(AssertionContext(t, None, ta.get('name'), self.assertions_content))
            for c in self.assertions_content[t].get('columns', {}):
                for ca in self.assertions_content[t]['columns'][c].get('tests', []):
                    self.assertions.append(AssertionContext(t, c, ca.get('name'), self.assertions_content))
        pass

    def generate_assertion_templates(self):
        """
        This method is used to generate assertion templates.
        :param assertion_search_path:
        :return:
        """

        if not self.assertions_content:
            self.load_assertions()

        for table in list(self.profiler.metadata.tables):
            if table in self.assertions_content:
                continue
            assertion = CommentedMap({
                table: CommentedMap({
                    'tests': CommentedSeq(),
                    'columns': CommentedMap()
                })})
            assertion.yaml_set_start_comment(
                f'# Auto-generated by Piperider CLI based on table "{table}"')
            assertion.yaml_add_eol_comment('Table Name', table)
            assertion[table].yaml_set_comment_before_after_key('tests',
                                                               indent=2,
                                                               before='Test Cases for Table')

            for column in self.profiler.metadata.tables[table].columns:
                # Columns
                column_name = str(column.name)
                assertion[table]['columns'][column_name] = CommentedMap({
                    'tests': CommentedSeq(),
                })
                assertion[table]['columns'].yaml_add_eol_comment('Column Name', column_name)
                assertion[table]['columns'][column_name].yaml_set_comment_before_after_key('tests',
                                                                                           indent=6,
                                                                                           before='Test Cases for Column')

            file_path = os.path.join(self.assertion_search_path, f'{table}.yml')
            with open(file_path, 'w') as f:
                print(
                    f'Generating assertion template for table "{table}" -> {file_path}')
                yaml.YAML().dump(assertion, f)
        pass

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
            assertion.result.fail_with_exception(AssertionException(f'Cannot find the assertion: {assertion.name}', e))
            return assertion
        except ImportError as e:
            assertion.result.fail_with_exception(AssertionException(f'Cannot find the assertion: {assertion.name}', e))
            return assertion
        except Exception as e:
            assertion.result.fail_with_exception(AssertionException(f'Cannot find the assertion: {assertion.name}', e))
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
            except AssertionException as e:
                print("Internal Error", e)
            except BaseException as e:
                exceptions.append((assertion, e))
        return results, exceptions

    def configure_plugins_path(self):
        plugin_context = os.environ.get('PIPERIDER_PLUGINS')
        if plugin_context:
            sys.path.append(plugin_context)
        if self.default_plugins_dir:
            sys.path.append(self.default_plugins_dir)
