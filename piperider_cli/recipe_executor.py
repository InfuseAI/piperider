from piperider_cli import dbtutil
from piperider_cli.recipes import select_recipe_file, RecipeConfiguration, execute_configuration, DEFAULT_RECIPE_PATH
from piperider_cli.recipes.default_recipe_generator import generate_default_recipe


class RecipeExecutor():
    @staticmethod
    def exec(recipe_name: str, auto_generate_default_recipe: bool = True):
        recipe_path = select_recipe_file(recipe_name)

        if recipe_path is None:
            if auto_generate_default_recipe:
                dbt_project_path = dbtutil.search_dbt_project_path()

                # generate a default recipe
                generate_default_recipe(dbt_project_path=dbt_project_path)
                recipe_path = DEFAULT_RECIPE_PATH
            else:
                raise ValueError(f"Cannot find the recipe '{recipe_name}'")
        print(recipe_path)
        cfg = RecipeConfiguration.load(recipe_path)
        execute_configuration(cfg)
