import os
import shlex
import subprocess
from subprocess import Popen, TimeoutExpired
from typing import Dict

from piperider_cli.error import RecipeException


def _execute_command(command_line, env: Dict = None):
    cmd = shlex.split(command_line)
    proc = Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env or os.environ.copy())
    try:
        outs, errs = proc.communicate(timeout=15)
    except TimeoutExpired:
        proc.kill()
        outs, errs = proc.communicate()

    if outs is not None:
        outs = outs.decode().strip()
    if errs is not None:
        errs = errs.decode().strip()
    return outs, errs, proc.returncode


def execute_command_without_capture_output(command_line, env: Dict = None):
    cmd = shlex.split(command_line)
    proc = Popen(cmd, env=env or os.environ.copy())
    try:
        proc.communicate()
    except TimeoutExpired:
        proc.kill()
        proc.communicate()

    return proc.returncode


def git_branch():
    outs, errs, exit_code = _execute_command("git rev-parse --abbrev-ref HEAD")
    if exit_code != 0:
        return None

    return outs


def git_switch_to(branch_name):
    outs, errs, exit_code = _execute_command(f"git switch {branch_name}")
    if exit_code != 0:
        raise RecipeException(errs)


def execute_command(command_line, envs: Dict):
    exit_code = execute_command_without_capture_output(command_line, envs)
    return exit_code


def ensure_git_ready():
    outs, errs, exit_code = _execute_command("git --version")
    if exit_code != 0:
        raise RecipeException(errs)

    if "version" not in outs:
        raise RecipeException("Unknown response from git --version")

    outs, errs, exit_code = _execute_command("git status --porcelain")
    if exit_code != 0 and "not a git repository" in errs:
        raise RecipeException("The working directory is not a git repository.")

    dirty_list = [x for x in outs.split("\n") if not x.strip().startswith("??")]
    dirty_list = [x for x in dirty_list if x]
    if len(dirty_list) != 0:
        raise RecipeException("Working directory is dirty. Stop to run the recipe")


def check_dbt_command():
    outs, errs, exit_code = _execute_command("dbt --version")
    if exit_code != 0:
        raise RecipeException(errs)


if __name__ == '__main__':
    ensure_git_ready()
