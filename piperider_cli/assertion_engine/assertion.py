import json
import os
import sys
from datetime import datetime, date, time
from importlib import import_module
from typing import List, Dict

from deepmerge import always_merger
from ruamel import yaml
from ruamel.yaml.comments import CommentedMap
from sqlalchemy import inspect
from sqlalchemy.engine import Engine

from piperider_cli import safe_load_yaml, round_trip_load_yaml
from piperider_cli.error import \
    AssertionError, \
    IllegalStateAssertionError
from .event import AssertionEventHandler, DefaultAssertionEventHandler
from .recommender import AssertionRecommender
from .recommender import RECOMMENDED_ASSERTION_TAG


def load_yaml_configs(path, config_path):
    passed: List[str] = []
    failed: List[str] = []
    content: Dict = {}

    def _get_content_by_key(source: Dict, key: str, default_value):
        result = {}
        for t in source:
            result[t] = {}
            result[t][key] = source[t].get(key, default_value)
            result[t]['columns'] = {}
            for c in source[t].get('columns', []):
                result[t]['columns'][c] = {}
                result[t]['columns'][c][key] = source[t]['columns'][c].get(key, default_value)

        return result

    for root, dirs, files in os.walk(path):
        for file in files:
            if file.endswith('.yml') or file.endswith('.yaml'):
                file_path = os.path.join(root, file)
                payload = safe_load_yaml(file_path)
                if not payload:
                    failed.append(file_path)
                else:
                    passed.append(file_path)
                    assertions = _get_content_by_key(payload, 'tests', [])
                    always_merger.merge(content, assertions)

    if not config_path:
        return passed, failed, content

    project_config = safe_load_yaml(config_path)
    if project_config:
        payload = project_config.get('tables', {})
        descriptions = _get_content_by_key(payload, 'description', '')
        always_merger.merge(content, descriptions)

    return passed, failed, content


class ValidationResult:

    def __init__(self, context):
        self.context = context
        self.errors = []

    def has_errors(self):
        return self.errors != []

    def require(self, name: str, specific_type=None):
        configuration: dict = self.context.asserts
        if name not in configuration:
            self.errors.append(f'{name} parameter is required')
        if specific_type is not None:
            if not isinstance(configuration.get(name), specific_type):
                self.errors.append(f'{name} parameter should be a {specific_type} value')
        return self

    def require_metric_consistency(self, *names):
        configuration: dict = self.context.asserts

        if configuration is None:
            return self

        metric_type = set()
        err_msg = 'parameter should be a numeric value or a datetime string in ISO 8601 format'
        for name in names:
            v = configuration.get(name)
            if v is None:
                continue
            if isinstance(v, int) or isinstance(v, float):
                metric_type.add('numeric')
            elif isinstance(v, str):
                metric_type.add('datetime')
                try:
                    datetime.fromisoformat(v)
                except ValueError:
                    self.errors.append(f'\'{name}\' {err_msg}')
            else:
                self.errors.append(f'\'{name}\' {err_msg}')

        if len(metric_type) > 1:
            self.errors.append(f'parameter type should be consistent, found {metric_type}')

        return self

    def _require_numeric_pair(self, name, valid_types: set):
        configuration: dict = self.context.asserts
        values = configuration.get(name)
        if not isinstance(values, list):
            self.errors.append(f'{name} parameter should be a list')
            return self

        if len(values) != 2:
            self.errors.append(f'{name} parameter should contain two values')
            return self

        if not set([type(x) for x in values]).issubset(valid_types):
            self.errors.append(f'{name} parameter should be one of the types {valid_types}, input: {values}')
            return self

        return self

    def require_int_pair(self, name):
        return self._require_numeric_pair(name, {int})

    def require_range_pair(self, name):
        return self._require_numeric_pair(name, {int, float, datetime, date, time})

    def require_same_types(self, name):
        values = self.context.asserts.get(name)

        base_type = type(values[0])
        for v in values:
            if type(v) != base_type:
                self.errors.append(f'{name} parameter should be the same types')
                return self

        return self

    def require_one_of_parameters(self, names: list):
        found = False
        columns = self.context.asserts.keys()
        for c in names:
            if c in columns:
                found = True
                break
        if not found:
            self.errors.append(f'There should contain any parameter names in {names}')
            return self
        return self

    def allow_only(self, *names):
        if self.context.asserts is None:
            return self

        for column in self.context.asserts.keys():
            if column not in names:
                self.errors.append(f'\'{column}\' is not allowed, only allow {names}')
        return self

    def int_if_present(self, name: str):
        if name not in self.context.asserts:
            return self

        if not isinstance(self.context.asserts.get(name), int):
            self.errors.append(f'{name} parameter should be a int value')
            return self

        return self

    def keep_no_args(self):
        if self.context.asserts is None:
            return self

        if self.context.asserts.keys():
            self.errors.append('parameters are not allowed')
            return self
        return self

    def as_internal_report(self):
        def to_str(x: str):
            return f'ERROR: {x}'

        header = 'Found assertion syntax problem =>'
        if self.context.column is None:
            where = f"{header} name: {self.context.name} for table {self.context.table}"
        else:
            where = f"{header} name: {self.context.name} for table {self.context.table} and column {self.context.column}"

        return "\n".join([where] + [to_str(x) for x in self.errors])

    def as_user_report(self):
        def to_str(x):
            return '    ' + x

        msg = f"name: '[bold]{self.context.name}[/bold]'" if self.context.name else f"metric: '[bold]{self.context.metric}[/bold]'"

        where = f'{msg} for [bold yellow]{self.context.table}[/bold yellow]'
        if self.context.column is not None:
            where = f'{where}.[bold blue]{self.context.column}[/bold blue]'

        return '\n'.join([where] + [to_str(x) for x in self.errors])


