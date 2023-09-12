import abc
import os
import re
import shlex
import subprocess
import tarfile
import tempfile
from pathlib import Path
from subprocess import Popen
from typing import Dict, Tuple

from rich.console import Console

from piperider_cli.configuration import FileSystem
from piperider_cli.dbt.list_task import list_resources_unique_id_from_manifest, load_full_manifest, load_manifest
from piperider_cli.dbtutil import get_dbt_manifest
from piperider_cli.error import PipeRiderError, RecipeException


class AbstractRecipeUtils(metaclass=abc.ABCMeta):
    def __init__(self, console: Console):
        self.console = console

    @abc.abstractmethod
    def execute_command_in_silent(
        self, command_line, env: Dict = None
    ) -> Tuple[str, str, int]:
        """
        Execute command without showing outputs

        the outputs will be collected to the method returns

        :returns: stdout, stderr, exit_code
        """

    @abc.abstractmethod
    def execute_command_with_showing_output(
        self, command_line, env: Dict = None
    ) -> int:
        """
        Execute command and showing outputs

        the outputs will be showing to the terminal

        :returns: exit_code
        """

    @staticmethod
    def dryrun_ignored_execute_command(command_line, env: Dict = None):
        cmd = shlex.split(command_line)
        proc = None
        try:
            proc = Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=env or os.environ.copy(),
                cwd=FileSystem.WORKING_DIRECTORY,
            )
            outs, errs = proc.communicate()
        except KeyboardInterrupt as e:
            print("subprocess interrupted")
            raise e

        except BaseException as e:
            if proc:
                proc.kill()
                outs, errs = proc.communicate()
            else:
                return None, e, 1

        if outs is not None:
            outs = outs.decode().strip()
        if errs is not None:
            errs = errs.decode().strip()
        return outs, errs, proc.returncode

    @staticmethod
    def dryrun_ignored_execute_command_no_outputs(command_line, env: Dict = None):
        cmd = shlex.split(command_line)
        proc = None

        try:
            proc = Popen(cmd, env=env or os.environ.copy(), cwd=FileSystem.WORKING_DIRECTORY)
            proc.communicate()
        except Exception:
            if proc:
                proc.kill()
                proc.communicate()
            else:
                return 1

        return proc.returncode

    def git_branch(self, obj_name: str = 'HEAD'):
        outs, errs, exit_code = self.dryrun_ignored_execute_command(
            f"git rev-parse --abbrev-ref {obj_name}"
        )
        if exit_code != 0:
            return None

        return outs

    def git_rev_parse(self, obj_name: str = 'HEAD'):
        outs, errs, exit_code = self.dryrun_ignored_execute_command(
            f"git rev-parse {obj_name}"
        )
        if exit_code != 0:
            return None

        return outs

    def git_is_ref_branch(self, obj_name: str) -> bool:
        outs, errs, exit_code = self.dryrun_ignored_execute_command(
            f"git show-ref --verify refs/heads/{obj_name}"
        )
        if exit_code != 0:
            return False

        return True

    def git_current_branch(self):
        outs, errs, exit_code = self.dryrun_ignored_execute_command(
            "git branch --show-current"
        )
        if exit_code != 0:
            return None

        return outs

    def git_checkout_to(self, commit_or_branch):
        outs, errs, exit_code = self.execute_command_in_silent(
            f"git checkout {commit_or_branch}"
        )
        if exit_code != 0:
            raise RecipeException(errs)

    def git_merge_base(self, a: str, b: str):
        outs, errs, exit_code = self.dryrun_ignored_execute_command(
            f"git merge-base {a} {b}"
        )
        if exit_code != 0:
            ex = RecipeException(errs)
            if outs == "" and errs == "":
                ex.message = "Empty result from git merge-base"
                ex.hint = 'Please try "git fetch --unshallow" first'
            elif re.match(r"fatal: Not a valid object name (.*)", errs):
                matched = re.match(r"fatal: Not a valid object name (.*)", errs)
                ex.message = f"Invalid git branch: {matched.group(1)}"
                ex.hint = (
                    f"Please check if the base branch name '{matched.group(1)}' is correct in your recipe, "
                    f"or use the '--base-branch' option to specify the branch name for a new auto-generated recipe."
                )
            raise ex
        return outs

    def git_archive(self, commit_or_branch):
        def untar(file_path, extract_dir):
            with tarfile.open(file_path, 'r') as tar:
                tar.extractall(extract_dir)

        tmpdirname = Path(tempfile.mkdtemp())
        tar = (tmpdirname / f'{commit_or_branch}.tar').as_posix()

        outs, errs, exit_code = self.execute_command_in_silent(
            rf'git archive --format=tar --output={tar} {commit_or_branch}'
        )
        print(rf'git archive --format=tar --output={tar} {commit_or_branch}')
        if exit_code != 0:
            raise RecipeException(errs)

        project_dir = (tmpdirname / commit_or_branch).as_posix()
        untar(tar, project_dir)

        return project_dir

    def ensure_git_ready(self):
        outs, errs, exit_code = self.dryrun_ignored_execute_command("git --version")
        if exit_code != 0:
            raise PipeRiderError("git is not installed", hint="Please install it first")

        if "version" not in outs:
            raise RecipeException("Unknown response from git --version")

        outs, errs, exit_code = self.dryrun_ignored_execute_command(
            "git status --porcelain"
        )
        if exit_code != 0 and "not a git repository" in errs:
            raise RecipeException("The working directory is not a git repository.")

    def check_dbt_command(self):
        outs, errs, exit_code = self.dryrun_ignored_execute_command("dbt --version")
        if exit_code != 0:
            raise PipeRiderError("dbt is not installed", hint="Please install it first")

    def list_dbt_resources(self, target_path, project_dir=None, select=None, state=None):
        if state:
            manifest = load_full_manifest(target_path, project_dir=project_dir)
        else:
            manifest = load_manifest(get_dbt_manifest(target_path, project_dir=project_dir))
        return list_resources_unique_id_from_manifest(manifest, select=select, state=state)


