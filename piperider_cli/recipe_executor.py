import os.path

from rich.console import Console

from piperider_cli.configuration import Configuration
from piperider_cli.recipes import select_recipe_file, RecipeConfiguration, execute_configuration, DEFAULT_RECIPE_PATH
from piperider_cli.recipes.default_recipe_generator import generate_default_recipe, show_recipe_content

console = Console()


class RecipeExecutor():
    @staticmethod
    def exec(recipe_name: str, auto_generate_default_recipe: bool = True, debug=False):
        recipe_path = select_recipe_file(recipe_name)

        if recipe_path is None:
            if auto_generate_default_recipe:
                config = Configuration.load()
                dbt_project_path = None
                if config.dataSources and config.dataSources[0].args.get('dbt'):
                    dbt_project_path = os.path.relpath(config.dataSources[0].args.get('dbt', {}).get('projectDir'))
                # generate a default recipe
                console.rule("Recipe executor: generate default recipe")
                generate_default_recipe(dbt_project_path=dbt_project_path)
                recipe_path = DEFAULT_RECIPE_PATH
                show_recipe_content(recipe_path)
            else:
                raise FileNotFoundError(f"Cannot find the recipe '{recipe_name}'")
        cfg = RecipeConfiguration.load(recipe_path)
        execute_configuration(cfg, debug=debug)

        return cfg
