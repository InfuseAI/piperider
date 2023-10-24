import os
import sys
from abc import ABCMeta
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List

import jsonschema
from jsonschema.exceptions import ValidationError
from rich.console import Console

import piperider_cli.dbtutil as dbtutil
from piperider_cli import get_run_json_path, load_jinja_template, load_json
from piperider_cli import yaml as pyml
from piperider_cli.configuration import Configuration, FileSystem
from piperider_cli.dbt import dbt_version
from piperider_cli.error import RecipeConfigException
from piperider_cli.event import CompareEventPayload
from piperider_cli.recipes.utils import InteractiveStopException

PIPERIDER_RECIPES_SCHEMA_PATH = os.path.join(os.path.dirname(__file__), 'recipe_schema.json')

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
            data = content.get('command')
            if isinstance(data, pyml.CommentedSeq):
                for c in data:
                    self.commands.append(c)
            else:
                self.commands.append(data)

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
    ref: str = None
    dbt: RecipeDbtField = None
    piperider: RecipePiperiderField = None
    cloud: RecipeCloudField = None
    tmp_dir_path: str = None
    state_path: str = None

    def __init__(self, content: dict = None):
        if content is None:
            return

        # git branch name
        self.ref: str = content.get('branch') if content.get('branch') is not None else content.get('ref')
        if content.get('file') is not None:
            self.file: str = content.get('file')
        self.dbt: RecipeDbtField = RecipeDbtField(content.get('dbt'))
        self.piperider: RecipePiperiderField = RecipePiperiderField(content.get('piperider'))
        self.cloud: RecipeCloudField = RecipeCloudField(content.get('cloud'))

    def __dict__(self):
        d = dict()
        if self.ref:
            d['ref'] = self.ref
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

    def is_ref_specified(self):
        return self.ref is not None

    def is_piperider_commands_specified(self):
        return len(self.piperider.commands) > 0

    def validate_recipe(self):
        # check conflict
        if (self.is_ref_specified() or self.is_piperider_commands_specified()) and self.is_file_specified():
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
            filesystem = Configuration.instance().activate_report_directory()
            return get_run_json_path(filesystem.get_output_dir())
        return self.file


class RecipeConfiguration:
    def __init__(self, base: RecipeModel, target: RecipeModel, auto_generated: bool = True):
        self.base: RecipeModel = base
        self.target: RecipeModel = target
        self.auto_generated: bool = auto_generated

    def __dict__(self):
        return {
            'base': self.base.__dict__(),
            'target': self.target.__dict__()
        }

    def dump(self):
        payload = self.__dict__()
        RecipeConfiguration.validate(payload)
        return pyml.round_trip_dump(payload)

    @staticmethod
    def validate(content: dict = None):
        schema = load_json(PIPERIDER_RECIPES_SCHEMA_PATH)
        jsonschema.validate(content, schema)

    @classmethod
    def load(cls, path: str) -> 'RecipeConfiguration':
        template = load_jinja_template(path)
        try:
            loader = pyml.allow_duplicate_keys_loader()
            content = loader(template.render())
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
            target=target,
            auto_generated=False
        )


def verify_git_dependencies(cfg: RecipeConfiguration):
    if cfg.base.ref is None and cfg.target.ref is None:
        # nobody set the git branch, skip the verification
        return

    tool().ensure_git_ready()


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
    tool().check_dbt_command()


def update_select_with_cli_option(options):
    if options.get('skip_datasource_connection'):
        return ()

    select = options.get('select')
    if select is None or len(select) == 0:
        return 'state:modified+',

    return select


def require_base_state(cfg: RecipeConfiguration):
    if cfg.auto_generated:
        return True

    for cmd in cfg.target.dbt.commands:
        words = cmd.split(' ')
        if '-s' in words and 'state:modified' in words[words.index('-s') + 1]:
            return True
        if '--select' in words and 'state:modified' in words[words.index('--select') + 1]:
            return True

    return False


