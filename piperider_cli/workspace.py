import json
import os
import shutil
import sys
import uuid
from abc import ABCMeta, abstractmethod
from datetime import datetime
from glob import glob

from rich.console import Console
from rich.table import Table
from sqlalchemy import create_engine, inspect

from piperider_cli.assertion_engine import AssertionEngine
from piperider_cli.compare_report import CompareReport
from piperider_cli.configuration import Configuration, PIPERIDER_WORKSPACE_NAME, PIPERIDER_CONFIG_PATH, \
    PIPERIDER_CREDENTIALS_PATH
from piperider_cli.datasource import DataSource
from piperider_cli.profiler import Profiler

PIPERIDER_OUTPUT_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'outputs')
PIPERIDER_REPORT_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'reports')
PIPERIDER_COMPARISON_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'comparisons')

CONSOLE_MSG_PASS = '[bold green]✅ PASS[/bold green]\n'
CONSOLE_MSG_FAIL = '[bold red]😱 FAILED[/bold red]\n'
CONSOLE_MSG_ALL_SET = '[bold]🎉 You are all set![/bold]\n'


class AbstractChecker(metaclass=ABCMeta):
    console = Console()

    @abstractmethod
    def check_function(self, configurator: Configuration) -> (bool, str):
        pass


class CheckingHandler(object):
    def __init__(self):
        self.configurator = None
        self.checker_chain = []
        self.console = Console()

    def set_checker(self, name: str, checker: AbstractChecker):
        self.checker_chain.append({'name': name, 'cls': checker()})

    def execute(self):
        try:
            if not self.configurator:
                try:
                    self.configurator = Configuration.load()
                except Exception:
                    pass

            for checker in self.checker_chain:
                self.console.print(f'Check {checker["name"]}:')
                passed, error_msg = checker['cls'].check_function(self.configurator)
                if not passed:
                    raise ValueError(error_msg)
                self.console.print(CONSOLE_MSG_PASS)

            self.console.print(CONSOLE_MSG_ALL_SET)
        except Exception as e:
            self.console.print(CONSOLE_MSG_FAIL)
            raise e
        return True


class CheckConfiguration(AbstractChecker):
    def check_function(self, configurator: Configuration) -> (bool, str):
        if not configurator:
            self.console.print(f'  {PIPERIDER_CONFIG_PATH}: [[bold red]FAILED[/bold red]]')
            return False, 'No configuration found'
        self.console.print(f'  {PIPERIDER_CONFIG_PATH}: [[bold green]OK[/bold green]]')
        return True, ''


class CheckDataSources(AbstractChecker):
    def check_function(self, configurator: Configuration) -> (bool, str):
        all_passed = True
        for ds in configurator.dataSources:
            passed, reasons = ds.validate()
            if passed:
                self.console.print(f'  {ds.name}: [[bold green]OK[/bold green]]')
            else:
                all_passed = False
                self.console.print(f'  {ds.name}: [[bold red]FAILED[/bold red]]')
                for reason in reasons:
                    self.console.print(f'    {reason}')
            ds.show_installation_information()
        return all_passed, ''


class CheckConnections(AbstractChecker):
    def check_function(self, configurator: Configuration) -> (bool, str):
        all_passed = True
        for ds in configurator.dataSources:
            dbt = ds.args.get('dbt')
            name = ds.name
            type = ds.type_name

            if dbt:  # dbt provider
                self.console.print(f'  DBT: {ds.type_name} > {dbt["profile"]} > {dbt["target"]}')

            self.console.print(f'  Name: {name}')
            self.console.print(f'  Type: {type}')

            engine = None
            try:
                engine = create_engine(ds.to_database_url(), **ds.engine_args())
                self.console.print(f'  Available Tables: {inspect(engine).get_table_names()}')
                self.console.print('  Connection: [[bold green]OK[/bold green]]')
            except Exception as e:
                self.console.print(f'  Connection: [[bold red]FAILED[/bold red]] reason: {e}')
                all_passed = False
            finally:
                if engine:
                    engine.dispose()

        return all_passed, ''


