import os

from jsonschema.exceptions import ValidationError
from rich.console import Console
from rich.syntax import Syntax

from piperider_cli.configuration import FileSystem
from piperider_cli.dbtutil import load_dbt_project
from piperider_cli.error import RecipeException
from piperider_cli.recipes import (RecipeConfiguration,
                                   RecipeDbtField, RecipeModel,
                                   RecipePiperiderField, tool)

console = Console()


def _read_dbt_project_file(dbt_project_path):
    if dbt_project_path is None:
        return None
    try:
        dbt_project = load_dbt_project(dbt_project_path)
    except Exception as e:
        console.print(f'[[bold yellow]Skip[/bold yellow]] dbt project: {e}')
        return None
    return dbt_project


def _prepare_dbt_cmds(options: dict, target: bool = False) -> RecipeDbtField:
    dbt_cmds = ['dbt deps']
    if options.get('skip_datasource_connection'):
        dbt_cmds.append('dbt parse')
    else:
        if target:
            select_and_state_options = '--select state:modified+ --state <DBT_STATE_PATH>'
            dbt_cmds.append(f'dbt build {select_and_state_options}')
        else:
            dbt_cmds.append('dbt build')

    return RecipeDbtField(
        {'commands': dbt_cmds}
    )


def _prepare_piperider_cmd(options: dict) -> RecipePiperiderField:
    piperider_cmd = 'piperider run'
    if options.get('skip_datasource_connection'):
        piperider_cmd += ' --skip-datasource'

    return RecipePiperiderField({
        'command': piperider_cmd
    })


def _create_base_recipe(dbt_project_path=None, options: dict = None) -> RecipeModel:
    """
    Create the base recipe
    """
    base = RecipeModel()

    if tool().git_branch() is not None:
        if options.get('base_ref') is not None:
            if tool().git_branch(options.get('base_ref')) is not None:
                base.ref = options.get('base_ref')
            else:
                ex = RecipeException(f"Cannot find specified base ref: {options.get('base_ref')}")
                ex.hint = f"Please check if the specified ref name '{options.get('base_ref')}' is correct."
                raise ex
        else:
            if tool().git_branch('main') is not None:
                base.ref = 'main'
            elif tool().git_branch('master') is not None:
                base.ref = 'master'
            else:
                ex = RecipeException("Cannot find default 'main' or 'master' branch")
                ex.hint = "Please specify the base branch using the '--base-branch' option."
                raise ex

    dbt_project = _read_dbt_project_file(dbt_project_path)
    if dbt_project:
        base.dbt = _prepare_dbt_cmds(options)

    base.piperider = _prepare_piperider_cmd(options)
    return base


def _create_target_recipe(dbt_project_path=None, options: dict = None) -> RecipeModel:
    """
    Create the target recipe
    """
    target = RecipeModel()

    if tool().git_branch() is not None:
        if options.get('target_ref') is not None:
            if tool().git_branch(options.get('target_ref')) is not None:
                target.ref = options.get('target_ref')
            else:
                ex = RecipeException(f"Cannot find specified base ref: {options.get('target_ref')}")
                ex.hint = f"Please check if the specified ref name '{options.get('target_ref')}' is correct."
                raise ex

    dbt_project = _read_dbt_project_file(dbt_project_path)
    if dbt_project:
        target.dbt = _prepare_dbt_cmds(options, target=True)

    target.piperider = _prepare_piperider_cmd(options)
    return target


def generate_default_recipe(overwrite_existing: bool = False,
                            dbt_project_path=None, options: dict = None, interactive: bool = True):
    """
    Generate the default recipe
    """
    recipe_path = FileSystem.DEFAULT_RECIPE_PATH
    if overwrite_existing is True and os.path.exists(recipe_path):
        if interactive is True:
            console.print('[bold green]Piperider default recipe already exist[/bold green]')
        return None
    base = _create_base_recipe(dbt_project_path, options)
    target = _create_target_recipe(dbt_project_path, options)
    recipe = RecipeConfiguration(base=base, target=target)

    try:
        recipe.validate(recipe.__dict__())
    except ValidationError as e:
        console.print(f'[[bold red]Error[/bold red]] Recipe syntax error: {e}')
        return None
    except Exception as e:
        console.print(f'[[bold red]Error[/bold red]] {e}')
        return None

    return recipe


def show_recipe_content(recipe: RecipeConfiguration):
    """
    Display the recipe content
    """

    yaml_output = Syntax(recipe.dump(), 'yaml', theme='monokai', line_numbers=True)
    console.print(yaml_output)
    console.rule('End of Recipe')


if __name__ == '__main__':
    generate_default_recipe(overwrite_existing=True)
