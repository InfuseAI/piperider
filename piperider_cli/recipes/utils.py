import argparse
import os
import shlex
import subprocess
from subprocess import Popen, TimeoutExpired
from typing import Dict


class RecipeException(BaseException):

    def __init__(self, message):
        self.message = message


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
        proc.communicate(timeout=15)
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


def go():
    # print(f"o:{outs}, errs:{errs}, ec: {exit_code}")
    # parser = argparse.ArgumentParser()
    # parser.parse_known_args()
    # print(git_branch())
    git_switch_to("main")
    git_switch_to("-")


if __name__ == '__main__':
    # os.chdir("/tmp")
    go()
