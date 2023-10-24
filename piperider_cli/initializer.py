import os

import inquirer
from rich import box
from rich.console import Console
from rich.prompt import Prompt
from rich.syntax import Syntax
from rich.table import Table

from piperider_cli import clone_directory
from piperider_cli.yaml import safe_load_yaml

from piperider_cli.configuration import Configuration, FileSystem
from piperider_cli.datasource import DataSource, FANCY_USER_INPUT
from piperider_cli.datasource.survey import UserSurveyMockDataSource
from piperider_cli.error import PipeRiderConfigError

console = Console()


def _is_piperider_workspace_exist(workspace_path: str) -> bool:
    if not os.path.exists(workspace_path):
        return False
    elif not os.path.exists(os.path.join(workspace_path, 'config.yml')):
        return False

    return True


def _generate_piperider_workspace() -> bool:
    from piperider_cli import data
    init_template_dir = os.path.join(os.path.dirname(data.__file__), 'piperider-init-template')
    working_dir = FileSystem.PIPERIDER_WORKSPACE_PATH

    if not _is_piperider_workspace_exist(working_dir):
        clone_directory(init_template_dir, working_dir)
        # prepare .gitignore file
        os.rename(os.path.join(working_dir, 'gitignore'), os.path.join(working_dir, '.gitignore'))
        return True
    else:
        # Skip if workspace already exists
        return False


def _ask_user_update_credentials(ds: DataSource):
    console.print(f'\nPlease enter the following fields for {ds.type_name}')
    return ds.ask_credential()


def _ask_user_input_datasource(config: Configuration = None):
    if config is None:
        cls, name = DataSource.ask()
        ds: DataSource = cls(name=name)
        config = Configuration([ds])
        if _ask_user_update_credentials(ds):
            _generate_piperider_workspace()
            config.dump(FileSystem.PIPERIDER_CONFIG_PATH)
            config.dump_credentials(FileSystem.PIPERIDER_CREDENTIALS_PATH, after_init_config=True)
    else:
        if len(config.dataSources) == 1:
            ds = config.dataSources[0]
        else:
            ds = config.ask_for_datasource()
        if not ds.credential:
            console.print(
                f'[[bold yellow]Warning[/bold yellow]] No credential found for \'{ds.type_name}\' datasource \'{ds.name}\'')
            if _ask_user_update_credentials(ds):
                config.dump_credentials(FileSystem.PIPERIDER_CREDENTIALS_PATH)

    ds.show_installation_information()
    if isinstance(ds, UserSurveyMockDataSource):
        ds.send_survey()
        return None
    return config


def _inherit_datasource_from_dbt_project(dbt_project_path, dbt_profiles_dir=None, dbt_profile: str = None,
                                         dbt_target: str = None, interactive=True):
    config = safe_load_yaml(FileSystem.PIPERIDER_CONFIG_PATH)
    if config and config.get('dataSources'):
        if interactive is True:
            console.print('[[bold yellow]Warning[/bold yellow]] Found existing configuration. Skip initialization.')
        return config

    dbt_config = Configuration.from_dbt_project(dbt_project_path, dbt_profiles_dir, dbt_profile=dbt_profile,
                                                dbt_target=dbt_target)
    _generate_piperider_workspace()
    dbt_config.dump(FileSystem.PIPERIDER_CONFIG_PATH)

    console.print(f'[[bold green] DBT [/bold green]] Use the existing dbt project file: {dbt_project_path}')

    return dbt_config


def _generate_configuration(dbt_project_path=None, dbt_profiles_dir=None, dbt_profile: str = None,
                            dbt_target: str = None, interactive=True, ):
    """
    :param dbt_project_path:
    :return: Configuration object
    """
    try:
        config = Configuration.instance()
    except PipeRiderConfigError:
        config = None
    except Exception:
        config = None
        console.print('[[bold yellow]Warning[/bold yellow]] Invalid config.yml')

    if dbt_project_path is None:
        # TODO: mark as deprecated in the future
        console.rule('Deprecated', style='bold red')
        console.print(
            'Non-dbt project is deprecated and will be removed in the future. If you have a strong need for non-dbt '
            'project, please contact us by "piperider feedback".\n')
        return _ask_user_input_datasource(config=config)

    if config is not None:
        if interactive:
            console.print('[[bold yellow]Warning[/bold yellow]] Found existing configuration. Skip initialization.')
        return config

    return _inherit_datasource_from_dbt_project(dbt_project_path, dbt_profiles_dir, interactive=interactive,
                                                dbt_profile=dbt_profile,
                                                dbt_target=dbt_target)


