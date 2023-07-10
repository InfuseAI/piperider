import os

from jsonschema.exceptions import ValidationError
from rich.console import Console
from rich.syntax import Syntax

from piperider_cli.configuration import FileSystem
from piperider_cli.dbtutil import load_dbt_project
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


def _create_base_recipe(dbt_project_path=None, options: dict = None) -> RecipeModel:
    """
    Create the base recipe
    """
    base = RecipeModel()

    if tool().git_branch() is not None:
        base.branch = options.get('base_branch', 'main') if options else 'main'

    dbt_project = _read_dbt_project_file(dbt_project_path)
    if dbt_project:
        base.dbt = RecipeDbtField({
            'commands': [
                'dbt deps',
                'dbt build'
            ]
        })

    base.piperider = RecipePiperiderField({
        'command': 'piperider run',
    })
    return base


def _create_target_recipe(dbt_project_path=None, options: dict = None) -> RecipeModel:
    """
    Create the target recipe
    """
    target = RecipeModel()

    dbt_project = _read_dbt_project_file(dbt_project_path)
    if dbt_project:
        target.dbt = RecipeDbtField({
            'commands': [
                'dbt deps',
                'dbt build',
            ]
        })

    target.piperider = RecipePiperiderField({
        'command': 'piperider run',
    })
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
