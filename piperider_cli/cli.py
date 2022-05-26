import os.path
import sys
from glob import glob

import click
from rich.console import Console
from rich.syntax import Syntax

from piperider_cli import workspace, __version__

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
@click.option('--provider', type=click.Choice(['dbt-local', 'customized']), default='dbt-local',
              help='Select the provider of datasource')
@add_options(debug_option)
def init(**kwargs):
    console = Console()

    piperider_config_dir = os.path.join(os.getcwd(), '.piperider')
    # TODO show the process and message to users
    console.print(f'Initialize piperider to path {piperider_config_dir}')

    dbt_project_path = None
    if kwargs.get('provider') == 'dbt-local':
        pathes = glob(os.path.join(os.getcwd(), '**', 'dbt_project.yml'), recursive=True)
        if pathes:
            dbt_project_path = pathes[0]

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
        has_error = workspace.debug()
        if has_error:
            sys.exit(1)
        return 0
    except Exception as e:
        console.print(f'[bold red]Error:[/bold red] {e}')
        sys.exit(1)


@cli.command(short_help='Collect data profiles and test results')
@click.option('--datasource', default=None)
@click.option('--table', default=None)
@click.option('--output', default=None)
@click.option('--no-interaction', is_flag=True, help='Disable interactive question')
@click.option('--generate-report', is_flag=True, help='Generate report directly')
@add_options(debug_option)
def run(**kwargs):
    console = Console()
    datasource = kwargs.get('datasource')
    table = kwargs.get('table')
    output = kwargs.get('output')
    try:
        workspace.run(datasource=datasource, table=table, output=output, interaction=not kwargs.get('no_interaction'))
        if kwargs.get('generate_report'):
            console.print('\n')
            workspace.generate_report()
    except Exception as e:
        if (kwargs.get('debug')):
            console.print_exception(show_locals=True)
        else:
            console.print(f'[bold red]Error:[/bold red] {e}')
        sys.exit(1)


@cli.command(short_help='Show report')
@click.option('--input', default=None)
@click.option('--base', default=None)
@add_options(debug_option)
def generate_report(**kwargs):
    console = Console()
    input = kwargs.get('input')
    base = kwargs.get('base')
    try:
        workspace.generate_report(input=input, base=base)
    except Exception as e:
        if (kwargs.get('debug')):
            console.print_exception(show_locals=True)
        else:
            console.print(f'[bold red]Error:[/bold red] {e}')
        sys.exit(1)
    pass