class AssertionResult:

    def __init__(self):
        self.name: str = None
        self._success: bool = False
        self._exception: Exception = None
        self.actual: dict = None
        self._expected: dict = None

    def status(self):
        return self._success

    @property
    def expected(self):
        return self._expected

    @expected.setter
    def expected(self, value):
        self._expected = value

    @property
    def exception(self):
        return self._exception

    def validate(self):
        if self._exception:
            return self

        return self

    def success(self, actual=None):
        if actual is not None:
            self.actual = actual

        self._success = True
        return self

    def fail(self, actual=None):
        if actual is not None:
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

    def fail_with_profile_metric_not_found_error(self, table, column, metric):
        self._success = False
        if not column:
            self._exception = AssertionError(
                f"Metric '{metric}' is not found in Table '{table}' profiling result.")
        else:
            self._exception = AssertionError(
                f"Metric '{metric}' is not found in Column '{table}-{column}' profiling result.")
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
                        expected=self.expected))

    def _metric_assertion_to_string(self):
        if len(self._expected.keys()) == 2:
            operators = {
                'lte': ']',
                'lt': ')',
                'gte': '[',
                'gt': '('
            }
            # TODO: optimization needed
            boundary = []
            for k, v in self._expected.items():
                if k.startswith('lt'):
                    boundary.append(f'{v}{operators[k]}')
                else:
                    boundary.insert(0, f'{operators[k]}{v}')

            return ', '.join(boundary)
        else:
            operators = {
                'gt': '>',
                'gte': '≥',
                'eq': '=',
                'ne': '≠',
                'lt': '<',
                'lte': '≤'
            }
            k, v = list(self._expected.items())[0]
            return f'{operators[k]} {v}'


class AssertionContext:
    def __init__(self, table_name: str, column_name: str, payload: dict, profiler_result=None, engine=None):
        self.name: str = payload.get('name')
        self.metric: str = payload.get('metric')
        self.table: str = table_name
        self.column: str = column_name
        self.asserts: dict = {}
        self.tags: list = []
        self.is_builtin = False
        self.profiler_result = profiler_result
        self.engine = engine

        # result
        self.result: AssertionResult = AssertionResult()
        self.result.name = self.name if self.name is not None else self.metric

        self._load(payload)

    def _load(self, payload):
        self.asserts = payload.get('assert', {})
        self.tags = payload.get('tags', [])
        self.result.expected = payload.get('assert')

    def __repr__(self):
        return str(self.__dict__)

    def _get_assertion_id(self):
        assertion_id = f'piperider.{self.table}'
        if self.column:
            assertion_id = f'{assertion_id}.{self.column}'

        if self.name:
            assertion_id = f'{assertion_id}.{self.name}'
        elif self.metric:
            assertion_id = f'{assertion_id}.{self.metric}'
        else:
            assert False

        return assertion_id

    def _get_assertion_message(self):
        if self.result.expected is not None and self.result.actual is not None:
            if not self.result._success:
                return f'expected {self.result.expected} but got {self.result.actual}'
        return None

    def to_result_entry(self):
        entry = dict(id=self._get_assertion_id())
        if self.metric:
            entry['metric'] = self.metric
        else:
            entry['name'] = self.name
        entry.update(
            dict(
                table=self.table,
                column=self.column,
                status='passed' if self.result._success is True else 'failed',
                expected=self.result.expected,
                actual=self.result.actual,
                tags=self.tags,
                message=self._get_assertion_message(),
                display_name=self.result.name,
                source='piperider'
            )
        )

        return entry


