import os
import sys
import uuid
from typing import List, Optional

import inquirer
from rich.console import Console
from ruamel import yaml
from ruamel.yaml import CommentedMap, CommentedSeq

from piperider_cli import round_trip_load_yaml, safe_load_yaml, dbtutil
from piperider_cli.datasource import DATASOURCE_PROVIDERS, DataSource
from piperider_cli.error import \
    PipeRiderConfigError, \
    PipeRiderConfigTypeError, \
    PipeRiderInvalidDataSourceError, \
    DbtProjectNotFoundError, \
    DbtProfileNotFoundError

PIPERIDER_WORKSPACE_NAME = '.piperider'
PIPERIDER_WORKSPACE_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME)
PIPERIDER_CONFIG_PATH = os.path.join(PIPERIDER_WORKSPACE_PATH, 'config.yml')
PIPERIDER_CREDENTIALS_PATH = os.path.join(PIPERIDER_WORKSPACE_PATH, 'credentials.yml')

# ref: https://docs.getdbt.com/dbt-cli/configure-your-profile
DBT_PROFILES_DIR_DEFAULT = '~/.dbt/'
DBT_PROFILE_FILE = 'profiles.yml'


def is_piperider_workspace_exist(workspace_path: str = PIPERIDER_WORKSPACE_PATH) -> bool:
    if not os.path.exists(workspace_path):
        return False
    elif not os.path.exists(os.path.join(workspace_path, 'config.yml')):
        return False

    return True


configuration_instance: Optional["Configuration"] = None


