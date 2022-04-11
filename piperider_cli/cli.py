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
@click.option('--keep-ge-workspace', is_flag=True, default=False)
def run(**kwargs):
    # TODO check the args are "stages" files
    # invoke the stage -> piperider_cli.data.execute_great_expectation
    # generate the report file or directory
    stage_inputs: str = kwargs.get('stage')
    keep_ge_workspace: bool = kwargs.get('keep_ge_workspace')

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

    if all_stage_files:
        assertions = os.path.join(os.path.dirname(os.path.abspath(all_stage_files[0])), '../assertions')
        sys.path.append(assertions)

        for f in os.listdir(assertions):
            if f.endswith('.py'):
                module_name = f.split('.py')[0]
                __import__(module_name)

    from piperider_cli.great_expectations.expect_column_values_pass_with_assertion import \
        ExpectColumnValuesPassWithAssertion
    run_stages(all_stage_files, keep_ge_workspace)