class CheckDbtCatalog(AbstractChecker):
    def check_function(self, configurator: Configuration) -> (bool, str):
        all_passed = True
        for ds in configurator.dataSources:
            dbt = ds.args.get('dbt')

            if not dbt:
                self.console.print(f'  {ds.name}: [[bold yellow]SKIP[/bold yellow]] provider is not dbt')
                continue

            self.console.print(f'  {os.path.expanduser(dbt.get("projectDir"))}/target/catalog.json: ', end='')
            passed, error_msg, _ = _fetch_dbt_catalog(dbt)
            if not passed:
                all_passed = False
                self.console.print(f'{ds.name}: [[bold red]Failed[/bold red]] Error: {error_msg}')
                self.console.print(
                    "  [bold yellow]Note:[/bold yellow] Please run command 'dbt docs generate' to update 'catalog.json' file")
            else:
                self.console.print(f'{ds.name}: [[bold green]OK[/bold green]]')
        return all_passed, ''


class CheckAssertionFiles(AbstractChecker):
    def check_function(self, configurator: Configuration) -> (bool, str):
        passed_files, failed_files, content = AssertionEngine.check_assertions_syntax()
        for file in passed_files:
            self.console.print(f'  {file}: [[bold green]OK[/bold green]]')

        for file in failed_files:
            self.console.print(f'  {file}: [[bold red]FAILED[/bold red]]')

        return len(failed_files) == 0, ''


def _is_piperider_workspace_exist(workspace_path: str) -> bool:
    if not os.path.exists(workspace_path):
        return False
    elif not os.path.exists(os.path.join(workspace_path, 'config.yml')):
        return False

    return True


def _generate_piperider_workspace() -> bool:
    from piperider_cli import data
    init_template_dir = os.path.join(os.path.dirname(data.__file__), 'piperider-init-template')
    working_dir = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME)

    if _is_piperider_workspace_exist(working_dir) is False:
        if sys.version_info >= (3, 8):
            # dirs_exist_ok only available after 3.8
            shutil.copytree(init_template_dir, working_dir, dirs_exist_ok=True)
        else:
            from distutils.dir_util import copy_tree
            copy_tree(init_template_dir, working_dir)
        return True
    else:
        # Skip if workspace already exists
        return False


def _ask_user_update_credentials(ds: DataSource):
    console = Console()
    console.print(f'\nPlease enter the following fields for {ds.type_name}')
    return ds.ask_credential()


def _ask_user_input_datasource(config: Configuration = None):
    console = Console()
    if config is None:
        cls, name = DataSource.ask()
        ds: DataSource = cls(name=name)
        config = Configuration([ds])
        if _ask_user_update_credentials(ds):
            config.dump(PIPERIDER_CONFIG_PATH)
            config.dump_credentials(PIPERIDER_CREDENTIALS_PATH)
    else:
        if len(config.dataSources) == 1:
            ds = config.dataSources[0]
        else:
            ds = config.ask_for_datasource()
        if not ds.credential:
            console.print(
                f'[[bold yellow]Warning[/bold yellow]] No credential found for \'{ds.type_name}\' datasource \'{ds.name}\'')
            if _ask_user_update_credentials(ds):
                config.dump_credentials(PIPERIDER_CREDENTIALS_PATH)

    ds.show_installation_information()
    return config


def _inherit_datasource_from_dbt_project(dbt_project_path, dbt_profiles_dir=None,
                                         config: Configuration = None) -> bool:
    piperider_config_path = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'config.yml')
    config = Configuration.from_dbt_project(dbt_project_path, dbt_profiles_dir)
    config.dump(piperider_config_path)

    return config


def _generate_configuration(dbt_project_path=None, dbt_profiles_dir=None):
    """
    :param dbt_project_path:
    :return: Configuration object
    """
    try:
        config = Configuration.load()
    except Exception:
        config = None
    if dbt_project_path is None:
        return _ask_user_input_datasource(config=config)

    return _inherit_datasource_from_dbt_project(dbt_project_path, dbt_profiles_dir)


def search_dbt_project_path():
    exclude_patterns = ['site-packages', 'dbt_packages']
    paths = glob(os.path.join(os.getcwd(), '**', 'dbt_project.yml'), recursive=True)
    for exclude_pattern in exclude_patterns:
        paths = list(filter(lambda x: exclude_pattern not in x, paths))
    dbt_project_path = None
    if not paths:
        # No dbt project found
        return dbt_project_path

    if len(paths) == 1:
        # Only one dbt project found, use it
        dbt_project_path = paths[0]
    else:
        # Multiple dbt projects found, ask user to select one
        paths = sorted(paths, key=len)
        default_index = 0
        console = Console()
        console.print(f'\nMultiple dbt projects found. Please select the dbt project: (Default: {default_index})')
        table = Table(show_header=True, header_style="bold magenta")
        table.add_column('Index', style="bold", width=5, justify='right')
        table.add_column('Path', style="bold")
        for i, p in enumerate(paths):
            table.add_row(str(i), p)
        console.print(table)
        in_index = input('index : ').strip()
        try:
            in_index = int(in_index) if in_index else default_index
            index = int(in_index)
            dbt_project_path = paths[index]
        except Exception as e:
            console.print(f'[bold yellow]Failed to read index![/] Error: {e}')
            return None

    return dbt_project_path


