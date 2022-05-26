import json
import os
import shutil
import sys
import uuid
from abc import ABCMeta, abstractmethod
from datetime import datetime
from getpass import getpass
from typing import List

from rich.console import Console
from ruamel import yaml
from sqlalchemy import create_engine, inspect

from piperider_cli.assertion_engine import AssertionEngine
from piperider_cli.profiler import Profiler

PIPERIDER_WORKSPACE_NAME = '.piperider'
PIPERIDER_CONFIG_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'config.yml')
PIPERIDER_CREDENTIALS_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'credentials.yml')
PIPERIDER_OUTPUT_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'outputs')
PIPERIDER_REPORT_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'reports')

DBT_PROFILE_DEFAULT_PATH = os.path.join(os.path.expanduser('~'), '.dbt/profiles.yml')


class DataSource(metaclass=ABCMeta):

    def __init__(self, name, type_name, **kwargs):
        self.name = name
        self.type_name = type_name
        self.args = kwargs
        self.fields: List[str] = []

    def _validate_required_fields(self):
        reasons = []
        # check required fields
        for f in self.fields:
            if f not in self.args.get('credential', {}):
                reasons.append(f"{f} is required")

        return reasons == [], reasons

    @abstractmethod
    def validate(self):
        """
        validate type name and required fields.

        Returns True if everything is fine, False and reasons otherwise.

        :return: bool, []
        """
        raise NotImplemented

    @abstractmethod
    def to_database_url(self):
        """
        build a database url for sqlalchemy create_engine method
        :return:
        """
        raise NotImplemented

    def engine_args(self):
        return dict()


class PostgreSQLDataSource(DataSource):
    def __init__(self, name, **kwargs):
        super().__init__(name, 'postgres', **kwargs)
        self.fields = ["host", "port", "user", "password", "dbname"]

    def validate(self):
        if self.type_name != 'postgres':
            raise ValueError('type name should be snowflake')
        return self._validate_required_fields()

    def to_database_url(self):
        credential = self.args.get('credential')
        host = credential.get('host')
        port = credential.get('port')
        user = credential.get('user')
        password = credential.get('password')
        dbname = credential.get('dbname')
        return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"

    def engine_args(self):
        return dict(connect_args={'connect_timeout': 5})


class SnowflakeDataSource(DataSource):
    def __init__(self, name, **kwargs):
        super().__init__(name, 'snowflake', **kwargs)
        self.fields = ["account", "user", "password", "role", "database", "warehouse", "schema"]
        self._connect_timeout = 5

    def validate(self):
        if self.type_name != 'snowflake':
            raise ValueError('type name should be snowflake')
        return self._validate_required_fields()

    def to_database_url(self):
        credential = self.args.get('credential')
        account = credential.get('account')
        password = credential.get('password')
        user = credential.get('user')
        database = credential.get('database')
        schema = credential.get('schema')
        warehouse = credential.get('warehouse')
        role = credential.get('role')
        from snowflake.sqlalchemy.snowdialect import SnowflakeDialect
        SnowflakeDialect.supports_statement_cache = True
        return f'snowflake://{user}:{password}@{account}/{database}/{schema}' \
               f'?warehouse={warehouse}&role={role}' \
               f'&login_timeout={self._connect_timeout}&network_timeout={self._connect_timeout}'

    def engine_args(self):
        return dict(connect_args={'connect_timeout': self._connect_timeout})


class SqliteDataSource(DataSource):

    def __init__(self, name, **kwargs):
        super().__init__(name, 'sqlite', **kwargs)
        self.fields = ["dbpath"]

    def validate(self):
        if self.type_name != 'sqlite':
            raise ValueError('type name should be sqlite')
        return self._validate_required_fields()

    def to_database_url(self):
        credential = self.args.get('credential')
        dbpath = credential.get('dbpath')
        sqlite_file = os.path.abspath(dbpath)
        if not os.path.exists(sqlite_file):
            raise ValueError(f'Cannot find the sqlite at {sqlite_file}')
        return f"sqlite:///{sqlite_file}"


