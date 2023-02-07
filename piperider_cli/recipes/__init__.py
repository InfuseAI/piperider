import copy
import os
from abc import ABCMeta
from typing import List, Dict

import jsonschema
from jsonschema.exceptions import ValidationError
from ruamel import yaml

from piperider_cli import round_trip_load_yaml, load_json
from piperider_cli.configuration import PIPERIDER_WORKSPACE_NAME

PIPERIDER_RECIPES_SCHEMA_PATH = os.path.join(os.path.dirname(__file__), 'recipe_schema.json')
PIPERIDER_RECIPES_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'compare')
DEFAULT_RECIPE_PATH = os.path.join(PIPERIDER_RECIPES_PATH, "default.yml")


class RecipeEnv:

    def __init__(self):
        self.name: str = None
        self.value: str = None


class AbstractRecipeField(metaclass=ABCMeta):
    environments: Dict[str, str] = {}
    commands: List[str] = []

    def __init__(self, content: dict = None):
        if content is None:
            return

        self.environments: Dict[str, str] = {e['name']: e['value'] for e in content.get('env', [])}
        self.commands: List[str] = content.get('commands', [])

    def __dict__(self):
        d = dict()
        if self.environments:
            d['env'] = [{'name': k, 'value': v} for k, v in self.environments.items()]
        if self.commands:
            d['commands'] = self.commands
        return d

    def envs(self):
        merged_envs = os.environ.copy()
        for k, v in self.environments.items():
            merged_envs[k] = v
        return merged_envs


class RecipeDbtField(AbstractRecipeField):
    pass


class RecipePiperiderField(AbstractRecipeField):
    pass


class RecipeCloudField(AbstractRecipeField):
    datasource: str = None
    report_id: int = None

    def __init__(self, content: dict = None):
        if content is None:
            return

        self.environments = {e['name']: e['value'] for e in content.get('env', [])}
        self.datasource = content.get('datasource')
        self.report_id = int(content.get('report_id'))

    def __dict__(self):
        return {
            'env': [{'name': k, 'value': v} for k, v in self.environments.items()],
            'datasource': self.datasource,
            'report_id': self.report_id
        }


class RecipeModel:
    branch: str = None
    dbt: RecipeDbtField = None
    piperider: RecipePiperiderField = None
    cloud: RecipeCloudField = None

    def __init__(self, content: dict = None):
        if content is None:
            return

        # git branch name
        self.branch: str = content.get('branch')
        self.dbt: RecipeDbtField = RecipeDbtField(content.get('dbt'))
        self.piperider: RecipePiperiderField = RecipePiperiderField(content.get('piperider'))
        self.cloud: RecipeCloudField = RecipeCloudField(content.get('cloud'))

    def __dict__(self):
        d = dict()
        if self.branch:
            d['branch'] = self.branch
        if self.dbt:
            d['dbt'] = self.dbt.__dict__()
        if self.piperider:
            d['piperider'] = self.piperider.__dict__()
        if self.cloud:
            d['cloud'] = self.cloud.__dict__()
        return d


class RecipeConfiguration:
    def __init__(self, base: RecipeModel, target: RecipeModel):
        self.base: RecipeModel = base
        self.target: RecipeModel = target

    def __dict__(self):
        return {
            'base': self.base.__dict__(),
            'target': self.target.__dict__()
        }

    def dump(self, output_path: str):
        with open(output_path, "w") as fh:
            RecipeConfiguration.validate(self.__dict__())
            yaml.round_trip_dump(self.__dict__(), fh)
        pass

    @staticmethod
    def validate(content: dict = None):
        schema = load_json(PIPERIDER_RECIPES_SCHEMA_PATH)
        jsonschema.validate(content, schema)

    @classmethod
    def load(cls, path: str) -> 'RecipeConfiguration':
        content = round_trip_load_yaml(path)
        if content is None:
            raise Exception("Recipe content is empty")

        cls.validate(content)

        base = RecipeModel(content['base'])
        target = RecipeModel(content['target'])
        return cls(
            base=base,
            target=target
        )


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


def load_hardcode_recipe():
    m = RecipeModel()
    m.branch = "main"
    m.dbt = RecipeDbtField()
    m.dbt.commands = ["dbt deps", "dbt run"]
    m.piperider = RecipePiperiderField()
    m.piperider.commands = ["piperider run --dbt-state target/"]

    base = copy.deepcopy(m)
    target = copy.deepcopy(m)
    target.branch = None
    target.piperider.commands.append("piperider compare-reports --last")

    cfg = RecipeConfiguration(base, target)
    return cfg


def verify_git_dependencies(cfg: RecipeConfiguration):
    if cfg.base.branch is None and cfg.target.branch is None:
        # nobody set the git branch, skip the verification
        return

    # TODO verify the git command
    # TODO verify the branch existing
    # TODO verify the working directory dirty


def verify_dbt_dependencies(cfg: RecipeConfiguration):
    if cfg.base.dbt is None and cfg.target.dbt is None:
        # nobody set the dbt configurations
        return

    # TODO verify the dbt command


def execute_recipe(model: RecipeModel, current_branch):
    """
    We execute a recipe in the following steps:
    1. if there was a branch or current_branch, switch to it
    2. run dbt commands
    3. run piperider commands
    """
    # TODO run all in the model
    working_branch = model.branch or current_branch
    if working_branch is not None:
        switch_branch(working_branch)

    from piperider_cli.recipes.utils import execute_command

    # model.dbt.commands
    for cmd in model.dbt.commands or []:
        print(f"Run: {cmd}")
        exit_code = execute_command(cmd, model.dbt.envs())
        print(f"Exit {exit_code}\n")

    # model.piperider.commands
    for cmd in model.piperider.commands or []:
        print(f"Run: {cmd}")
        exit_code = execute_command(cmd, model.piperider.envs())
        print(f"Exit {exit_code}\n")


def get_current_branch(cfg: RecipeConfiguration):
    """
    Update the effective branch name for cfg and return the original branch before execution
    """

    if cfg.base.branch is None and cfg.target.branch is None:
        # We don't care the current branch, because we won't change it
        return None

    from piperider_cli.recipes.utils import git_branch
    original_branch = git_branch()

    return original_branch


def switch_branch(branch_name):
    from piperider_cli.recipes.utils import git_switch_to
    git_switch_to(branch_name)


def execute(cfg: RecipeConfiguration):
    # check the dependencies
    verify_git_dependencies(cfg)
    verify_dbt_dependencies(cfg)

    current_branch = get_current_branch(cfg)
    execute_recipe(cfg.base, current_branch)
    execute_recipe(cfg.target, current_branch)

    if current_branch is not None:
        # switch back to the original branch
        switch_branch(current_branch)


if __name__ == '__main__':

    test_recipe_path = os.path.join(os.path.dirname(__file__), 'example_recipe.yml')
    try:
        recipe = RecipeConfiguration.load(test_recipe_path)
        print(recipe)
    except ValidationError as e:
        print(e.message)
    exit(1)