def init(dbt_project_path=None, dbt_profiles_dir=None):
    console = Console()
    if _generate_piperider_workspace() is False:
        console.print('[bold green]Piperider workspace already exist[/bold green] ')

    # get Configuration object from dbt or user created configuration
    configuration = _generate_configuration(dbt_project_path, dbt_profiles_dir)
    return configuration


def _fetch_dbt_catalog(dbt, table=None):
    tables = []
    if dbt is None:
        return True, '', tables

    for key in ['profile', 'target', 'projectDir']:
        if key not in dbt:
            raise Exception(f"'{key}' is not in dbt config")

    dbt_root = os.path.expanduser(dbt.get('projectDir'))
    dbt_catalog = os.path.join(dbt_root, 'target', 'catalog.json')
    if os.path.exists(dbt_catalog):
        with open(dbt_catalog) as fd:
            catalog = json.loads(fd.read())
        # TODO we should consider the case that the table name is not unique
        for k, v in (catalog.get('nodes', {}) | catalog.get('sources', {})).items():
            metadata = v.get('metadata', {})
            name = metadata.get('name')
            schema = metadata.get('schema')
            if table and name != table:
                continue
            if schema == 'public':
                table_name = name
            else:
                table_name = f'{schema}.{name}'
            tables.append(table_name)
    else:
        return False, f"'{dbt_catalog}' not found", []

    if table and not tables:
        return False, f"Table '{table}' doesn't exist in {dbt_catalog}", []
    if not tables:
        return False, f'No table found in {dbt_catalog}', []

    return True, '', tables


def debug():
    handler = CheckingHandler()
    handler.set_checker('config files', CheckConfiguration)
    handler.set_checker('format of data sources', CheckDataSources)
    handler.set_checker('connections', CheckConnections)
    handler.set_checker('dbt catalog files', CheckDbtCatalog)
    handler.set_checker('assertion files', CheckAssertionFiles)
    return handler.execute()


def _execute_assertions(console: Console, profiler, ds: DataSource, interaction: bool, output, result, created_at):
    # TODO: Implement running test cases based on profiling result
    assertion_engine = AssertionEngine(profiler)
    assertion_engine.load_assertions()

    if not assertion_engine.assertions_content:
        console.print(f'No assertions found for datasource [ {ds.name} ]')
        if interaction:
            console.print('Do you want to auto generate assertion templates for this datasource \[yes/no]?',
                          end=' ')
            confirm = input('').strip().lower()
            if confirm == 'yes' or confirm == 'y':
                assertion_engine.generate_assertion_templates()
        else:
            assertion_engine.generate_assertion_templates()
        console.print(f'[[bold yellow]Skip[/bold yellow]] Executing assertion for datasource [ {ds.name} ]')
        return None, None  # no assertion to run
    else:
        results, exceptions = assertion_engine.evaluate_all(result)
        return results, exceptions


def _show_assertion_result(console: Console, results, exceptions, failed_only=False, single_table=None):
    if results:
        max_target_len = 0
        max_assert_len = 0
        for assertion in results:
            if single_table and single_table != assertion.table:
                continue
            if assertion.column:
                if failed_only and assertion.result.status():
                    continue
                target = f'{assertion.table}.{assertion.column}'
                max_target_len = max(max_target_len, len(target))
            max_assert_len = max(max_assert_len, len(assertion.name))

        for assertion in results:
            if single_table and single_table != assertion.table:
                continue
            if failed_only and assertion.result.status():
                continue
            table = assertion.table
            column = assertion.column
            test_function = assertion.name
            test_function = test_function.ljust(max_assert_len + 1)
            success = assertion.result.status()
            target = f'{table}.{column}' if column else table
            target = target.ljust(max_target_len + 1)
            if success:
                console.print(
                    f'[[bold green]  OK  [/bold green]] {target} {test_function} Expected: {assertion.result.expected()} Actual: {assertion.result.actual}')
            else:
                console.print(
                    f'[[bold red]FAILED[/bold red]] {target} {test_function} Expected: {assertion.result.expected()} Actual: {assertion.result.actual}')
    # TODO: Handle exceptions
    pass