def replace_commands_dbt_state_path(commands: List[str], dbt_state_path: str):
    if dbt_state_path is None:
        return commands
    return [command.replace('<DBT_STATE_PATH>', dbt_state_path) for command in commands]


def prepare_dbt_manifest(cfg: RecipeConfiguration, options: Dict, recipe_type: str = 'base'):
    if options.get('skip_datasource_connection') and dbt_version >= '1.5':
        # dbt parse will write or return a manifest from 1.5
        execute_dbt_parse_archive(cfg, recipe_type=recipe_type)
    else:
        execute_dbt_compile_archive(cfg, recipe_type=recipe_type)


def prepare_dbt_resources_candidate(cfg: RecipeConfiguration, options: Dict):
    config = Configuration.instance()
    state = None
    select = ()
    if cfg.auto_generated:
        select = update_select_with_cli_option(options)

    if require_base_state(cfg):
        prepare_dbt_manifest(cfg, options, recipe_type='base')
        state = cfg.base.state_path

    if cfg.target.ref is not None:
        prepare_dbt_manifest(cfg, options, recipe_type='target')
        target_path = 'state'
    else:
        execute_dbt_deps(cfg.target)
        if options.get('skip_datasource_connection') and dbt_version >= '1.5':
            execute_dbt_parse(cfg.target)
        else:
            execute_dbt_compile(cfg.target)
        # if global dbt config exists, use global dbt else use the first datasource
        dbt = config.dbt if config.dbt else config.dataSources[0].args.get('dbt')
        dbt_project = dbtutil.load_dbt_project(dbt.get('projectDir'))
        target_path = dbt_project.get('target-path') if dbt_project.get('target-path') else 'target'

    if not cfg.auto_generated:
        return None, state

    if any('state:' in item for item in select):
        console.print(f"Run: \[dbt list] select option '{' '.join(select)}' with state")
        resources = tool().list_dbt_resources(
            target_path, project_dir=cfg.target.tmp_dir_path, select=select, state=state
        )
    elif options.get('skip_datasource_connection'):
        console.print("Skip: \[dbt list] due to the command option '--skip-datasource'")
        resources = []
    else:
        console.print(f"Run: \[dbt list] select option '{' '.join(select)}'")
        resources = tool().list_dbt_resources(target_path, project_dir=cfg.target.tmp_dir_path, select=select)
    console.print()
    return resources, state


def execute_recipe(cfg: RecipeConfiguration, recipe_type='base', debug=False, event_payload=CompareEventPayload()):
    """
    We execute a recipe in the following steps:
    1. run dbt commands
    2. run piperider commands
    """
    if recipe_type == 'target':
        model = cfg.target
    else:
        model = cfg.base

    if model.is_file_specified():
        console.print(f"Select {recipe_type} report: \[{model.file}]")
        return

    # model.dbt.commands
    event_payload.step = f"{recipe_type}:dbt"
    for cmd in model.dbt.commands or []:
        console.print(f"Run: \[{cmd}]")
        exit_code = tool().execute_command_with_showing_output(cmd, model.dbt.envs())
        if debug:
            console.print(f"Exit code: {exit_code}")
        if exit_code != 0:
            console.print(
                f"[bold yellow]Warning: [/bold yellow] Recipe dbt command failed: '{cmd}' with exit code: {exit_code}")
            sys.exit(exit_code)
        console.print()

    # model.piperider.commands
    event_payload.step = f"{recipe_type}:piperider"
    for cmd in model.piperider.commands or []:
        console.print(f"Run: \[{cmd}]")
        exit_code = tool().execute_command_with_showing_output(cmd, model.piperider.envs())
        if debug:
            console.print(f"Exit code: {exit_code}")
        if exit_code != 0:
            console.print(
                f"[bold yellow]Warning: [/bold yellow] Recipe piperider command failed: '{cmd}' with exit code: {exit_code}")
            sys.exit(exit_code)
        console.print()


