import os
import shutil
from abc import ABCMeta, abstractmethod
from getpass import getpass
from typing import List

from rich.console import Console
from ruamel import yaml

PIPERIDER_WORKSPACE_NAME = '.piperider'
PIPERIDER_CONFIG_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'config.yml')
PIPERIDER_CREDENTIALS_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'credentials.yml')

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
            from sqlalchemy import create_engine
            engine = create_engine(ds.to_database_url(), connect_args={'connect_timeout': 5})
            from sqlalchemy import inspect
            print(f'  Available Tables: {inspect(engine).get_table_names()}')
            # TODO: show the host & user info based on each dataSources
            console.print(f'[bold green]✅ PASS[/bold green]')
        except Exception as e:
            console.print("[bold red]😱 FAILED[/bold red]")
            raise e
        finally:
            if engine:
                engine.dispose()

    return has_error


def run():
    configuration = Configuration.load()
    # TODO ....


def generate_report():
    raise NotImplemented
