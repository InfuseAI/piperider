import os.path
import sys

import click
from rich.console import Console
from rich.syntax import Syntax

from piperider_cli import workspace, __version__
from piperider_cli.custom_assertion import set_assertion_dir
from piperider_cli.stage_runner import run_stages

debug_option = [
    click.option('--debug', is_flag=True, help='Enable debug mode')
]


def add_options(options):
    def _add_options(func):
        for option in reversed(options):
            func = option(func)
        return func

    return _add_options


@click.group()
def cli():
    pass


@cli.command(short_help='Show the version of piperider-cli')
def version():
    from piperider_cli import __version__
    click.echo(__version__)


@cli.command(short_help='Initialize PipeRider configurations')
@click.option('--provider', type=click.Choice(['dbt-local']), default=None)
@add_options(debug_option)
def init(**kwargs):
    console = Console()

    piperider_config_dir = os.path.join(os.getcwd(), '.piperider')
    # TODO show the process and message to users
    console.print(f'Initialize piperider to path {piperider_config_dir}')

    dbt_project_path = None
    if kwargs.get('provider') == 'dbt-local':
        dbt_project_path = os.path.join(os.getcwd(), 'dbt_project.yml')

    try:
        config = workspace.init(dbt_project_path=dbt_project_path)
        if kwargs.get('debug'):
            for ds in config.dataSources:
                console.rule(f'Configuration')
                console.print(ds.__dict__)
    except Exception as e:
        if kwargs.get('debug'):
            console.print_exception(show_locals=True)
        else:
            console.print(f'[bold red ]Error:[/bold red] {e}')
        sys.exit(1)

    # Show the content of config.yml
    with open(os.path.join(piperider_config_dir, 'config.yml'), 'r') as f:
        console.rule(f'.piperider/config.yml')
        config = Syntax(f.read(), "yaml", theme="monokai", line_numbers=True)
        console.print(config)


@cli.command(short_help='Test Configuration')
def debug():
    console = Console()
    console.print(f'Debugging...')

    console.print(f'[bold dark_orange]PipeRider Version:[/bold dark_orange] {__version__}')

    try:
        if not workspace.debug():
            return 1
        return 0
    except Exception as e:
        console.print(f'[bold red]Error:[/bold red] {e}')
        sys.exit(1)


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
