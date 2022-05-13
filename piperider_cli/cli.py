import os.path
import sys

import click
from rich.console import Console
from rich.syntax import Syntax

from piperider_cli import workspace
from piperider_cli.custom_assertion import set_assertion_dir
from piperider_cli.stage_runner import run_stages


@click.group()
def cli():
    pass


@cli.command(short_help='Initialize PipeRider configurations')
@click.option('--provider', type=click.Choice(['dbt-local']), default=None)
def init(**kwargs):
    # TODO show the process and message to users
    click.echo(f'Initialize piperider to path {os.getcwd()}/.piperider')

    dbt_project_path = None
    if kwargs.get('provider') == 'dbt-local':
        dbt_project_path = os.path.join(os.getcwd(), 'dbt_project.yml')

    workspace.init(dbt_project_path=dbt_project_path)


@cli.command(short_help='Test Configuration')
def debug():
    console = Console()
    console.print(f'Debugging...')

    for file in os.listdir('stages'):
        console.rule(f'[bold green] {file}')
        with open(os.path.join('stages', file), "r") as fd:
            content = fd.read()
            syntax = Syntax(content, 'yaml', theme='monokai',
                            line_numbers=True)
            console.print(syntax)
    pass


@cli.command(short_help='Run stages')
@click.argument('stages', nargs=-1)
@click.option('--report-dir', default=os.getcwd())
@click.option('--keep-ge-workspace', is_flag=True, default=False)
@click.option('--local-report', is_flag=True, default=True)
@click.option('--metadata', '-m', multiple=True)
def run(stages, **kwargs):
    # TODO check the args are "stages" files
    # invoke the stage -> piperider_cli.data.execute_great_expectation
    # generate the report file or directory
    keep_ge_workspace: bool = kwargs.get('keep_ge_workspace')
    generate_local_report: bool = kwargs.get('local_report')
    os.environ['PIPERIDER_REPORT_DIR'] = kwargs.get('report_dir')
    if os.path.isfile(kwargs.get('report_dir')):
        click.echo(f'report-dir cannot be a file')
        sys.exit(1)
    os.makedirs(kwargs.get('report_dir'), exist_ok=True)

    if not stages:
        click.echo(f'stage file is required')
        sys.exit(1)

    for stage in stages:
        if not os.path.exists(stage):
            click.echo(f'Cannot find the stage file: {stage}')
            sys.exit(1)

    stages = list(map(os.path.abspath, stages))
    assertions = os.path.join(os.path.dirname(
        os.path.abspath(stages[0])), '../assertions')
    if os.path.exists(assertions):
        sys.path.append(assertions)
        set_assertion_dir(assertions)

        for f in os.listdir(assertions):
            if f.endswith('.py'):
                module_name = f.split('.py')[0]
                __import__(module_name)

    # noinspection PyUnresolvedReferences
    from piperider_cli.great_expectations.expect_column_values_pass_with_assertion import \
        ExpectColumnValuesPassWithAssertion
    run_stages(stages, keep_ge_workspace, generate_local_report, kwargs)