class RecipeUtils(AbstractRecipeUtils):
    def execute_command_with_showing_output(self, command_line, env: Dict = None):
        return self.dryrun_ignored_execute_command_no_outputs(command_line, env)

    def execute_command_in_silent(self, command_line, env: Dict = None):
        print("execute_command_in_silent", command_line)
        outs, errs, exit_code = self.dryrun_ignored_execute_command(command_line, env)
        return outs, errs, exit_code


class DryRunRecipeUtils(AbstractRecipeUtils):
    def execute_command_in_silent(self, command_line, env: Dict = None):
        self.console.print(f"[green]:external-command:>[/green] {command_line}")
        return "", "", 0

    def execute_command_with_showing_output(self, command_line, env: Dict = None):
        self.console.print(f"[green]:external-command:>[/green] {command_line}")
        return 0

    def git_archive(self, commit_or_branch):
        cmd = f"git archive --format=tar --output=/path/to/tmp/{commit_or_branch}.tar {commit_or_branch}"
        self.console.print(f"[green]:external-command:>[/green] [default]{cmd}[/default]")
        return '/path/to/tmp'

    def list_dbt_resources(self, target_path, project_dir=None, select=None, state=None):
        state_msg = ''
        if state:
            state_msg = f'state: {state}'
        self.console.print(f"[green]:dbt-resources:>[/green] with select: {''.join(select)} {state_msg}")
        return ['dbt_model1', 'dbt_model2', 'dbt_model3']

    def remove_dir(self, path):
        self.console.print(f"[green]:remove-dir:>[/green] {path}")


class InteractiveStopException(Exception):
    def __init__(self):
        pass


class InteractiveRecipeDecorator(AbstractRecipeUtils):
    def __init__(self, utils: AbstractRecipeUtils):
        self.decoratee = utils

    def execute_command_in_silent(
        self, command_line, env: Dict = None
    ) -> Tuple[str, str, int]:
        # ask user continue
        if self.should_continue(command_line):
            outs, errs, exit_code = self.decoratee.execute_command_in_silent(
                command_line, env
            )
            return outs, errs, exit_code
        raise InteractiveStopException()

    def execute_command_with_showing_output(
        self, command_line, env: Dict = None
    ) -> int:
        # ask user continue
        if self.should_continue(command_line):
            return self.decoratee.execute_command_with_showing_output(command_line, env)
        raise InteractiveStopException()

    @staticmethod
    def should_continue(command_line: str):
        try:
            return InteractiveRecipeDecorator.ask_for_confirmation(command_line)
        except KeyboardInterrupt:
            raise InteractiveStopException()

    @staticmethod
    def ask_for_confirmation(command_line: str):
        from piperider_cli.datasource import FANCY_USER_INPUT

        if FANCY_USER_INPUT:
            import inquirer
            return inquirer.confirm(f"Execute '{command_line}'", default=True)
        else:
            from rich.prompt import Confirm
            return Confirm.ask(f"Execute '{command_line}'")

    def git_archive(self, commit_or_branch) -> str:
        # ask user continue
        cmd = f"git archive --format=tar --output=/path/to/tmp/{commit_or_branch}.tar {commit_or_branch}"
        if self.should_continue(cmd):
            return self.decoratee.git_archive(commit_or_branch)
        raise InteractiveStopException()


if __name__ == "__main__":
    utils = RecipeUtils(Console())
    utils = DryRunRecipeUtils(Console())
    utils.ensure_git_ready()
    utils.git_checkout_to("abc")
