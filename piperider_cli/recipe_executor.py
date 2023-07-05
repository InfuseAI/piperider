import os.path

from rich.console import Console

from piperider_cli.configuration import Configuration
from piperider_cli.error import RecipeConfigException
from piperider_cli.recipes import select_recipe_file, RecipeConfiguration, execute_recipe_configuration
from piperider_cli.recipes.default_recipe_generator import generate_default_recipe, show_recipe_content

console = Console()


class RecipeExecutor:
    @staticmethod
    def exec(recipe_name: str, auto_generate_default_recipe: bool = True, select: tuple = None, modified: bool = False,
             debug=False, base_branch: str = None, target_branch: str = None):
        config = Configuration.instance()
        recipe_path = select_recipe_file(recipe_name)

        if recipe_name and (select or modified is True):
            console.print(
                "[[bold yellow]Warning[/bold yellow]] The recipe will be ignored when --select or --modified is provided."
            )
        if select:
            console.print(
                f"[[bold green]Select[/bold green]] Manually select the dbt nodes to run by '{','.join(select)}'")
        if recipe_path is None or select or modified is True:
            if auto_generate_default_recipe:
                dbt_project_path = None
                if config.dataSources and config.dataSources[0].args.get('dbt'):
                    dbt_project_path = os.path.relpath(config.dataSources[0].args.get('dbt', {}).get('projectDir'))
                # generate a default recipe
                console.rule("Recipe executor: generate recipe")
                options = None
                if select or modified:
                    options = {}
                    options['select'] = select
                    options['modified'] = modified
                    options['base_branch'] = base_branch
                    options['target_branch'] = target_branch
                recipe = generate_default_recipe(overwrite_existing=False,
                                                 dbt_project_path=dbt_project_path,
                                                 options=options)
                if recipe is None:
                    raise RecipeConfigException(
                        message='Default recipe generation failed.',
                        hint='Please provide a recipe file or feedback an issue to us'
                    )
                show_recipe_content(recipe)
            else:
                raise FileNotFoundError(f"Cannot find the recipe '{recipe_name}'")
        else:
            recipe = RecipeConfiguration.load(recipe_path)
        execute_recipe_configuration(recipe, select=select, modified=modified, debug=debug)

        return recipe
