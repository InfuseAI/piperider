import errno
import os
import uuid
from typing import List

import inquirer
from ruamel import yaml

from piperider_cli.datasource import DATASOURCE_PROVIDERS, DataSource
from piperider_cli.error import \
    PipeRiderConfigError, \
    PipeRiderInvalidDataSourceError, \
    DbtProjectNotFoundError, \
    DbtProfileNotFoundError, \
    DbtProjectInvalidError, \
    DbtProfileInvalidError, \
    DbtProfileBigQueryAuthWithTokenUnsupportedError

PIPERIDER_WORKSPACE_NAME = '.piperider'
PIPERIDER_CONFIG_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'config.yml')
PIPERIDER_CREDENTIALS_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'credentials.yml')

# ref: https://docs.getdbt.com/dbt-cli/configure-your-profile
DBT_PROFILES_DIR_DEFAULT = '~/.dbt/'
DBT_PROFILE_FILE = 'profiles.yml'


class Configuration(object):
    """
    Configuration represents the config file in the piperider project
    at $PROJECT_ROOT/.piperider/config.yml
    """

    def __init__(self, dataSources: List[DataSource], **kwargs):
        self.dataSources: List[DataSource] = dataSources
        self.telemetry_id = kwargs.get('telemetry_id', None)
        if self.telemetry_id is None:
            self.telemetry_id = uuid.uuid4().hex
        self.report_dir = self._to_report_dir(kwargs.get('report_dir', '.'))

    def _to_report_dir(self, dirname: str):
        if dirname is None or dirname.strip() == '':
            dirname = '.'
        if dirname.startswith('.'):
            return os.path.abspath(os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, dirname))
        return os.path.abspath(dirname)

    def get_telemetry_id(self):
        return self.telemetry_id

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
            raise DbtProjectNotFoundError(dbt_project_path)

        with open(dbt_project_path, 'r') as fd:
            try:
                dbt_project = yaml.safe_load(fd)
            except Exception as e:
                raise DbtProjectInvalidError(dbt_project_path, e)

        if not os.path.exists(os.path.expanduser(dbt_profile_path)):
            raise DbtProfileNotFoundError(dbt_profile_path)

        dbt_profile = _load_dbt_profile(os.path.expanduser(dbt_profile_path))

        profile_name = dbt_project.get('profile')
        target_name = dbt_profile.get(profile_name, {}).get('target')
        credential = _load_credential_from_dbt_profile(dbt_profile, profile_name, target_name)
        type_name = credential.get('type')
        dbt = {
            'profile': profile_name,
            'target': target_name,
            'projectDir': os.path.relpath(os.path.dirname(dbt_project_path), os.getcwd()),
        }

        if dbt_profiles_dir:
            dbt['profilesDir'] = dbt_profiles_dir

        if type_name not in DATASOURCE_PROVIDERS:
            raise PipeRiderInvalidDataSourceError(type_name, dbt_profile_path)

        # Set 'pass' as the alias of 'password'
        if credential.get('pass') and credential.get('password') is None:
            credential['password'] = credential.pop('pass')

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

        try:
            with open(piperider_config_path, 'r') as fd:
                config = yaml.safe_load(fd)
                if config is None:
                    raise FileNotFoundError(errno.ENOENT, os.strerror(errno.ENOENT), piperider_config_path)
        except FileNotFoundError as e:
            raise PipeRiderConfigError(e.filename)

        data_sources: List[DataSource] = []
        for ds in config.get('dataSources', []):
            type_name = ds.get('type')
            if type_name not in DATASOURCE_PROVIDERS:
                raise PipeRiderInvalidDataSourceError(type_name, piperider_config_path)

            datasource_class = DATASOURCE_PROVIDERS[type_name]
            dbt = ds.get('dbt')
            if dbt:
                profile_dir = dbt.get('profilesDir', os.getenv('DBT_PROFILES_DIR', DBT_PROFILES_DIR_DEFAULT))
                profile_path = os.path.join(profile_dir, DBT_PROFILE_FILE)
                if '~' in profile_path:
                    profile_path = os.path.expanduser(profile_path)
                profile = _load_dbt_profile(profile_path)
                profile_name = dbt.get('profile')
                target_name = dbt.get('target')
                credential = _load_credential_from_dbt_profile(profile, profile_name, target_name)
                # TODO: extract duplicate code from func 'from_dbt_project'
                if credential.get('pass') and credential.get('password') is None:
                    credential['password'] = credential.pop('pass')
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

        return cls(
            dataSources=data_sources,
            telemetry_id=config.get('telemetry', {}).get('id'),
            report_dir=config.get('report_dir', '.')
        )

    def dump(self, path):
        """
        dump the configuration to the given path
        :param path:
        :return:
        """
        config = dict(
            dataSources=[],
            telemetry=dict(id=self.telemetry_id)
        )

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
    try:
        return yaml.safe_load(template.render())
    except Exception as e:
        raise DbtProfileInvalidError(path, e)


def _load_credential_from_dbt_profile(dbt_profile, profile_name, target_name):
    credential = dbt_profile.get(profile_name, {}).get('outputs', {}).get(target_name, {})

    if credential.get('type') == 'bigquery':
        # BigQuery Data Source
        from piperider_cli.datasource.bigquery import AUTH_METHOD_OAUTH_SECRETS
        # DBT profile support 4 types of methods to authenticate with BigQuery:
        #   [ 'oauth', 'oauth-secrets', 'service-account', 'service-account-json' ]
        # Ref: https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#authentication-methods
        if credential.get('method') == 'oauth-secrets':
            credential['method'] = AUTH_METHOD_OAUTH_SECRETS
            # TODO: Currently SqlAlchemy haven't support using access token to authenticate with BigQuery.
            #       Ref: https://github.com/googleapis/python-bigquery-sqlalchemy/pull/459
            raise DbtProfileBigQueryAuthWithTokenUnsupportedError
    elif credential.get('type') == 'redshift':
        if credential.get('method') is None:
            credential['method'] = 'password'
        host = credential.get('host')
        port = credential.get('port')
        dbname = credential.get('dbname')
        credential['endpoint'] = f'{host}:{port}/{dbname}'

    return credential