DATASOURCE_PROVIDERS = dict(postgres=PostgreSQLDataSource, snowflake=SnowflakeDataSource, sqlite=SqliteDataSource)


class Configuration(object):
    """
    Configuration represents the config file in the piperider project
    at $PROJECT_ROOT./piperider/config.yml
    """

    def __init__(self, dataSources: List[DataSource]):
        self.dataSources: List[DataSource] = dataSources
        pass

    @classmethod
    def from_dbt_project(cls, dbt_project_path,
                         dbt_profile_path=DBT_PROFILE_DEFAULT_PATH):
        """
        build configuration from the existing dbt project

        :param dbt_project_path:
        :param dbt_profile_path:
        :return:
        """
        if not os.path.exists(dbt_project_path):
            raise ValueError(f"Cannot find dbt project at {dbt_project_path}")

        with open(dbt_project_path, 'r') as fd:
            dbt_project = yaml.safe_load(fd)

        with open(dbt_profile_path, 'r') as fd:
            dbt_profile = yaml.safe_load(fd)

        profile_name = dbt_project.get('profile')
        target_name = dbt_profile.get(profile_name, {}).get('target')
        credential = dbt_profile.get(profile_name, {}).get('outputs', {}).get(target_name, {})
        type_name = credential.get('type')
        dbt = {
            'project': profile_name,
            'target': target_name,
            'profile': dbt_profile_path,
            'root': os.path.dirname(dbt_project_path),
        }

        if type_name not in DATASOURCE_PROVIDERS:
            raise ValueError('unknown type name')

        datasource_class = DATASOURCE_PROVIDERS[type_name]
        datasource = datasource_class(name=profile_name, dbt=dbt, credential=credential)
        return cls(dataSources=[datasource])

    @classmethod
    def load(cls, piperider_config_path=PIPERIDER_CONFIG_PATH):
        """
        load from the existing configuration

        :return:
        """
        credentials = None

        with open(piperider_config_path, 'r') as fd:
            config = yaml.safe_load(fd)

        datasources: List[DataSource] = []
        for ds in config.get('dataSources', []):
            type_name = ds.get('type')
            if type_name not in DATASOURCE_PROVIDERS:
                raise ValueError('unknown type name')

            datasource_class = DATASOURCE_PROVIDERS[type_name]
            dbt = ds.get('dbt')
            if dbt:
                with open(dbt.get('profile'), 'r') as fd:
                    profile = yaml.safe_load(fd)
                credential = profile.get(dbt.get('project'), {}).get('outputs', {}).get(dbt.get('target', {}))
                datasource = datasource_class(name=ds.get('name'), dbt=dbt, credential=credential)
            else:
                with open(PIPERIDER_CREDENTIALS_PATH, 'r') as fd:
                    credentials = yaml.safe_load(fd)
                credential = credentials.get(ds.get('name'))
                datasource = datasource_class(name=ds.get('name'), credential=credential)
            datasources.append(datasource)
        return cls(dataSources=datasources)

    def dump(self, path):
        """
        dump the configuration to the given path
        :param path:
        :return:
        """
        config = dict(dataSources=[])

        for d in self.dataSources:
            datasource = dict(name=d.name, type=d.type_name)
            if d.args.get('dbt'):
                datasource['dbt'] = d.args.get('dbt')
            config['dataSources'].append(datasource)

        with open(path, 'w') as fd:
            yaml.round_trip_dump(config, fd)

    def dump_credentials(self, path):
        """
        dump the credentials to the given path
        :param path:
        :return:
        """
        creds = dict()
        for d in self.dataSources:
            creds[d.name] = dict(type=d.type_name, **d.args)

        with open(path, 'w') as fd:
            yaml.round_trip_dump(creds, fd)

    def to_sqlalchemy_config(self, datasource_name):
        # TODO we will convert a data source to a sqlalchemy parameters
        raise NotImplemented


