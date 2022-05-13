import os
import shutil

from ruamel.yaml import YAML

yaml = YAML(typ="safe")

PIPERIDER_WORKSPACE_NAME = '.piperider'


def _generate_piperider_workspace():
    from piperider_cli import data
    init_template_dir = os.path.join(os.path.dirname(data.__file__), 'piperider-init-template')
    working_dir = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME)
    shutil.copytree(init_template_dir, working_dir, dirs_exist_ok=True)


def _generate_configuration(dbt_project_path=None):
    if dbt_project_path is None:
        print('TBD: generate configuration without dbt project')
        return
    else:
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
        return


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
    _generate_piperider_workspace()
    _generate_configuration(dbt_project_path=dbt_project_path)
