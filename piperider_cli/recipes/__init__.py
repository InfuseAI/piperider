import os
import sys
from abc import ABCMeta
from typing import Dict, List

import jsonschema
from jsonschema.exceptions import ValidationError
from rich.console import Console
from ruamel import yaml

from piperider_cli import load_json, load_jinja_template, get_run_json_path
from piperider_cli.configuration import PIPERIDER_WORKSPACE_NAME
from piperider_cli.error import RecipeConfigException
from piperider_cli.filesystem import FileSystem
from piperider_cli.recipes.utils import git_checkout_to

PIPERIDER_RECIPES_SCHEMA_PATH = os.path.join(os.path.dirname(__file__), 'recipe_schema.json')
PIPERIDER_RECIPES_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'compare')
DEFAULT_RECIPE_PATH = os.path.join(PIPERIDER_RECIPES_PATH, "default.yml")

console = Console()


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

        if content.get('command'):
            self.commands.append(content.get('command'))

    def __dict__(self):
        d = dict()
        if self.environments:
            d['env'] = [{'name': k, 'value': v} for k, v in self.environments.items()]
        if len(self.commands) == 1:
            d['command'] = self.commands[0]
        elif self.commands:
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
        if content.get('file') is not None:
            self.file: str = content.get('file')
        self.dbt: RecipeDbtField = RecipeDbtField(content.get('dbt'))
        self.piperider: RecipePiperiderField = RecipePiperiderField(content.get('piperider'))
        self.cloud: RecipeCloudField = RecipeCloudField(content.get('cloud'))

    def __dict__(self):
        d = dict()
        if self.branch:
            d['branch'] = self.branch
        if self.is_file_specified():
            d['file'] = self.file
        if self.dbt:
            d['dbt'] = self.dbt.__dict__()
        if self.piperider:
            d['piperider'] = self.piperider.__dict__()
        if self.cloud:
            d['cloud'] = self.cloud.__dict__()
        return d

    def is_file_specified(self):
        return hasattr(self, 'file')

    def is_branch_specified(self):
        return self.branch is not None

    def is_piperider_commands_specified(self):
        return len(self.piperider.commands) > 0

    def validate_recipe(self):
        # check conflict
        if (self.is_branch_specified() or self.is_piperider_commands_specified()) and self.is_file_specified():
            raise RecipeConfigException(
                message="Both 'file' and 'branch/piperider commands' are specified.",
                hint="Please modify the recipe file to use either 'file' or 'branch/piperider commands'.")

        # check no action
        if not self.is_file_specified() and not self.is_piperider_commands_specified():
            raise RecipeConfigException(
                message="No 'file' and 'piperider commands' are given.",
                hint="Please modify the recipe file to use either 'file' or 'piperider commands.'")

        # check file existence
        if self.is_file_specified():
            if not os.path.isfile(self.file):
                raise RecipeConfigException(
                    message=f"File '{self.file}' does not exist.",
                    hint="Please modify the recipe file to use the correct file path.")

    def get_run_report(self):
        if not self.is_file_specified():
            filesystem = FileSystem()
            return get_run_json_path(filesystem.get_output_dir())
        return self.file


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
            payload = self.__dict__()
            RecipeConfiguration.validate(payload)
            yaml.round_trip_dump(payload, fh)

    @staticmethod
    def validate(content: dict = None):
        schema = load_json(PIPERIDER_RECIPES_SCHEMA_PATH)
        jsonschema.validate(content, schema)

    @classmethod
    def load(cls, path: str) -> 'RecipeConfiguration':
        template = load_jinja_template(path)
        try:
            yml = yaml.YAML()
            yml.allow_duplicate_keys = True
            content = yml.load(template.render())
        except Exception:
            raise

        if content is None:
            raise Exception("Recipe content is empty")

        cls.validate(content)

        base = RecipeModel(content['base'])
        target = RecipeModel(content['target'])

        base.validate_recipe()
        target.validate_recipe()

        return cls(
            base=base,
            target=target
        )


def verify_git_dependencies(cfg: RecipeConfiguration):
    if cfg.base.branch is None and cfg.target.branch is None:
        # nobody set the git branch, skip the verification
        return

    from piperider_cli.recipes.utils import ensure_git_ready
    ensure_git_ready()