def _show_table_summary(console: Console, table: str, profiled_result, assertion_results):
    profiled_columns = profiled_result.get('col_count')
    num_of_testcases = 0
    num_of_passed_testcases = 0
    num_of_failed_testcases = 0
    failed_testcases = []

    if assertion_results:
        for r in assertion_results:
            if r.table == table:
                num_of_testcases += 1
                if r.result.status():
                    num_of_passed_testcases += 1
                else:
                    failed_testcases.append(r)

    num_of_failed_testcases = num_of_testcases - num_of_passed_testcases
    console.print(f"Table '{table}'")
    console.print(f'  {profiled_columns} columns profiled')

    if num_of_testcases > 0:
        console.print(f'  {num_of_testcases} test executed')

    if (num_of_failed_testcases > 0):
        console.print(f'  {num_of_failed_testcases} of {num_of_testcases} tests failed:')
        _show_assertion_result(console, assertion_results, None, failed_only=True, single_table=table)
    console.print()
    pass


def _transform_assertion_result(table: str, results):
    if not results:
        return

    tests = []
    columns = {}
    for r in results:
        if r.table == table:
            entry = r.to_result_entry()
            if r.column:
                if r.column not in columns:
                    columns[r.column] = []
                columns[r.column].append(entry)
            else:
                tests.append(entry)

    return dict(tests=tests, columns=columns)


def run(datasource=None, table=None, output=None, interaction=True):
    console = Console()
    configuration = Configuration.load()

    datasource_names = [ds.name for ds in configuration.dataSources]
    if datasource and datasource not in datasource_names:
        console.print(f"[bold red]Error: datasource '{datasource}' doesn't exist[/bold red]")
        return

    for ds in configuration.dataSources:
        if datasource and ds.name != datasource:
            continue
        console.print(f'[bold dark_orange]DataSource:[/bold dark_orange] {ds.name}')

        dbt = ds.args.get('dbt')
        tables = None
        if dbt:
            passed, error_msg, tables = _fetch_dbt_catalog(dbt, table)
            if not passed:
                console.print(
                    "[bold yellow]Note:[/bold yellow] Please run command 'dbt docs generate' to update 'catalog.json' files")
                raise Exception(error_msg)
        else:
            if table:
                tables = [table]

        console.rule('Profiling')
        run_id = uuid.uuid4().hex
        created_at = datetime.now()
        engine = create_engine(ds.to_database_url(), **ds.engine_args())
        profiler = Profiler(engine)
        profile_result = profiler.profile(tables)

        output_path = prepare_output_path(created_at, ds, output)

        # output profiling result
        with open(os.path.join(output_path, ".profiler.json"), "w") as f:
            f.write(json.dumps(profile_result))

        # TODO stop here if tests was not needed.
        assertion_results, assertion_exceptions = _execute_assertions(console, profiler, ds, interaction, output,
                                                                      profile_result, created_at)
        if assertion_results:
            console.rule('Assertion Results')
            _show_assertion_result(console, assertion_results, assertion_exceptions)

        console.rule('Summary')

        for t in profile_result['tables']:
            output_file = os.path.join(output_path, f"{t}.json")
            profile_result['tables'][t]['assertion_results'] = _transform_assertion_result(t, assertion_results)
            profile_result['tables'][t]['id'] = run_id
            profile_result['tables'][t]['created_at'] = created_at.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
            profile_result['tables'][t]['datasource'] = dict(name=ds.name, type=ds.type_name)

            _show_table_summary(console, t, profile_result['tables'][t], assertion_results)

            with open(output_file, 'w') as f:
                f.write(json.dumps(profile_result['tables'][t], indent=4))
        console.print(f'Results saved to {output_path}')


def prepare_output_path(created_at, ds, output):
    latest_symlink_path = os.path.join(PIPERIDER_OUTPUT_PATH, 'latest')
    output_path = os.path.join(PIPERIDER_OUTPUT_PATH,
                               f"{ds.name}-{created_at.strftime('%Y%m%d%H%M%S')}")
    if output:
        output_path = output
    if not os.path.exists(output_path):
        os.makedirs(output_path, exist_ok=True)

    # Create a symlink pointing to the latest output directory
    if os.path.islink(latest_symlink_path):
        os.unlink(latest_symlink_path)
    if not os.path.exists(latest_symlink_path):
        os.symlink(output_path, latest_symlink_path)
    else:
        console = Console()
        console.print(f'[bold yellow]Warning: {latest_symlink_path} already exists[/bold yellow]')

    return output_path


