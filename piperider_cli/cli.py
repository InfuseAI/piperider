import os.path
import sys

import click
import sentry_sdk
from rich.console import Console
from rich.syntax import Syntax

from piperider_cli import workspace, __version__

sentry_env = 'development' if __version__.endswith('-dev') else 'production'

sentry_sdk.init(
    "https://41930bf397884adfb2617fe350231439@o1081482.ingest.sentry.io/6463955",
    environment=sentry_env,
    # Set traces_sample_rate to 1.0 to capture 100%
    # of transactions for performance monitoring.
    # We recommend adjusting this value in production.
    traces_sample_rate=1.0
)
sentry_sdk.set_tag("piperider.version", __version__)

debug_option = [
    click.option('--debug', is_flag=True, help='Enable debug mode')
]


def add_options(options):
    def _add_options(func):
        for option in reversed(options):
            func = option(func)
        return func

    return _add_options


@click.group(name="piperider")
def cli():
    pass


@cli.command(short_help='Show the version of piperider')
def version():
    click.echo(__version__)


@cli.command(short_help='Initialize PipeRider configurations')
@click.option('--no-auto-search', type=click.BOOL, default=False, is_flag=True, help="Don't search for dbt projects")
@click.option('--dbt-project-dir', type=click.Path(exists=True), default=None, help='Directory of dbt project config')
@click.option('--dbt-profiles-dir', type=click.Path(exists=True), default=None, help='Directory of dbt profiles config')
@add_options(debug_option)
def init(**kwargs):
    console = Console()
    piperider_config_dir = os.path.join(os.getcwd(), '.piperider')
    # TODO show the process and message to users
    console.print(f'Initialize piperider to path {piperider_config_dir}')

    # Search dbt project config files
    dbt_project_path = None
    dbt_project_dir = kwargs.get('dbt_project_dir')
    dbt_profiles_dir = kwargs.get('dbt_profiles_dir')
    no_auto_search = kwargs.get('no_auto_search')
    if not no_auto_search:
        if dbt_project_dir:
            dbt_project_path = os.path.join(dbt_project_dir, "dbt_project.yml")
        else:
            dbt_project_path = workspace.search_dbt_project_path()

    try:
        if dbt_project_path:
            console.print(f'Use dbt project file: {dbt_project_path}')
        config = workspace.init(dbt_project_path=dbt_project_path, dbt_profiles_dir=dbt_profiles_dir)
        if kwargs.get('debug'):
            for ds in config.dataSources:
                console.rule('Configuration')
                console.print(ds.__dict__)
    except Exception as e:
        if kwargs.get('debug'):
            console.print_exception(show_locals=True)
        else:
            console.print(f'[bold red ]Error:[/bold red] {e}')
        sentry_sdk.capture_exception(e)
        sys.exit(1)

    # Show the content of config.yml
    with open(os.path.join(piperider_config_dir, 'config.yml'), 'r') as f:
        console.rule('.piperider/config.yml')
        config = Syntax(f.read(), "yaml", theme="monokai", line_numbers=True)
        console.print(config)


@cli.command(short_help='Test Configuration')
def debug():
    console = Console()
    console.print('Debugging...')

    console.print(f'[bold dark_orange]PipeRider Version:[/bold dark_orange] {__version__}')

    try:
        if not workspace.debug():
            sys.exit(1)
        return 0
    except Exception as e:
        console.print(f'[bold red]Error:[/bold red] {e}')
        sentry_sdk.capture_exception(e)
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
        sentry_sdk.capture_exception(e)
        sys.exit(1)


@cli.command(short_help='Show report')
@click.option('--input', default=None, type=click.Path(exists=True), help='Path of json report file')
@add_options(debug_option)
def generate_report(**kwargs):
    console = Console()
    input = kwargs.get('input')
    try:
        workspace.generate_report(input=input)
    except Exception as e:
        if (kwargs.get('debug')):
            console.print_exception(show_locals=True)
        else:
            console.print(f'[bold red]Error:[/bold red] {e}')
        sentry_sdk.capture_exception(e)
        sys.exit(1)
    pass


@cli.command(short_help='Compare two existing reports')
@click.option('--base', default=None, type=click.Path(exists=True), help='Path of the base json report file')
@click.option('--input', default=None, type=click.Path(exists=True), help='Path of the json report file to compare')
@add_options(debug_option)
def compare_report(**kwargs):
    console = Console()
    a = kwargs.get('base')
    b = kwargs.get('input')
    try:
        workspace.compare_report(a=a, b=b)
    except Exception as e:
        if (kwargs.get('debug')):
            console.print_exception(show_locals=True)
        else:
            console.print(f'[bold red]Error:[/bold red] {e}')
        sentry_sdk.capture_exception(e)
        sys.exit(1)
    pass