def calculate_git_ref(cfg: RecipeConfiguration, recipe_type='base'):
    if recipe_type == 'target':
        branch_or_commit = tool().git_rev_parse(cfg.target.ref)
    else:
        diff_target = cfg.target.ref if cfg.target.ref else 'HEAD'
        branch_or_commit = tool().git_merge_base(cfg.base.ref, diff_target) or cfg.base.ref

    if not branch_or_commit:
        raise RecipeConfigException("Git reference is not specified")

    return branch_or_commit


def execute_dbt_parse_archive(cfg: RecipeConfiguration, recipe_type='base'):
    branch_or_commit = calculate_git_ref(cfg, recipe_type)

    if recipe_type == 'target':
        model = cfg.target
    else:
        model = cfg.base

    if model.tmp_dir_path is None:
        model.tmp_dir_path = tool().git_archive(branch_or_commit)
        model.state_path = Path(os.path.join(model.tmp_dir_path, 'state')).as_posix()

    execute_dbt_deps(model, model.tmp_dir_path, Path(FileSystem.DBT_PROFILES_DIR).as_posix())
    execute_dbt_parse(model, model.tmp_dir_path, Path(FileSystem.DBT_PROFILES_DIR).as_posix(), model.state_path)


def execute_dbt_compile_archive(cfg: RecipeConfiguration, recipe_type='base'):
    branch_or_commit = calculate_git_ref(cfg, recipe_type)

    if recipe_type == 'target':
        model = cfg.target
    else:
        model = cfg.base

    if model.tmp_dir_path is None:
        model.tmp_dir_path = tool().git_archive(branch_or_commit)
        model.state_path = Path(os.path.join(model.tmp_dir_path, 'state')).as_posix()

    execute_dbt_deps(model, model.tmp_dir_path, Path(FileSystem.DBT_PROFILES_DIR).as_posix())
    execute_dbt_compile(model, model.tmp_dir_path, Path(FileSystem.DBT_PROFILES_DIR).as_posix(), model.state_path)


def execute_dbt_deps(model: RecipeModel, project_dir: str = None, profiles_dir: str = None):
    console.print("Run: \[dbt deps]")
    cmd = 'dbt deps'
    if project_dir:
        cmd += f' --project-dir {project_dir}'
    if profiles_dir:
        cmd += f' --profiles-dir {profiles_dir}'
    exit_code = tool().execute_command_with_showing_output(cmd.strip(), model.dbt.envs())
    if exit_code != 0:
        console.print(
            f"[bold yellow]Warning: [/bold yellow] Dbt command failed: '{cmd}' with exit code: {exit_code}")
        sys.exit(exit_code)
    console.print()


def execute_dbt_compile(model: RecipeModel, project_dir: str = None, profiles_dir: str = None,
                        target_path: str = None, ):
    console.print("Run: \[dbt compile]")
    cmd = 'dbt compile'
    if project_dir:
        cmd += f' --project-dir {project_dir}'
    if target_path:
        cmd += f' --target-path {target_path}'
    if profiles_dir:
        cmd += f' --profiles-dir {profiles_dir}'
    exit_code = tool().execute_command_with_showing_output(cmd.strip(), model.dbt.envs())
    if exit_code != 0:
        console.print(
            f"[bold yellow]Warning: [/bold yellow] Dbt command failed: '{cmd}' with exit code: {exit_code}")
        sys.exit(exit_code)
    console.print()


def execute_dbt_parse(model: RecipeModel, project_dir: str = None, profiles_dir: str = None, target_path: str = None):
    console.print("Run: \[dbt parse]")
    cmd = 'dbt parse'
    if project_dir:
        cmd += f' --project-dir {project_dir}'
    if target_path:
        cmd += f' --target-path {target_path}'
    if profiles_dir:
        cmd += f' --profiles-dir {profiles_dir}'
    exit_code = tool().execute_command_with_showing_output(cmd.strip(), model.dbt.envs())
    if exit_code != 0:
        console.print(
            f"[bold yellow]Warning: [/bold yellow] Dbt command failed: '{cmd}' with exit code: {exit_code}")
        sys.exit(exit_code)
    console.print()