def _generate_piperider_workspace():
    from piperider_cli import data
    init_template_dir = os.path.join(os.path.dirname(data.__file__), 'piperider-init-template')
    working_dir = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME)

    if sys.version_info >= (3, 8):
        # dirs_exist_ok only available after 3.8
        shutil.copytree(init_template_dir, working_dir, dirs_exist_ok=True)
    else:
        from distutils.dir_util import copy_tree
        copy_tree(init_template_dir, working_dir)


def _ask_user_for_datasource():
    console = Console()
    # we only support snowflake and pg only
    # we might consider a sqlite for dev mode?
    console.print(f'\nWhat is your project name? (alphanumeric only)')
    in_source_name = input(':').strip()
    if in_source_name == '':
        raise Exception('project name is empty')

    console.print(f'\nWhat data source would you like to connect to?')
    console.print('1. snowflake')
    console.print('2. postgres')
    in_source_type = input(':').strip()
    fields = {
        '1': ['account', 'user', 'password', 'role', 'database', 'warehouse', 'schema'],
        '2': ['host', 'port', 'user', 'password', 'dbname'],
    }
    parse_fields = {
        'port': {
            'parser': int,
            'type_desc': 'an integer',
        }
    }

    if in_source_type not in fields.keys():
        raise Exception('invalid source type')

    source_type = 'snowflake' if in_source_type == '1' else 'postgres'
    source_args = dict()

    console.print(f'\nPlease enter the following fields for {source_type}')
    for field in fields[in_source_type]:
        if field == 'password':
            source_args[field] = getpass(f'{field} (hidden): ')
        else:
            source_args[field] = input(f'{field}: ').strip()
        if field in parse_fields.keys():
            try:
                source_args[field] = parse_fields[field]['parser'](source_args[field])
            except:
                raise Exception(f'{field} is expected to be {parse_fields[field]["type_desc"]}')

    ds: DataSource = None
    if source_type == 'snowflake':
        ds = SnowflakeDataSource(name=in_source_name, **source_args)
    elif source_type == 'postgres':
        ds = PostgreSQLDataSource(name=in_source_name, **source_args)

    config = Configuration(dataSources=[ds])

    config.dump(PIPERIDER_CONFIG_PATH)
    config.dump_credentials(PIPERIDER_CREDENTIALS_PATH)

    return config


def _inherit_datasource_from_dbt_project(dbt_project_path):
    piperider_config_path = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'config.yml')
    config = Configuration.from_dbt_project(dbt_project_path)
    config.dump(piperider_config_path)

    return config


def _generate_configuration(dbt_project_path=None):
    """
    :param dbt_project_path:
    :return: Configuration object
    """
    if dbt_project_path is None:
        return _ask_user_for_datasource()

    return _inherit_datasource_from_dbt_project(dbt_project_path)


def init(dbt_project_path=None):
    _generate_piperider_workspace()
    # get Configuration object from dbt or user created configuation
    configuration = _generate_configuration(dbt_project_path=dbt_project_path)
    return configuration


def _check_dbt_config(dbt, table=None):
    tables = []
    if dbt is None:
        return True, '', []

    dbt_root = dbt.get('root')
    dbt_catalog = os.path.join(dbt_root, 'target', 'catalog.json')
    if os.path.exists(dbt_catalog):
        with open(dbt_catalog) as fd:
            catalog = json.loads(fd.read())
        # TODO we should consider the case that the table name is not unique
        tables += [k.split('.')[-1].lower() for k in catalog.get('nodes', {}).keys()]
        tables += [k.split('.')[-1].lower() for k in catalog.get('sources', {}).keys()]
        if not tables:
            return False, f'No table found in {dbt_catalog}', []
        if table and table not in tables:
            return False, f"Table '{table}' doesn't exist in {dbt_catalog}", []
    else:
        return False, f"'{dbt_catalog}' not found", []

    return True, '', tables