class Initializer:
    @staticmethod
    def exec(working_dir=None, dbt_project_path=None, dbt_profiles_dir=None, dbt_profile: str = None,
             dbt_target: str = None, interactive=True, reload: bool = True):
        if working_dir is None:
            working_dir = FileSystem.PIPERIDER_WORKSPACE_PATH

        if _is_piperider_workspace_exist(working_dir) and interactive is True:
            console.print('[bold green]Piperider workspace already exist[/bold green] ')

        # get Configuration object from dbt or user created configuration
        _generate_configuration(dbt_project_path, dbt_profiles_dir, interactive=interactive, dbt_profile=dbt_profile,
                                dbt_target=dbt_target)
        configuration = Configuration.instance(dbt_profile=dbt_profile, dbt_target=dbt_target, reload=reload)
        configuration.activate_report_directory()

        return configuration

    @staticmethod
    def show_config_file():

        # show config.yml
        with open(FileSystem.PIPERIDER_CONFIG_PATH, 'r') as f:
            console.rule('.piperider/config.yml')
            config = Syntax(f.read(), "yaml", theme="monokai", line_numbers=True)
            console.print(config)
            console.rule('End of .piperider/config.yml')

    @staticmethod
    def list(report_dir=None):
        working_dir = FileSystem.PIPERIDER_WORKSPACE_PATH

        if _is_piperider_workspace_exist(working_dir):
            config = Configuration.instance()
            list_table = Table(show_header=True, show_edge=True, box=box.SIMPLE_HEAVY)
            list_table.add_column("Datasource", style="cyan", no_wrap=True)
            list_table.add_column("Description", style="magenta", no_wrap=True)
            for ds in config.dataSources:
                fields = ds.get_display_description().split(', ')
                colored_fields = []
                for f in fields:
                    key = f.split('=')[0]
                    value = f.split('=')[-1]
                    colored_fields.append(f"[bold][blue]{key}[/blue][default]=[/default][green]{value}[/green][/bold]")

                list_table.add_row(ds.name, ', '.join(colored_fields))

            console.print(list_table)
        else:
            console.print('[bold red]Piperider workspace does not exist[/bold red] ')

    @staticmethod
    def delete(report_dir=None):

        config = Configuration.instance()
        if config.dbt:
            console.print('[bold yellow]You have connected with a dbt project. '
                          'Please add datasource in the dbt profile directly. [/bold yellow]')
            return

        if FANCY_USER_INPUT:
            questions = [
                inquirer.List('datasource',
                              message='Which datasource do you want to delete?',
                              choices=[(ds.name, ds) for ds in
                                       config.dataSources]),
                inquirer.Confirm('confirm',
                                 message='Are you sure?')
            ]
            answers = inquirer.prompt(questions)
        else:
            console.print('[[yellow]?[/yellow]] Which datasource do you want to delete?')
            idx = 0
            for ds in config.dataSources:
                console.print(f'    [[green]{idx}[/green]] {ds.name}')
                idx += 1
            answer = Prompt.ask('Please enter the number of delete datasource:', choices=[str(i) for i in range(idx)])
            confirm = Prompt.ask('Are you sure? [y/n]', choices=['y', 'n'], default='N')
            answers = {'datasource': config.dataSources[int(answer)], 'confirm': confirm == 'y'}

        if answers['confirm'] is False:
            console.print('[bold red]Abort to delete datasource[/bold red]')
            return

        config.delete_datasource(answers['datasource'])
        config.flush_datasource(FileSystem.PIPERIDER_CONFIG_PATH)
        console.rule('Datasource deleted')

    @staticmethod
    def add(report_dir=None):
        config = Configuration.instance()
        if config.dbt:
            console.print('[bold yellow]You have connected with a dbt project. '
                          'Please add datasource in the dbt profile directly. [/bold yellow]')
            return
        console.rule('Add datasource')
        cls, name = DataSource.ask(exist_datasource=[ds.name for ds in config.dataSources])
        ds: DataSource = cls(name=name)
        config.dataSources.append(ds)
        if _ask_user_update_credentials(ds):
            _generate_piperider_workspace()
            config.flush_datasource(FileSystem.PIPERIDER_CONFIG_PATH)
            config.dump_credentials(FileSystem.PIPERIDER_CREDENTIALS_PATH, after_init_config=True)
            console.rule('Datasource added')
        else:
            console.rule('Abort to add datasource', style='red')
