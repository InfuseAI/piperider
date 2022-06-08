import os
from typing import List

import inquirer
from ruamel import yaml

from piperider_cli.datasource import DATASOURCE_PROVIDERS, DataSource

PIPERIDER_WORKSPACE_NAME = '.piperider'
PIPERIDER_CONFIG_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'config.yml')
PIPERIDER_CREDENTIALS_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'credentials.yml')
PIPERIDER_OUTPUT_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'outputs')
PIPERIDER_REPORT_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'reports')
PIPERIDER_COMPARISON_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'comparisons')

# ref: https://docs.getdbt.com/dbt-cli/configure-your-profile
DBT_PROFILES_DIR_DEFAULT = '~/.dbt/'
DBT_PROFILE_FILE = 'profiles.yml'


class Configuration(object):
    """
    Configuration represents the config file in the piperider project
    at $PROJECT_ROOT./piperider/config.yml
    """

    def __init__(self, dataSources: List[DataSource]):
        self.dataSources: List[DataSource] = dataSources
        pass

    @classmethod
    def from_dbt_project(cls, dbt_project_path, dbt_profiles_dir=None):
        """
        build configuration from the existing dbt project

        :param dbt_project_path:
        :param dbt_profiles_dir:
        :return:
        """
        if dbt_profiles_dir:
            dbt_profile_path = os.path.join(dbt_profiles_dir, DBT_PROFILE_FILE)
        else:
            dbt_profile_path = os.path.join(DBT_PROFILES_DIR_DEFAULT, DBT_PROFILE_FILE)

        if not os.path.exists(dbt_project_path):
            raise ValueError(f"Cannot find dbt project at {dbt_project_path}")

        with open(dbt_project_path, 'r') as fd:
            dbt_project = yaml.safe_load(fd)

        if not os.path.exists(os.path.expanduser(dbt_profile_path)):
            raise ValueError(
                f"Cannot find dbt profiles at {dbt_profile_path}. Please use dbt init to initiate the dbt profiles.")

        dbt_profile = _load_dbt_profile(os.path.expanduser(dbt_profile_path))

        profile_name = dbt_project.get('profile')
        target_name = dbt_profile.get(profile_name, {}).get('target')
        credential = dbt_profile.get(profile_name, {}).get('outputs', {}).get(target_name, {})
        type_name = credential.get('type')
        dbt = {
            'profile': profile_name,
            'target': target_name,
            'projectDir': os.path.relpath(os.path.dirname(dbt_project_path), os.getcwd()),
        }

        if dbt_profiles_dir:
            dbt['profilesDir'] = dbt_profiles_dir

        if type_name not in DATASOURCE_PROVIDERS:
            raise ValueError('unknown type name')

        datasource_class = DATASOURCE_PROVIDERS[type_name]
        datasource: DataSource = datasource_class(name=profile_name, dbt=dbt, credential=credential)
        datasource.show_installation_information()

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

        data_sources: List[DataSource] = []
        for ds in config.get('dataSources', []):
            type_name = ds.get('type')
            if type_name not in DATASOURCE_PROVIDERS:
                raise ValueError('unknown type name')

            datasource_class = DATASOURCE_PROVIDERS[type_name]
            dbt = ds.get('dbt')
            if dbt:
                profile_dir = dbt.get('profilesDir', os.getenv('DBT_PROFILES_DIR', DBT_PROFILES_DIR_DEFAULT))
                profile_path = os.path.join(profile_dir, DBT_PROFILE_FILE)
                if '~' in profile_path:
                    profile_path = os.path.expanduser(profile_path)
                profile = _load_dbt_profile(profile_path)
                credential = profile.get(dbt.get('profile'), {}).get('outputs', {}).get(dbt.get('target', {}))
                data_source = datasource_class(name=ds.get('name'), dbt=dbt, credential=credential)
            else:
                try:
                    with open(PIPERIDER_CREDENTIALS_PATH, 'r') as fd:
                        credentials = yaml.safe_load(fd)
                    credential = credentials.get(ds.get('name'))
                except Exception:
                    credential = None
                data_source = datasource_class(name=ds.get('name'), credential=credential)
            data_sources.append(data_source)
        return cls(dataSources=data_sources)

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
            creds[d.name] = dict(type=d.type_name, **d.credential)

        with open(path, 'w') as fd:
            yaml.round_trip_dump(creds, fd)

    def to_sqlalchemy_config(self, datasource_name):
        # TODO we will convert a data source to a sqlalchemy parameters
        raise NotImplementedError

    def ask_for_datasource(self):
        if len(self.dataSources) == 0:
            return None
        elif len(self.dataSources) == 1:
            return self.dataSources[0]
        else:
            questions = [
                inquirer.List('datasource',
                              message="Please select a datasource",
                              choices=[(f'{d.name:20} (type: {d.type_name})', d) for d in self.dataSources],
                              carousel=True)
            ]
            answers = inquirer.prompt(questions, raise_keyboard_interrupt=True)
            return answers['datasource']


def _load_dbt_profile(path):
    from jinja2 import Environment, FileSystemLoader

    def env_var(var, default=None):
        return os.getenv(var, default)

    def as_bool(var):
        return var.lower() in ('true', 'yes', '1')

    def as_number(var):
        if var.isnumeric():
            return int(var)
        return float(var)

    def as_text(var):
        return str(var)

    env = Environment(loader=FileSystemLoader(searchpath=os.path.dirname(path)))
    env.globals['env_var'] = env_var
    env.filters['as_bool'] = as_bool
    env.filters['as_number'] = as_number
    env.filters['as_text'] = as_text
    template = env.get_template(os.path.basename(path))
    return yaml.safe_load(template.render())