def _validate_input_result(result):
    for f in ['name', 'row_count', 'col_count', 'columns', 'assertion_results', 'id', 'created_at', 'datasource']:
        if f not in result:
            return False
    return True


def _generate_static_html(result, html, output_path):
    table = result['name']
    filename = os.path.join(output_path, f"{table}.html")
    with open(filename, 'w') as f:
        html = html.replace(r'window.PIPERIDER_REPORT_DATA=""', f'window.PIPERIDER_REPORT_DATA={json.dumps(result)};')
        f.write(html)
    return table, filename


def generate_report(input=None):
    console = Console()

    from piperider_cli import data
    report_template_dir = os.path.join(os.path.dirname(data.__file__), 'report', 'single-report')
    with open(os.path.join(report_template_dir, 'index.html')) as f:
        report_template_html = f.read()

    created_at = datetime.now()

    if input:
        if not os.path.exists(input):
            console.print(f'[bold red]Error: {input} not found[/bold red]')
            return

        with open(input) as f:
            result = json.loads(f.read())
        if not _validate_input_result(result):
            console.print('[bold red]Error: invalid input file[/bold red]')
            return

        console.print(f'[bold dark_orange]Generating reports from:[/bold dark_orange] {input}')

        datasource = result['datasource']['name']
        dir = os.path.join(PIPERIDER_REPORT_PATH, f"{datasource}-{created_at.strftime('%Y%m%d%H%M%S')}")
        if not os.path.exists(dir):
            os.makedirs(dir, exist_ok=True)

        shutil.copytree(report_template_dir,
                        dir,
                        dirs_exist_ok=True,
                        ignore=shutil.ignore_patterns('index.html'))

        console.rule('Reports')
        table, filename = _generate_static_html(result, report_template_html, dir)
        console.print(f"Table '{table}' {filename}")
    else:
        latest = os.path.join(PIPERIDER_OUTPUT_PATH, 'latest')
        console.print(f'[bold dark_orange]Generating reports from:[/bold dark_orange] {latest}')

        report_info = []
        max_table_len = 0
        for result_file in os.scandir(latest):
            if not result_file.is_file():
                continue
            if result_file.name.endswith('.json') and result_file.name != '.profiler.json':
                with open(result_file.path) as f:
                    result = json.loads(f.read())
                if not _validate_input_result(result):
                    console.print(f'[bold dark_orange]Warning: {result_file.path} is invalid[/bold dark_orange]')
                    continue

                datasource = result['datasource']['name']
                dir = os.path.join(PIPERIDER_REPORT_PATH, f"{datasource}-{created_at.strftime('%Y%m%d%H%M%S')}")
                if not os.path.exists(dir):
                    os.makedirs(dir, exist_ok=True)
                shutil.copytree(report_template_dir,
                                dir,
                                dirs_exist_ok=True,
                                ignore=shutil.ignore_patterns('index.html'))

                table, filename = _generate_static_html(result, report_template_html, dir)
                max_table_len = max(max_table_len, len(table))
                report_info.append(dict(table=table, filename=filename))

        console.rule('Reports')
        for r in report_info:
            display_table = f"'{r['table']}'".ljust(max_table_len + 2)
            console.print(f"Table {display_table} {r['filename']}")


def compare_report(a=None, b=None):
    console = Console()

    report = CompareReport(PIPERIDER_OUTPUT_PATH, a, b)
    if not report.select_reports():
        raise Exception('No valid reports found')
    comparison_data = report.generate_data()

    from piperider_cli import data
    report_template_dir = os.path.join(os.path.dirname(data.__file__), 'report', 'comparison-report')
    with open(os.path.join(report_template_dir, 'index.html')) as f:
        report_template_html = f.read()

    data_id = comparison_data.id()
    dir = os.path.join(PIPERIDER_COMPARISON_PATH, data_id)
    shutil.copytree(report_template_dir,
                    dir,
                    dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns('index.html'))

    filename = os.path.join(dir, 'index.html')
    with open(filename, 'w') as f:
        html = report_template_html.replace(r'window.PIPERIDER_REPORT_DATA=""',
                                            f'window.PIPERIDER_REPORT_DATA={comparison_data.to_json()};')
        f.write(html)

    console.print()
    console.print(f"Comparison report: {filename}")

    # TODO for debugging intermediate data, remove this
    # with open('comparison_data.json', 'w') as f:
    #    f.write(comparison_data.to_json())

    pass