def execute_recipe_archive(cfg: RecipeConfiguration, recipe_type='base', debug=False,
                           event_payload=CompareEventPayload()):
    """
    We execute a recipe in the following steps:
    1. export the repo with specified commit or branch if needed
    2. run dbt commands
    3. run piperider commands
    """

    if recipe_type == 'target':
        model = cfg.target
    else:
        model = cfg.base

    if model.is_file_specified():
        console.print(f"Select {recipe_type} report: \[{model.file}]")
        return

    # git archive
    event_payload.step = f"{recipe_type}:git-archive"
    diff_target = 'HEAD'
    if recipe_type == 'target':
        branch_or_commit = tool().git_rev_parse(cfg.target.ref)
    else:
        diff_target = cfg.target.ref if cfg.target.ref else 'HEAD'
        branch_or_commit = tool().git_merge_base(cfg.base.ref, diff_target) or cfg.base.ref

    if branch_or_commit:
        if recipe_type == 'target':
            console.print(f"Run: \[git archive] {model.ref}")
        else:
            console.print(f"Run: \[git archive] {model.ref}...{diff_target} = {branch_or_commit}")
        if model.tmp_dir_path is None:
            model.tmp_dir_path = tool().git_archive(branch_or_commit)
        # NOTE: Passing git branch information through environment variables,
        #       as the archived folder does not have a .git folder.
        if tool().git_is_ref_branch(model.ref):
            model.piperider.environments['PIPERIDER_GIT_BRANCH'] = model.ref
        elif model.ref == 'HEAD':
            model.piperider.environments['PIPERIDER_GIT_BRANCH'] = tool().git_current_branch()
        model.piperider.environments['PIPERIDER_GIT_SHA'] = branch_or_commit
        console.print()

    # model.dbt.commands
    event_payload.step = f"{recipe_type}:dbt"
    for cmd in model.dbt.commands or []:
        console.print(f"Run: \[{cmd}]")
        # TODO: handle existing flags in command from recipe
        cmd = f'{cmd} --project-dir {model.tmp_dir_path}' if model.tmp_dir_path else cmd
        exit_code = tool().execute_command_with_showing_output(cmd, model.dbt.envs())
        if debug:
            console.print(f"Exit code: {exit_code}")
        if exit_code != 0:
            console.print(
                f"[bold yellow]Warning: [/bold yellow] Recipe dbt command failed: '{cmd}' with exit code: {exit_code}")
            sys.exit(exit_code)
        console.print()

    # model.piperider.commands
    event_payload.step = f"{recipe_type}:piperider"
    for cmd in model.piperider.commands or []:
        console.print(f"Run: \[{cmd}]")
        cmd = f'{cmd} --dbt-project-dir {model.tmp_dir_path} --dbt-target-path {model.tmp_dir_path}/target' if model.tmp_dir_path else cmd
        exit_code = tool().execute_command_with_showing_output(cmd, model.piperider.envs())
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

    if cfg.base.ref is None and cfg.target.ref is None:
        # We don't care the current branch, because we won't change it
        return None

    original_branch = tool().git_branch()

    return original_branch


def switch_merge_base_branch(a: str, b: str) -> str:
    base_commit = tool().git_merge_base(a, b)
    console.print(f"Switch git branch to: \[merge-base of {a}...{b} -> {base_commit}]")
    tool().git_checkout_to(base_commit)
    return base_commit


def switch_branch(branch_name):
    tool().git_checkout_to(branch_name)


def clean_up(cfg: RecipeConfiguration):
    if cfg.base.tmp_dir_path:
        console.print(f"Clean up base branch git archive: \[{cfg.base.tmp_dir_path}]")
        tool().remove_dir(cfg.base.tmp_dir_path)

    if cfg.target.tmp_dir_path:
        console.print(f"Clean up base branch git archive: \[{cfg.target.tmp_dir_path}]")
        tool().remove_dir(cfg.target.tmp_dir_path)


