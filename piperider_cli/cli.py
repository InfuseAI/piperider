import os.path
import sys

import click

from piperider_cli import workspace
from piperider_cli.stage_runner import run_stages


@click.group()
def cli():
    pass


@cli.command()
def init():
    # TODO show the process and message to users
    click.echo(f'Initialize piperider to path {os.getcwd()}/piperider')
    workspace.init()


@cli.command()
@click.option('--stage', help='stage file')
def run(**kwargs):
    # TODO check the args are "stages" files
    # invoke the stage -> piperider_cli.data.execute_great_expectation
    # generate the report file or directory
    stage_inputs: str = kwargs.get('stage', '')

    if stage_inputs is None:
        click.echo(f'--stage is required')
        sys.exit(1)

    if os.path.isdir(stage_inputs):
        all_stage_files = []
        for yaml_file in os.listdir(stage_inputs):
            if yaml_file.endswith('.yaml') or yaml_file.endswith('.yml'):
                all_stage_files.append(os.path.abspath(os.path.join(stage_inputs, yaml_file)))
    elif not os.path.exists(stage_inputs):
        click.echo(f'Cannot find the stage file: {stage_inputs}')
        sys.exit(1)
    else:
        all_stage_files = [os.path.abspath(stage_inputs)]

    run_stages(all_stage_files)