class Configuration(object):
    """
    Configuration represents the config file in the piperider project
    at $PROJECT_ROOT/.piperider/config.yml
    """

    def __init__(self, dataSources: List[DataSource], **kwargs):
        self.dataSources: List[DataSource] = dataSources
        self.profiler_config = kwargs.get('profiler', {}) or {}
        self.includes = kwargs.get('includes', None)
        self.excludes = kwargs.get('excludes', None)
        self.include_views = kwargs.get('include_views', False)
        self.tables = kwargs.get('tables', {})
        self.telemetry_id = kwargs.get('telemetry_id', None)
        self.report_dir = self._to_report_dir(kwargs.get('report_dir', '.'))

        self._verify_input_config()
        self.includes = [str(t) for t in self.includes] if self.includes else self.includes
        self.excludes = [str(t) for t in self.excludes] if self.excludes else self.excludes

        # global dbt config
        self.dbt = kwargs.get('dbt', None)

    def _to_report_dir(self, dirname: str):
        if dirname is None or dirname.strip() == '':
            dirname = '.'
        if dirname.startswith('.'):
            return os.path.abspath(os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, dirname))
        return os.path.abspath(dirname)

    def _verify_input_config(self):
        if self.profiler_config:
            limit = self.profiler_config.get('table', {}).get('limit', 0)
            if not isinstance(limit, int):
                raise PipeRiderConfigTypeError("profiler 'limit' should be an integer")

            duplicate_rows = self.profiler_config.get('table', {}).get('duplicateRows', False)
            if not isinstance(duplicate_rows, bool):
                raise PipeRiderConfigTypeError("profiler 'duplicateRows' should be an boolean")

        if self.includes is not None:
            if not isinstance(self.includes, List):
                raise PipeRiderConfigTypeError("'includes' should be a list of tables' name")

        if self.excludes is not None:
            if not isinstance(self.excludes, List):
                raise PipeRiderConfigTypeError("'excludes' should be a list of tables' name")

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

        # Precedence reference
        # https://docs.getdbt.com/docs/get-started/connection-profiles#advanced-customizing-a-profile-directory
        if dbt_profiles_dir:
            profile_dir = dbt_profiles_dir
        elif os.getenv('DBT_PROFILES_DIR'):
            profile_dir = os.getenv('DBT_PROFILES_DIR')
        elif os.path.exists(os.path.join(os.getcwd(), DBT_PROFILE_FILE)):
            profile_dir = os.getcwd()
        else:
            profile_dir = DBT_PROFILES_DIR_DEFAULT

        dbt_profile_path = os.path.join(profile_dir, DBT_PROFILE_FILE)

        if not os.path.exists(dbt_project_path):
            raise DbtProjectNotFoundError(dbt_project_path)

        from piperider_cli.dbtutil import load_dbt_project
        dbt_project = load_dbt_project(dbt_project_path)

        if not os.path.exists(os.path.expanduser(dbt_profile_path)):
            raise DbtProfileNotFoundError(dbt_profile_path)

        dbt_profile = dbtutil.load_dbt_profile(os.path.expanduser(dbt_profile_path))

        profile_name = dbt_project.get('profile', '')
        target_name = dbt_profile.get(profile_name, {}).get('target', '')
        if target_name not in list(dbt_profile.get(profile_name, {}).get('outputs', {}).keys()):
            console = Console()
            console.print("[bold red]Error:[/bold red] "
                          f"The profile '{profile_name}' does not have a target named '{target_name}'.\n"
                          "Please check the dbt profile format.")
            sys.exit(1)
        credential = dbtutil.load_credential_from_dbt_profile(dbt_profile, profile_name, target_name)
        type_name = credential.get('type')
        dbt = {
            'projectDir': os.path.relpath(os.path.dirname(dbt_project_path), os.getcwd()),
            'tag': 'piperider',
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
    def instance(cls, piperider_config_path=PIPERIDER_CONFIG_PATH):
        global configuration_instance
        if configuration_instance is not None:
            return configuration_instance
        configuration_instance = cls._load(piperider_config_path)
        return configuration_instance

    @classmethod
    def _load(cls, piperider_config_path=PIPERIDER_CONFIG_PATH):
        """
        load from the existing configuration

        :return:
        """
        credentials = None

        config = safe_load_yaml(piperider_config_path)
        if config is None:
            raise PipeRiderConfigError(piperider_config_path)

        data_sources: List[DataSource] = []
        ds_basic_config = ['name', 'type', 'dbt']
        for ds in config.get('dataSources', []):
            type_name = ds.get('type')
            if type_name not in DATASOURCE_PROVIDERS:
                raise PipeRiderInvalidDataSourceError(type_name, piperider_config_path)

            datasource_class = DATASOURCE_PROVIDERS[type_name]
            credential = {}
            for config_key in ds:
                if config_key in ds_basic_config:
                    continue
                credential[config_key] = ds[config_key]

            dbt = ds.get('dbt')
            if dbt:
                # Precedence reference
                # https://docs.getdbt.com/docs/get-started/connection-profiles#advanced-customizing-a-profile-directory
                if dbt.get('profilesDir'):
                    profile_dir = dbt.get('profilesDir')
                elif os.getenv('DBT_PROFILES_DIR'):
                    profile_dir = os.getenv('DBT_PROFILES_DIR')
                elif os.path.exists(os.path.join(os.getcwd(), DBT_PROFILE_FILE)):
                    profile_dir = os.getcwd()
                else:
                    profile_dir = DBT_PROFILES_DIR_DEFAULT
                profile_path = os.path.join(profile_dir, DBT_PROFILE_FILE)
                if '~' in profile_path:
                    profile_path = os.path.expanduser(profile_path)
                profile = dbtutil.load_dbt_profile(profile_path)
                profile_name = dbt.get('profile')
                target_name = dbt.get('target')
                credential.update(dbtutil.load_credential_from_dbt_profile(profile, profile_name, target_name))
                # TODO: extract duplicate code from func 'from_dbt_project'
                if credential.get('pass') and credential.get('password') is None:
                    credential['password'] = credential.pop('pass')
                data_source = datasource_class(name=ds.get('name'), dbt=dbt, credential=credential)
            else:
                try:
                    with open(PIPERIDER_CREDENTIALS_PATH, 'r') as fd:
                        credentials = yaml.safe_load(fd)
                        credential.update(credentials.get(ds.get('name'), {}))
                except FileNotFoundError:
                    pass
                except Exception:
                    raise
                data_source = datasource_class(name=ds.get('name'), credential=credential)
            data_sources.append(data_source)

        # load global dbt config
        dbt = config.get('dbt')
        if dbt:
            project_dir = config.get('dbt').get('projectDir')
            project = dbtutil.load_dbt_project(project_dir)
            profile_name = project.get('profile')

            # Precedence reference
            # https://docs.getdbt.com/docs/get-started/connection-profiles#advanced-customizing-a-profile-directory
            if dbt.get('profilesDir'):
                profile_dir = dbt.get('profilesDir')
            elif os.getenv('DBT_PROFILES_DIR'):
                profile_dir = os.getenv('DBT_PROFILES_DIR')
            elif os.path.exists(os.path.join(project_dir, DBT_PROFILE_FILE)):
                profile_dir = project_dir
            else:
                profile_dir = DBT_PROFILES_DIR_DEFAULT

            profile_path = os.path.join(profile_dir, DBT_PROFILE_FILE)
            if '~' in profile_path:
                profile_path = os.path.expanduser(profile_path)
            profile = dbtutil.load_dbt_profile(profile_path)
            if profile.get(profile_name):
                target_names = list(profile.get(profile_name).get('outputs').keys())
                for target in target_names:
                    credential = dbtutil.load_credential_from_dbt_profile(profile, profile_name, target)
                    if credential.get('pass') and credential.get('password') is None:
                        credential['password'] = credential.pop('pass')
                    datasource_class = DATASOURCE_PROVIDERS[credential.get('type')]
                    data_source = datasource_class(
                        name=target,
                        dbt=dict(**dbt, profile=profile_name, target=target),
                        credential=credential
                    )
                    data_sources.append(data_source)
                # dbt behavior: dbt uses 'default' as target name if no target given in profiles.yml
                dbt['target'] = profile.get(profile_name).get('target', 'default')
                if dbt['target'] not in target_names:
                    console = Console()
                    console.print("[bold red]Error:[/bold red] "
                                  f"The profile '{profile_name}' does not have a target named '{dbt['target']}'.\n"
                                  "Please check the dbt profile format.")
                    sys.exit(1)

        return cls(
            dataSources=data_sources,
            profiler=config.get('profiler', {}),
            tables=config.get('tables', {}),
            includes=config.get('includes', None),
            excludes=config.get('excludes', None),
            include_views=config.get('include_views', False),
            telemetry_id=config.get('telemetry', {}).get('id'),
            report_dir=config.get('report_dir', '.'),
            dbt=dbt
        )

    def flush_datasource(self, path):
        """
        flush the configuration to the file

        :param path:
        :return:
        """

        config = round_trip_load_yaml(path)
        if config is None:
            raise PipeRiderConfigError(path)

        def _get_exist_datasource(d, config):
            for ds in config.get('dataSources', []):
                if ds.get('name') == d.name:
                    return ds
            return None

        def _generate_datasource_config(d):
            datasource = dict(name=d.name, type=d.type_name)
            if d.args.get('dbt'):
                # dbt project
                datasource['dbt'] = d.args.get('dbt')
            else:
                # non-dbt project
                if d.credential_source == 'config':
                    datasource.update(**d.credential)
            return CommentedMap(datasource)

        flush_data_sources = CommentedSeq()

        for ds in self.dataSources:
            exist_ds = _get_exist_datasource(ds, config)
            if exist_ds:
                flush_data_sources.append(exist_ds)
            else:
                new_ds = _generate_datasource_config(ds)
                flush_data_sources.append(new_ds)
        config['dataSources'] = flush_data_sources

        if config['dataSources'][-1].ca.items == {}:
            # Only append a new line if the last datasource has no comment
            config.yaml_set_comment_before_after_key('profiler', before='\n')

        with open(path, 'w') as fd:
            yaml.YAML().dump(config, fd)
        pass

    def dump(self, path):
        """
        dump the configuration to the given path
        :param path:
        :return:
        """

        if self.telemetry_id is None:
            self.telemetry_id = uuid.uuid4().hex

        config = dict(
            dataSources=[],
            dbt=None,
            profiler=None,
            telemetry=dict(id=self.telemetry_id)
        )

        d = self.dataSources[0]
        datasource = dict(name=d.name, type=d.type_name)
        if d.args.get('dbt'):
            # dbt project
            config['dbt'] = CommentedMap(d.args.get('dbt'))
        else:
            # non-dbt project
            if d.credential_source == 'config':
                datasource.update(**d.credential)
            config.pop('dbt')
            config['dataSources'].append(datasource)

        template = '''  table:
    # the maximum row count to profile. (Default unlimited)
    limit: 1000000
    duplicateRows: false

'''

        config_yaml = CommentedMap(config)

        config_yaml.yaml_set_comment_before_after_key('profiler', before='\n')
        config_yaml.yaml_set_comment_before_after_key('telemetry', before=template)

        with open(path, 'w') as fd:
            yaml.YAML().dump(config_yaml, fd)

    def dump_credentials(self, path, after_init_config=False):
        """
        dump the credentials to the given path
        :param path:
        :param after_init_config: config file has been written
        :return:
        """
        creds = dict()
        for d in self.dataSources:
            if after_init_config and d.credential_source == 'config':
                continue
            if d.args.get('dbt'):
                continue
            creds[d.name] = dict(type=d.type_name, **d.credential)

        if creds:
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

    def delete_datasource(self, datasource):
        if datasource in self.dataSources:
            self.dataSources.remove(datasource)