def execute_recipe_configuration(cfg: RecipeConfiguration, options, debug=False, event_payload=CompareEventPayload()):
    console.rule("Recipe executor: verify execution environments")
    # check the dependencies
    console.print("Check: git")
    verify_git_dependencies(cfg)
    console.print("Check: dbt")
    verify_dbt_dependencies(cfg)

    try:
        console.rule("Recipe executor: prepare execution environments")
        dbt_resources, dbt_state_path = prepare_dbt_resources_candidate(cfg, options)
        if cfg.auto_generated:
            if debug:
                console.print(f'Config: piperider env "PIPERIDER_DBT_RESOURCES" = {dbt_resources}')
            else:
                console.print('Config: piperider env "PIPERIDER_DBT_RESOURCES"')

            cfg.base.piperider.environments['PIPERIDER_DBT_RESOURCES'] = '\n'.join(dbt_resources)
            cfg.target.piperider.environments['PIPERIDER_DBT_RESOURCES'] = '\n'.join(dbt_resources)

        if dbt_state_path:
            cfg.target.dbt.commands = replace_commands_dbt_state_path(cfg.target.dbt.commands, dbt_state_path)

        console.rule("Recipe executor: base phase")
        execute_recipe_archive(cfg, recipe_type='base', debug=debug, event_payload=event_payload)

        console.rule("Recipe executor: target phase")
        if cfg.target.ref:
            execute_recipe_archive(cfg, recipe_type='target', debug=debug, event_payload=event_payload)
        else:
            execute_recipe(cfg, recipe_type='target', debug=debug, event_payload=event_payload)

    except Exception as e:
        if isinstance(e, InteractiveStopException):
            console.rule("Recipe executor: interrupted by the user", style="red")
            sys.exit(0)
        else:
            console.rule("Recipe executor: error occurred", style="red")
            raise e


def select_recipe_file(name: str = None):
    if name is None:
        name = "default"
    recipe_path = os.path.join(FileSystem.PIPERIDER_RECIPES_PATH, f"{name}.yml")
    if not os.path.exists(recipe_path):
        if name == "default":
            return None
        else:
            raise FileNotFoundError(
                f"Recipe file not found: {recipe_path}",
            )

    return recipe_path


@dataclass
class ExecutionFlags:
    dry_run: bool
    interactive: bool


_execution_flags = ExecutionFlags(dry_run=False, interactive=False)


def is_recipe_dry_run():
    global _execution_flags
    return _execution_flags.dry_run


def is_recipe_interactive():
    global _execution_flags
    return _execution_flags.interactive


def configure_recipe_execution_flags(dry_run: bool, interactive: bool):
    global _execution_flags, console
    _execution_flags = ExecutionFlags(dry_run=dry_run is True, interactive=interactive is True)
    if _execution_flags.dry_run:
        console = Console()
        console.original_print = console.print

        def dry_run_print(*objects: Any):
            if objects:
                if isinstance(objects[0], str):
                    console.original_print("\[dry-run]", end=' ')
                console.original_print(*objects)
            else:
                console.original_print()

        console.print = dry_run_print
    else:
        console = Console()

    if is_recipe_dry_run() and is_recipe_interactive():
        console.print("[yellow]Warnings[/yellow]: in dry-run mode, we will ignore --interactive.")


configure_recipe_execution_flags(dry_run=False, interactive=False)


def tool():
    from piperider_cli.recipes.utils import (DryRunRecipeUtils,
                                             InteractiveRecipeDecorator,
                                             RecipeUtils)
    if is_recipe_dry_run():
        return DryRunRecipeUtils(console)
    else:
        if is_recipe_interactive():
            return InteractiveRecipeDecorator(RecipeUtils(console))
        else:
            return RecipeUtils(console)


if __name__ == '__main__':

    test_recipe_path = os.path.join(os.path.dirname(__file__), 'example_recipe.yml')
    try:

        recipe = RecipeConfiguration.load(test_recipe_path)
        console.print(recipe.__dict__())
    except ValidationError as e:
        print(e.message)
    exit(1)
