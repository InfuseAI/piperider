import os
from pathlib import Path

from rich.console import Console

from piperider_cli.recipes import DEFAULT_RECIPE_PATH, RecipeConfiguration, RecipeModel, RecipeDbtField, \
    RecipePiperiderField
from piperider_cli.recipes.utils import git_branch

console = Console()


def _create_base_recipe(is_dbt: bool = False) -> RecipeModel:
    """
    Create the base recipe
    """
    base = RecipeModel()

    if git_branch() is not None:
        base.branch = 'main'

    if is_dbt:
        base.dbt = RecipeDbtField({
            'commands': [
                'dbt deps',
                'dbt test'
            ]
        })

    base.piperider = RecipePiperiderField({
        'commands': [
            'piperider run'
        ]
    })
    return base


def _create_target_recipe(is_dbt: bool = False) -> RecipeModel:
    """
    Create the target recipe
    """
    target = RecipeModel()

    current_branch = git_branch()
    if current_branch is not None and current_branch != 'main':
        target.branch = current_branch

    if is_dbt:
        target.dbt = RecipeDbtField({
            'commands': [
                'dbt deps',
                'dbt test'
            ]
        })

    target.piperider = RecipePiperiderField({
        'commands': [
            'piperider run'
        ]
    })
    return target


def generate_default_recipe(is_dbt: bool = False):
    """
    Generate the default recipe
    """
    recipe_path = DEFAULT_RECIPE_PATH
    if os.path.exists(recipe_path):
        console.print('[bold green]Recipe found[/bold green] ')
        return

    console.print('[bold green]Generating default recipe[/bold green] ')

    base = _create_base_recipe(is_dbt)
    target = _create_target_recipe(is_dbt)

    recipe = RecipeConfiguration(base=base, target=target)

    Path(recipe_path).parent.mkdir(parents=True, exist_ok=True)
    recipe.dump(recipe_path)

    console.print('[bold green]Default recipe generated[/bold green] ')


if __name__ == '__main__':
    generate_default_recipe()
