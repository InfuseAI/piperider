import os
import shutil
from abc import ABCMeta
from getpass import getpass
from typing import List

from ruamel.yaml import YAML

yaml = YAML(typ="safe")
PIPERIDER_WORKSPACE_NAME = '.piperider'
PIPERIDER_CONFIG_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'config.yml')

DBT_PROFILE_DEFAULT_PATH = os.path.join(os.path.expanduser('~'), '.dbt/profiles.yml')


class DataSource(metaclass=ABCMeta):

    def __init__(self, name, type_name, **kwargs):
        self.name = name
        self.type_name = type_name
        self.args = kwargs

    def validate(self):
        raise NotImplemented


class PostgreSQLDataSource(DataSource):
    def __init__(self, name, **kwargs):
        super().__init__(name, 'postgres', **kwargs)

    def validate(self):
        if self.type_name != 'postgres':
            raise ValueError('type name should be snowflake')
        # TODO verify fields
        raise NotImplemented


class SnowflakeDataSource(DataSource):
    def __init__(self, name, **kwargs):
        super().__init__(name, 'snowflake', **kwargs)

    def validate(self):
        if self.type_name != 'snowflake':
            raise ValueError('type name should be snowflake')
        # TODO verify fields
        raise NotImplemented


class Configuration(object):
    """
    Configuration represents the config file in the piperider project
    at $PROJECT_ROOT./piperider/config.yml
    """

    def __init__(self, dataSources: List[DataSource] = []):
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
        # TODO create configuration from dbt profile
        with open(dbt_project_path, 'r') as fd:
            dbt_project = yaml.load(fd)

        with open(dbt_profile_path, 'r') as fd:
            dbt_profile = yaml.load(fd)

        profile_name = dbt_project.get('profile')
        target_name = dbt_profile.get(profile_name, {}).get('target')
        credential = dbt_profile.get(profile_name, {}).get('outputs', {}).get(target_name, {})
        type_name = credential.get('type')
        dbt = {
            'project': profile_name,
            'target': target_name,
            'profile': dbt_profile_path,
        }

        if type_name == 'postgres':
            ds = PostgreSQLDataSource(name=profile_name, dbt=dbt, credential=credential)
        elif type_name == 'snowflake':
            ds = SnowflakeDataSource(name=profile_name, dbt=dbt, credential=credential)
        else:
            raise ValueError('unknown type name')

        return cls(dataSources=[ds])

    @classmethod
    def load(cls, piperider_config_path=PIPERIDER_CONFIG_PATH):
        """
        load from the existing configuration

        :return:
        """

        with open(piperider_config_path, 'r') as fd:
            config = yaml.load(fd)

        dataSources: List[DataSource] = []
        for ds in config.get('dataSources', []):
            if ds.get('type') == 'postgres':
                ds_obj = PostgreSQLDataSource(name=ds.get('name'), dbt=ds.get('dbt'))
            elif ds.get('type') == 'snowflake':
                ds_obj = SnowflakeDataSource(name=ds.get('name'), dbt=ds.get('dbt'))
            else:
                raise ValueError('unknown type name')
            dataSources.append(ds_obj)
        return cls(dataSources=dataSources)

    def dump(self, path):
        """
        dump the configuration to the given path
        :param path:
        :return:
        """
        config = dict(dataSources=[])

        for d in self.dataSources:
            config['dataSources'].append(
                dict(
                    name=d.name,
                    type=d.type_name,
                    dbt=d.args.get('dbt')),
            )

        with open(path, 'w') as fd:
            yaml.dump(config, fd)

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
            yaml.dump(creds, fd)

    def to_sqlalchemy_config(self, datasource_name):
        # TODO we will convert a data source to a sqlalchemy parameters
        raise NotImplemented


def _generate_piperider_workspace():
    from piperider_cli import data
    init_template_dir = os.path.join(os.path.dirname(data.__file__), 'piperider-init-template')
    working_dir = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME)
    shutil.copytree(init_template_dir, working_dir, dirs_exist_ok=True)


def _ask_user_for_datasource():
    # we only support snowfalke and pg only
    # we might consider a sqlite for dev mode?
    print(f'\nWhat is your project name? (alphanumeric only)')
    in_source_name = input(':').strip()
    if in_source_name == '':
        raise Exception('Error: project name is empty')

    print(f'\nWhat data source would you like to connect to?')
    print('1. snowflake')
    print('2. postgres')
    in_source_type = input(':').strip()
    fields = {
        '1': ['account', 'user', 'password', 'role', 'database', 'warehouse', 'schema'],
        '2': ['host', 'port', 'user', 'password', 'dbname'],
    }

    if in_source_type not in fields.keys():
        raise Exception('Error: invalid source type')

    source_type = 'snowflake' if in_source_type == '1' else 'postgres'
    source_args = dict()

    print(f'\nPlease enter the following fields for {source_type}')
    for field in fields[in_source_type]:
        if field == 'password':
            source_args[field] = getpass(f'{field} (hidden): ')
        else:
            source_args[field] = input(f'{field}: ').strip()

    ds: DataSource = None
    if source_type == 'snowflake':
        ds = SnowflakeDataSource(name=in_source_name, **source_args)
    elif source_type == 'postgres':
        ds = PostgreSQLDataSource(name=in_source_name, **source_args)

    config = Configuration(dataSources=[ds])

    piperider_path = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME)
    config.dump(os.path.join(piperider_path, 'config.yml'))
    config.dump_credentials(os.path.join(piperider_path, 'credentials.yml'))

    return config


def _generate_configuration(dbt_project_path=None):
    """
    :param dbt_project_path:
    :return: Configuration object
    """
    if dbt_project_path is None:
        return _ask_user_for_datasource()

    piperider_config_path = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'config.yml')
    config = Configuration.from_dbt_project(dbt_project_path)
    config.dump(piperider_config_path)

    return config


def _dbt_project_parser(dbt_project_path, dbt_profile_path):
    if not os.path.isfile(dbt_project_path):
        raise Exception('DBT project path does not exist')

    if not os.path.isfile(dbt_profile_path):
        raise Exception('DBT profile path does not exist')

    with open(dbt_project_path, 'r') as fd:
        dbt_project = yaml.load(fd)

    with open(dbt_profile_path, 'r') as fd:
        dbt_profile = yaml.load(fd)

    profile_name = dbt_project.get('profile')
    target_name = dbt_profile.get(profile_name, {}).get('target')
    type_name = dbt_profile.get(profile_name, {}).get('outputs', {}).get(target_name, {}).get('type')

    return profile_name, target_name, type_name


def init(dbt_project_path=None):
    try:
        _generate_piperider_workspace()
        # get Configuration object from dbt or user created configuation
        configuration = _generate_configuration(dbt_project_path=dbt_project_path)
        return configuration
    except Exception as e:
        print(e)
        return False


def debug(configuration=None):
    if not configuration:
        Configuration.load()
    # TODO debug with configuration
    # test configuration format
    # test connection working
    raise NotImplemented


def run():
    configuration = Configuration.load()
    # TODO ....


def generate_report():
    raise NotImplemented
