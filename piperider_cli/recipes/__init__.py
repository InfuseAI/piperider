import os
from typing import List

from piperider_cli.configuration import PIPERIDER_WORKSPACE_NAME

PIPERIDER_RECIPES_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'compare')
DEFAULT_RECIPE_PATH = os.path.join(PIPERIDER_RECIPES_PATH, "default.yml")


class RecipeEnv:

    def __init__(self):
        self.name: str = None
        self.value: str = None


class RecipeDbtField:
    def __init__(self):
        self.env: List[RecipeEnv] = []
        self.commands: List[str] = []


class RecipePiperiderField:
    def __init__(self):
        self.env: dict = {}
        self.commands: List[str] = []


class RecipeCloudField:
    def __init__(self):
        self.env: dict = {}
        self.datasource: str = None
        self.report_id: str = None


class RecipeModel:

    def __init__(self):
        # git branch name
        self.branch: str = None
        self.dbt: RecipeDbtField = None
        self.piperider: RecipePiperiderField = None


class RecipeConfiguration:
    def __init__(self, base: RecipeModel, target: RecipeModel):
        self.base: RecipeModel = base
        self.target: RecipeModel = target


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

        # TODO should we show warnings when there is no git repo ?
        # TODO is it possible to get the git default branch main or master?
        # TODO should we show warnings when there is no dbt command ?
        # TODO put the datasource name from the Configuration