def debug(configuration: Configuration = None):
    console = Console()
    if not configuration:
        configuration = Configuration.load()

    has_error = False
    console.print(f'Config files:')
    console.print(f'  {PIPERIDER_CONFIG_PATH}: [[bold green]OK[/bold green]]')

    for ds in configuration.dataSources:
        console.print(f"Check format for datasource [ {ds.name} ]")
        result, reasons = ds.validate()
        if result:
            console.print("[bold green]✅ PASS[/bold green]")
        else:
            has_error = True
            console.print("[bold red]😱 FAILED[/bold red]")
            for reason in reasons:
                console.print(f"\t{reason}")

        if has_error:
            return has_error

        dbt = ds.args.get('dbt')
        provider_info = ''
        if dbt:
            provider_info = f'(Provider dbt-local : {dbt["project"]} : {dbt["target"]})'
        console.print(f'Connection {provider_info}:')
        console.print(f'  Name: {ds.name}')
        console.print(f'  Type: {ds.type_name}')

        engine = None
        try:
            engine = create_engine(ds.to_database_url(), **ds.engine_args())
            print(f'  Available Tables: {inspect(engine).get_table_names()}')
            # TODO: show the host & user info based on each dataSources
            console.print(f'[bold green]✅ PASS[/bold green]')
        except Exception as e:
            console.print("[bold red]😱 FAILED[/bold red]")
            raise e
        finally:
            if engine:
                engine.dispose()

        # Check catalog.json file exist if dbt is used
        if dbt:
            console.print(f'Check dbt catalog file:')
            passed, error_msg, _ = _check_dbt_config(dbt)
            if not passed:
                has_error = True
                console.print(f'[bold red]😱 FAILED[/bold red] : {error_msg}')
                console.print(
                    f"  [bold yellow]Note:[/bold yellow] Please run command 'dbt docs generate' to update 'catalog.json' file")
                return has_error
            else:
                console.print(f'[bold green]✅ PASS[/bold green]')

        passed_files, failed_files, content = AssertionEngine.check_assertions_syntax()
        if passed_files and failed_files:
            console.print(f'Check Assertion Files:')
            for file in passed_files:
                console.print(f'  {file}: [[bold green]OK[/bold green]]')
            for file in failed_files:
                console.print(f'  {file}: [[red green]Failed[/red green]]')

    return has_error


def _execute_assertions(console: Console, profiler, ds: DataSource, interaction: bool, output, result, created_at):
    # TODO: Implement running test cases based on profiling result
    assertion_engine = AssertionEngine(profiler)
    assertion_engine.load_assertions()

    if not assertion_engine.assertions_content:
        console.print(f'No assertions found for datasource [ {ds.name} ]')
        if interaction:
            console.print(f'Do you want to auto generate assertion templates for this datasource \[yes/no]?',
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
                if not r.column in columns:
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
            passed, error_msg, tables = _check_dbt_config(dbt, table)
            if not passed:
                console.print(
                    "[bold yellow]Note:[/bold yellow] Please run command 'dbt docs generate' to update 'catalog.json' files")
                raise Exception(error_msg)
        if table:
            tables = [table]

        console.rule(f'Profiling')
        run_id = uuid.uuid4().hex
        created_at = datetime.now()
        engine = create_engine(ds.to_database_url(), **ds.engine_args())
        profiler = Profiler(engine)
        profile_result = profiler.profile(tables)

        output_path = prepare_output_path(created_at, ds, output)

        # output profiling result
        with open(os.path.join(output_path, f".profiler.json"), "w") as f:
            f.write(json.dumps(profile_result))

        # TODO stop here if tests was not needed.
        assertion_results, assertion_exceptions = _execute_assertions(console, profiler, ds, interaction, output,
                                                                      profile_result, created_at)
        if assertion_results:
            console.rule(f'Assertion Results')
            _show_assertion_result(console, assertion_results, assertion_exceptions)

        console.rule(f'Summary')

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


def generate_report(input=None, base=None):
    console = Console()

    from piperider_cli import data
    report_template_dir = os.path.join(os.path.dirname(data.__file__), 'report')
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
            console.print(f'[bold red]Error: invalid input file[/bold red]')
            return
        if base:
            # TODO check base file and generate comparison report
            pass
        else:
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
    elif base:
        console.print(f'[bold red]Error: require input file[/bold red]')
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