def verify_dbt_dependencies(cfg: RecipeConfiguration):
    if len(cfg.base.dbt.commands) == 0 and len(cfg.target.dbt.commands) == 0:
        # nobody set the dbt configurations
        return

    def test_dbt_by_deps():
        try:
            import dbt
            dbt.__path__
            return True
        except Exception:
            return False

    if test_dbt_by_deps():
        return

    # check the dbt by executing it
    from piperider_cli.recipes.utils import check_dbt_command
    check_dbt_command()


def execute_recipe(model: RecipeModel, current_branch, debug=False, recipe_type='base'):
    """
    We execute a recipe in the following steps:
    1. if there was a branch or current_branch, switch to it
    2. run dbt commands
    3. run piperider commands
    """

    if model.is_file_specified():
        console.print(f"Select {recipe_type} report: \[{model.file}]")
        return

    if recipe_type == 'base':
        a_branch = model.branch
        b_branch = current_branch
        if a_branch != b_branch:
            commit_hash = switch_merge_base_branch(a_branch, b_branch)
            console.print(f"Switch git branch to: \[merge-base of {a_branch}...{b_branch} -> {commit_hash}]")
    else:
        working_branch = model.branch or current_branch
        if working_branch is not None:
            console.print(f"Switch git branch to: \[{working_branch}]")
            switch_branch(working_branch)

    from piperider_cli.recipes.utils import execute_command

    # model.dbt.commands
    for cmd in model.dbt.commands or []:
        console.print(f"Run: \[{cmd}]")
        exit_code = execute_command(cmd, model.dbt.envs())
        if debug:
            console.print(f"Exit code: {exit_code}")
        if exit_code != 0:
            console.print(
                f"[bold yellow]Warning: [/bold yellow] Recipe dbt command failed: '{cmd}' with exit code: {exit_code}")
            sys.exit(exit_code)
        console.print()

    # model.piperider.commands
    for cmd in model.piperider.commands or []:
        console.print(f"Run: \[{cmd}]")
        exit_code = execute_command(cmd, model.piperider.envs())
        if debug:
            console.print(f"Exit code: {exit_code}")
        if exit_code != 0:
            console.print(
                f"[bold yellow]Warning: [/bold yellow] Recipe piperider command failed: '{cmd}' with exit code: {exit_code}")
            sys.exit(exit_code)
        console.print()


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


def switch_merge_base_branch(a: str, b: str) -> str:
    from piperider_cli.recipes.utils import git_checkout_to, git_merge_base
    base_commit = git_merge_base(a, b)
    git_checkout_to(base_commit)
    return base_commit


def switch_branch(branch_name):
    from piperider_cli.recipes.utils import git_switch_to
    git_checkout_to(branch_name)


def execute_configuration(cfg: RecipeConfiguration, debug=False):
    console.rule("Recipe executor: verify execution environments")
    # check the dependencies
    console.print("Check: git")
    verify_git_dependencies(cfg)
    console.print("Check: dbt")
    verify_dbt_dependencies(cfg)

    current_branch = get_current_branch(cfg)

    try:
        console.rule("Recipe executor: base phase")
        target_branch = cfg.target.branch or current_branch
        execute_recipe(cfg.base, target_branch, recipe_type='base', debug=debug)

        console.rule("Recipe executor: target phase")
        execute_recipe(cfg.target, current_branch, recipe_type='target', debug=debug)
    except Exception as e:
        console.rule("Recipe executor: error occurred", style="red")
        raise e
    finally:
        if current_branch is not None:
            # switch back to the original branch
            console.print(f"Switch git branch back to: \[{current_branch}]")
            switch_branch(current_branch)


def select_recipe_file(name: str = None):
    if name is None:
        name = "default"

    recipe_path = os.path.join(PIPERIDER_RECIPES_PATH, f"{name}.yml")
    if not os.path.exists(recipe_path):
        if name == "default":
            return None
        else:
            raise FileNotFoundError(
                f"Recipe file not found: {recipe_path}",
            )

    return recipe_path


if __name__ == '__main__':

    test_recipe_path = os.path.join(os.path.dirname(__file__), 'example_recipe.yml')
    try:

        recipe = RecipeConfiguration.load(test_recipe_path)
        console.print(recipe.__dict__())
    except ValidationError as e:
        print(e.message)
    exit(1)
