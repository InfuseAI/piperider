import os
import shutil

from ruamel.yaml import YAML

yaml = YAML(typ="safe")
PIPERIDER_WORKSPACE_NAME = '.piperider'


class Configuration(object):
    """
    Configuration represents the config file in the piperider project
    at $PROJECT_ROOT./piperider/config.yml
    """

    def __init__(self):
        pass

    @classmethod
    def from_dbt_profile(cls, dbt_profile_path):
        """
        build configuration from the existing dbt profile

        :param dbt_profile_path:
        :return:
        """
        # TODO create configuration from dbt profile
        raise NotImplemented

    @classmethod
    def load(cls):
        """
        load from the existing configuration

        :return:
        """
        raise NotImplemented

    def to_sqlalchemy_config(self, datasource_name):
        # TODO we will convert a data source to a sqlalchemy parameters
        raise NotImplemented


def _generate_piperider_workspace():
    from piperider_cli import data
    init_template_dir = os.path.join(os.path.dirname(data.__file__), 'piperider-init-template')
    working_dir = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME)
    shutil.copytree(init_template_dir, working_dir, dirs_exist_ok=True)


def _ask_user_for_datasource():
    # TODO: ask the user for datasource
    # we only support snowfalke and pg only
    # we might consider a sqlite for dev mode?
    raise NotImplemented
    # return Configuration()


def _generate_configuration(dbt_project_path=None):
    """
    :param dbt_project_path:
    :return: Configuration object
    """
    if dbt_project_path is None:
        return _ask_user_for_datasource();

    # TODO move datssource extracting to the Configuration.from_dbt_profile
    dbt_profile_path = os.path.join(os.path.expanduser('~'), '.dbt/profiles.yml')
    profile_name, target_name, type_name = _dbt_project_parser(dbt_project_path, dbt_profile_path)
    config = dict({
        'dataSources': [
            {
                'name': profile_name,
                'type': type_name,
                'dbt': {
                    'project': profile_name,
                    'target': target_name,
                    'profile': dbt_profile_path
                }
            }
        ]
    })
    piperider_config_path = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'config.yml')
    with open(piperider_config_path, 'w') as fd:
        yaml.dump(config, fd)

    # TODO return config object
    return Configuration.from_dbt_profile(dbt_profile_path)


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

    except Exception as e:
        print(e)
        return False


def debug(configuration=None):
    if not configuration:
        configuration = Configuration.load()
    # TODO debug with configuration
    # test configuration format
    # test connection working
    raise NotImplemented


def run():
    configuration = Configuration.load()
    # TODO ....


def generateReport():
    raise NotImplemented