class AssertionEngine:
    """
    This class is used to evaluate the assertion.
    """
    PIPERIDER_WORKSPACE_NAME = '.piperider'
    PIPERIDER_CONFIG_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'config.yml')
    PIPERIDER_ASSERTION_SEARCH_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'assertions')
    PIPERIDER_ASSERTION_PLUGIN_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'plugins')
    PIPERIDER_ASSERTION_SUPPORT_METRICS = ['distribution', 'range', 'missing_value']

    def __init__(self, engine: Engine, assertion_search_path=PIPERIDER_ASSERTION_SEARCH_PATH,
                 event_handler: AssertionEventHandler = DefaultAssertionEventHandler()):
        self.engine = engine
        self.assertion_search_path = assertion_search_path
        self.assertions_content: Dict = {}
        self.assertions: List[AssertionContext] = []
        self.recommender: AssertionRecommender = AssertionRecommender()
        self.event_handler: AssertionEventHandler = event_handler

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

    def load_assertions(self, profiler_result=None, config_path=PIPERIDER_CONFIG_PATH):
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
        self.load_assertion_content(config_path)

        # Load assertion context
        if profiler_result:
            selected_tables = profiler_result.get('tables').keys()
        else:
            selected_tables = inspect(self.engine).get_table_names()
        for t in self.assertions_content:
            # only append specified table's assertions
            if t in selected_tables:
                if self.assertions_content[t] is None:
                    continue
                table_assertions = self.assertions_content[t].get('tests') \
                    if self.assertions_content[t].get('tests') else []
                for ta in table_assertions:
                    self.assertions.append(AssertionContext(t, None, ta, profiler_result, self.engine))

                columns_content = self.assertions_content[t].get('columns') \
                    if self.assertions_content[t].get('columns') else {}
                for c in columns_content:
                    if columns_content[c] is None:
                        continue
                    column_assertions = columns_content[c].get('tests') if columns_content[c].get('tests') else []
                    for ca in column_assertions:
                        self.assertions.append(AssertionContext(t, c, ca, profiler_result, self.engine))

    def load_all_assertions_for_validation(self) -> (List[str], List[str]):
        passed_assertion_files, failed_assertion_files = self.load_assertion_content()

        self.assertions = []

        for t in self.assertions_content:
            if self.assertions_content[t] is None:
                continue
            table_assertions = self.assertions_content[t].get('tests') \
                if self.assertions_content[t].get('tests') else []
            for ta in table_assertions:
                self.assertions.append(AssertionContext(t, None, ta))

            columns_content = self.assertions_content[t].get('columns') \
                if self.assertions_content[t].get('columns') else {}
            for c in columns_content:
                if columns_content[c] is None:
                    continue
                column_assertions = columns_content[c].get('tests') if columns_content[c].get('tests') else []
                for ca in column_assertions:
                    self.assertions.append(AssertionContext(t, c, ca))

        return passed_assertion_files, failed_assertion_files

    def load_assertion_content(self, config_path=PIPERIDER_CONFIG_PATH):
        passed_assertion_files, failed_assertion_files, self.assertions_content = load_yaml_configs(
            self.assertion_search_path, config_path)

        return passed_assertion_files, failed_assertion_files

    def generate_template_assertions(self, profiling_result):
        self.recommender.prepare_assertion_template(profiling_result)
        template_assertions = self.recommender.assertions
        return self._dump_assertions_files(template_assertions)

    def generate_recommended_assertions(self, profiling_result):
        # Load existing assertions
        if not self.assertions_content:
            self.load_assertions(profiler_result=profiling_result)

        # Generate recommended assertions based on the profiling result
        self.recommender.prepare_assertion_template(profiling_result)
        self.recommender.run(profiling_result)

        recommended_assertions = self.recommender.assertions

        # Dump recommended assertions
        return self._dump_assertions_files(recommended_assertions, prefix='recommended')

    def _is_recommended_assertion(self, assertion):
        if RECOMMENDED_ASSERTION_TAG in assertion.get('tags', []):
            return True
        return False

    def _update_existing_recommended_assertions(self, recommended_assertions):
        comment_remove_entire_assertions = 'TODO: Suggest to remove following assertions (no table/column found)'
        comment_remove_assertion = 'TODO: Suggest to remove this assertion (no recommended found)'
        comment_update_assertion = 'TODO: {recommended_assertion_value} (new recommended assert)'

        def merge_assertions(target: str, existed_items: List, new_generating_items: List):
            if new_generating_items.get(target) is None:
                # Column or table doesn't exist in the existing assertions
                new_generating_items[target] = CommentedMap(existed_items[target])
                is_generated_by_us = False
                for assertion in new_generating_items[target].get('tests', []):
                    is_generated_by_us = self._is_recommended_assertion(assertion)
                    if is_generated_by_us:
                        break
                if is_generated_by_us:
                    new_generating_items.yaml_add_eol_comment(comment_remove_entire_assertions, target)
            else:
                # Merge with existed
                existed_desc = existed_items[target].get('description')
                if existed_desc and isinstance(existed_desc, str):
                    new_generating_items[target]['description'] = existed_desc
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
                                    comment_update_assertion.format(
                                        recommended_assertion_value=recommended_assertion_value),
                                    'assert')
                                new_assertion['assert'] = existed_assertion['assert']
                    if is_new_assertion_found is False:
                        new_generating_items[target]['tests'].append(existed_assertion)
                        if self._is_recommended_assertion(existed_assertion):
                            new_generating_items[target]['tests'][-1].yaml_add_eol_comment(comment_remove_assertion,
                                                                                           'name')
            return new_generating_items

        for name, recommended_assertion in recommended_assertions.items():
            existing_assertion_path = os.path.join(self.assertion_search_path, self._recommend_assertion_filename(name))
            if os.path.exists(existing_assertion_path):
                # Use round trip loader to load existing assertions with comments
                existing_assertion = round_trip_load_yaml(existing_assertion_path)
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

    def evaluate(self, assertion: AssertionContext):
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

        from piperider_cli.assertion_engine.types import get_assertion
        try:
            assertion_instance = get_assertion(assertion.name, assertion.metric)

            try:
                result = assertion_instance.execute(assertion)
                assertion.is_builtin = assertion_instance.__class__.__module__.startswith(get_assertion.__module__)
                result.validate()
            except Exception as e:
                assertion.result.fail_with_exception(e)
            return assertion
        except ValueError as e:
            assertion.result.fail_with_exception(AssertionError(f'Cannot find the assertion: {assertion.name}', e))
            return assertion

    def evaluate_all(self):
        results = []
        exceptions = []

        self.event_handler.handle_assertion_start(self.assertions)
        self.load_plugins()
        for assertion in self.assertions:
            try:
                self.event_handler.handle_execution_start(assertion)
                assertion_result: AssertionContext = self.evaluate(assertion)
                results.append(assertion_result)

                if assertion_result.result.get_internal_error():
                    raise assertion_result.result.get_internal_error()
                self.event_handler.handle_execution_end(assertion_result)
            except AssertionError as e:
                exceptions.append((assertion, e))
            except IllegalStateAssertionError as e:
                exceptions.append((assertion, e))
            except BaseException as e:
                exceptions.append((assertion, e))
        self.event_handler.handle_assertion_end(results, exceptions)
        return results, exceptions

    def validate_assertions(self):
        from piperider_cli.assertion_engine.types import get_assertion
        results = []

        self.load_plugins()
        for assertion in self.assertions:
            assertion_instance = get_assertion(assertion.name, assertion.metric)
            result = assertion_instance.validate(assertion)
            if result and result.has_errors():
                results.append(result)
        return results

    def load_plugins(self):

        def to_dirs(path_list: str):
            if path_list is None:
                return []
            if sys.platform == 'win32':
                return [x.strip() for x in path_list.split(';')]
            return [x.strip() for x in path_list.split(':')]

        plugin_dirs = []
        plugin_context = os.environ.get('PIPERIDER_PLUGINS')
        if plugin_context:
            sys.path.append(plugin_context)
            plugin_dirs += to_dirs(plugin_context)

        if self.default_plugins_dir:
            sys.path.append(self.default_plugins_dir)
            plugin_dirs += to_dirs(self.default_plugins_dir)

        for d in plugin_dirs:
            module_names = [x.split('.py')[0] for x in os.listdir(d) if x.endswith(".py")]
            for m in module_names:
                try:
                    import_module(m)
                except BaseException:
                    print(f"Failed to load module {m} from {d}")
                    raise
