import os.path
import sys

import click
from glob import glob
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
@click.option('--provider', type=click.Choice(['dbt-local']), default=None)
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
        if not workspace.debug():
            return 1
        return 0
    except Exception as e:
        console.print(f'[bold red]Error:[/bold red] {e}')
        sys.exit(1)


@cli.command(short_help='Run')
@click.option('--datasource', default=None)
@click.option('--table', default=None)
@click.option('--output', default=None)
def run(**kwargs):
    datasource = kwargs.get('datasource')
    table = kwargs.get('table')
    output = kwargs.get('output')
    workspace.run(datasource=datasource, table=table, output=output)
