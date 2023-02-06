import os

from piperider_cli.configuration import PIPERIDER_WORKSPACE_NAME

PIPERIDER_RECIPES_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'compare')
DEFAULT_RECIPE_PATH = os.path.join(PIPERIDER_RECIPES_PATH, "default.yml")


def validate_recipe(recipe):
    # TODO validate it
    pass


def prepare_the_default_recipe():
    if os.path.exists(DEFAULT_RECIPE_PATH):
        validate_recipe(DEFAULT_RECIPE_PATH)
        return

    os.makedirs(PIPERIDER_RECIPES_PATH, exist_ok=True)
    with open(DEFAULT_RECIPE_PATH, "w") as fh:
        # TODO fix the recipe content
        fh.write("""
# .piperider/compare/default.yml
base:
	branch: main
  dbt:
	  commands:
    - dbt build
  piperider:
    # datasource: dev
target:
  dbt:
	  commands:
    - dbt build
  piperider:
    # datasource: dev
        """.strip())
        fh.write("\n")

        # TODO is it possible to get the git default branch main or master?
        # TODO should we show warnings when there is no dbt command ?
        # TODO put the datasource name from the Configuration
