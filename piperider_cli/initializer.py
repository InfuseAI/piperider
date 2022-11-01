import os

import inquirer
from rich import box
from rich.console import Console
from rich.prompt import Prompt
from rich.syntax import Syntax
from rich.table import Table

from piperider_cli import clone_directory
from piperider_cli.configuration import Configuration, \
    PIPERIDER_WORKSPACE_NAME, \
    PIPERIDER_CONFIG_PATH, \
    PIPERIDER_CREDENTIALS_PATH
from piperider_cli.datasource import DataSource, FANCY_USER_INPUT
from piperider_cli.datasource.survey import UserSurveyMockDataSource
from piperider_cli.error import PipeRiderConfigError


def _is_piperider_workspace_exist(workspace_path: str) -> bool:
    if not os.path.exists(workspace_path):
        return False
    elif not os.path.exists(os.path.join(workspace_path, 'config.yml')):
        return False

    return True


def _generate_piperider_workspace() -> bool:
    from piperider_cli import data
    init_template_dir = os.path.join(os.path.dirname(data.__file__), 'piperider-init-template')
    working_dir = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME)

    if not _is_piperider_workspace_exist(working_dir):
        clone_directory(init_template_dir, working_dir)
        # prepare .gitignore file
        os.rename(os.path.join(working_dir, 'gitignore'), os.path.join(working_dir, '.gitignore'))
        return True
    else:
        # Skip if workspace already exists
        return False


def _ask_user_update_credentials(ds: DataSource):
    console = Console()
    console.print(f'\nPlease enter the following fields for {ds.type_name}')
    return ds.ask_credential()


def _ask_user_input_datasource(config: Configuration = None):
    console = Console()
    if config is None:
        cls, name = DataSource.ask()
        ds: DataSource = cls(name=name)
        config = Configuration([ds])
        if _ask_user_update_credentials(ds):
            _generate_piperider_workspace()
            config.dump(PIPERIDER_CONFIG_PATH)
            config.dump_credentials(PIPERIDER_CREDENTIALS_PATH, after_init_config=True)
    else:
        if len(config.dataSources) == 1:
            ds = config.dataSources[0]
        else:
            ds = config.ask_for_datasource()
        if not ds.credential:
            console.print(
                f'[[bold yellow]Warning[/bold yellow]] No credential found for \'{ds.type_name}\' datasource \'{ds.name}\'')
            if _ask_user_update_credentials(ds):
                config.dump_credentials(PIPERIDER_CREDENTIALS_PATH)

    ds.show_installation_information()
    if isinstance(ds, UserSurveyMockDataSource):
        ds.send_survey()
        return None
    return config


def _inherit_datasource_from_dbt_project(dbt_project_path, dbt_profiles_dir=None,
                                         config: Configuration = None) -> bool:
    config = Configuration.from_dbt_project(dbt_project_path, dbt_profiles_dir)
    _generate_piperider_workspace()
    config.dump(PIPERIDER_CONFIG_PATH)

    return config


def _generate_configuration(dbt_project_path=None, dbt_profiles_dir=None):
    """
    :param dbt_project_path:
    :return: Configuration object
    """
    try:
        config = Configuration.load()
    except PipeRiderConfigError:
        config = None
    except Exception:
        config = None
        console = Console()
        console.print('[[bold yellow]Warning[/bold yellow]] Invalid config.yml')
    if dbt_project_path is None:
        return _ask_user_input_datasource(config=config)

    return _inherit_datasource_from_dbt_project(dbt_project_path, dbt_profiles_dir)


class Initializer():
    @staticmethod
    def exec(dbt_project_path=None, dbt_profiles_dir=None):
        console = Console()
        working_dir = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME)

        if _is_piperider_workspace_exist(working_dir):
            console.print('[bold green]Piperider workspace already exist[/bold green] ')

        # get Configuration object from dbt or user created configuration
        configuration = _generate_configuration(dbt_project_path, dbt_profiles_dir)
        return configuration

    @staticmethod
    def list(report_dir=None):
        console = Console()
        working_dir = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME)

        if _is_piperider_workspace_exist(working_dir):
            config = Configuration.load()
            with open(os.path.join(working_dir, 'config.yml'), 'r') as f:
                yaml_markdown = Syntax(f.read(), "yaml", theme="monokai", line_numbers=True)
                list_table = Table(show_header=True, show_edge=True, box=box.SIMPLE_HEAVY)
                list_table.add_column("Datasource", style="cyan", no_wrap=True)
                list_table.add_column("Name", style="magenta", no_wrap=True)
                list_table.add_column("Source Type", style="blue", no_wrap=True)
                list_table.add_column("Source", style="green", no_wrap=True)
                for ds in config.dataSources:
                    source_type = 'N/A'
                    source = 'N/A'
                    if ds.type_name in ['csv', 'parquet']:
                        source = ds.credential['path']
                        source_type = 'File Path'
                    elif ds.type_name in ['sqlite']:
                        source = ds.credential['dbpath']
                        source_type = 'File Path'
                    elif ds.type_name in ['redshift', 'postgres']:
                        source = ds.credential['dbname']
                        source_type = 'Database'
                    elif ds.type_name in ['snowflake']:
                        source = ds.credential['database']
                        source_type = 'Database'
                    elif ds.type_name in ['bigquery']:
                        source = ds.credential['dataset']
                        source_type = 'Dataset'
                    list_table.add_row(ds.type_name, ds.name, source_type, source)

                layout_table = Table(
                    title='PipeRider Configuration',
                    title_style='bold magenta',
                    show_header=False,
                    show_edge=True,
                    box=box.SIMPLE_HEAVY)
                layout_table.add_column("List")
                layout_table.add_column("Yaml", width=80)
                layout_table.add_row(list_table, yaml_markdown)

            console.print(layout_table)
        else:
            console.print('[bold red]Piperider workspace does not exist[/bold red] ')

    @staticmethod
    def delete(report_dir=None):
        console = Console()

        config = Configuration.load()

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
        config.flush_datasource(PIPERIDER_CONFIG_PATH)
        console.rule('Datasource deleted')

    @staticmethod
    def add(report_dir=None):
        console = Console()
        config = Configuration.load()
        console.rule('Add datasource')
        cls, name = DataSource.ask(exist_datasource=[ds.name for ds in config.dataSources])
        ds: DataSource = cls(name=name)
        config.dataSources.append(ds)
        if _ask_user_update_credentials(ds):
            _generate_piperider_workspace()
            config.flush_datasource(PIPERIDER_CONFIG_PATH)
            config.dump_credentials(PIPERIDER_CREDENTIALS_PATH, after_init_config=True)
            console.rule('Datasource added')
        else:
            console.rule('Abort to add datasource', style='red')
