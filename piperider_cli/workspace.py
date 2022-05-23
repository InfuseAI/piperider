import json
import os
import shutil
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
PIPERIDER_OUTPUT_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'output')

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


class SnowflakeDataSource(DataSource):
    def __init__(self, name, **kwargs):
        super().__init__(name, 'snowflake', **kwargs)
        self.fields = ["account", "user", "password", "role", "database", "warehouse", "schema"]

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
        return f'snowflake://{user}:{password}@{account}/{database}/{schema}?warehouse={warehouse}&role={role}'


DATASOURCE_PROVIDERS = dict(postgres=PostgreSQLDataSource, snowflake=SnowflakeDataSource)


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
    shutil.copytree(init_template_dir, working_dir, dirs_exist_ok=True)


def _ask_user_for_datasource():
    console = Console()
    # we only support snowfalke and pg only
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
            engine = create_engine(ds.to_database_url(), connect_args={'connect_timeout': 5})
            print(f'  Available Tables: {inspect(engine).get_table_names()}')
            # TODO: show the host & user info based on each dataSources
            console.print(f'[bold green]✅ PASS[/bold green]')
        except Exception as e:
            console.print("[bold red]😱 FAILED[/bold red]")
            raise e
        finally:
            if engine:
                engine.dispose()

        passed_files, failed_files, content = AssertionEngine.check_assertions_syntax()
        if passed_files and failed_files:
            console.print(f'Check Assertion Files:')
            for file in passed_files:
                console.print(f'  {file}: [[bold green]OK[/bold green]]')
            for file in failed_files:
                console.print(f'  {file}: [[red green]Failed[/red green]]')

    return has_error


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
        tables = []
        dbt_root = ds.args.get('dbt', {}).get('root')
        if dbt_root:
            dbt_catalog = os.path.join(dbt_root, 'target', 'catalog.json')
            if os.path.exists(dbt_catalog):
                with open(dbt_catalog) as fd:
                    catalog = json.loads(fd.read())
                # TODO we should consider the case that the table name is not unique
                tables += [k.split('.')[-1].lower() for k in catalog.get('nodes', {}).keys()]
                tables += [k.split('.')[-1].lower() for k in catalog.get('sources', {}).keys()]
                if not tables:
                    console.print(f'[bold red]Error: no table found in {dbt_catalog}[/bold red]')
                    return
                if table and table not in tables:
                    console.print(f"[bold red]Error: table '{table}' doesn't exist[/bold red]")
                    return
            else:
                console.print(f"[bold red]Error: '{dbt_catalog}' not found[/bold red]")
                return

        if table:
            tables = [table]

        created_at = datetime.now()
        engine = create_engine(ds.to_database_url(), connect_args={'connect_timeout': 5})
        profiler = Profiler(engine)
        if tables:
            result = dict(tables={})
            for table in tables:
                result['tables'][table] = profiler.profile_table(table)
        else:
            result = profiler.profile()

        # TODO: Implement running test cases based on profiling result
        assertion_engine = AssertionEngine(profiler)
        assertion_engine.load_assertions()
        if len(assertion_engine.assertions_content) == 0:
            console.print(f'No assertions found for datasource [ {ds.name} ]')
            if interaction:
                console.print(f'Do you want to auto generate assertion templates for this datasource \[yes/no]?',
                              end=' ')
                confirm = input('').strip().lower()
                if confirm == 'yes' or confirm == 'y':
                    assertion_engine.generate_assertion_templates()
            else:
                assertion_engine.generate_assertion_templates()

        output_file = os.path.join(PIPERIDER_OUTPUT_PATH,
                                   f"report-{ds.name}-{created_at.strftime('%Y%m%d%H%M%S')}.json")
        if output:
            # TODO currently multiple datasource reports will be overwritten by the last one
            output_file = output
        if not os.path.exists(output_file):
            os.makedirs(os.path.dirname(output_file), exist_ok=True)
        with open(output_file, 'w') as f:
            f.write(json.dumps(result, indent=4))
        console.print(f'Result saved to {output_file}')


def generate_report():
    raise NotImplemented
