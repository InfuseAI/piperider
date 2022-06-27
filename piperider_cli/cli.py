import os.path
import re
import sys

import click
import sentry_sdk
from rich.console import Console
from rich.syntax import Syntax

from piperider_cli import workspace, __version__, event
from piperider_cli.event.track import TrackCommand


def set_sentry_env():
    if '.dev' in __version__:
        return 'development'
    elif re.match('^\d+\.\d+\.\d+\.\d{8}[a|b|rc]?.*$', __version__):
        return 'nightly'
    elif 'a' in __version__:
        return 'alpha'
    elif 'b' in __version__:
        return 'beta'
    elif 'rc' in __version__:
        return 'release-candidate'
    return 'production'


sentry_env = set_sentry_env()
release_version = __version__ if sentry_env != 'development' else None

sentry_sdk.init(
    "https://41930bf397884adfb2617fe350231439@o1081482.ingest.sentry.io/6463955",
    environment=sentry_env,
    release=release_version,
    # Set traces_sample_rate to 1.0 to capture 100%
    # of transactions for performance monitoring.
    # We recommend adjusting this value in production.
    traces_sample_rate=1.0
)
sentry_sdk.set_tag("piperider.version", __version__)

event.init()

debug_option = [
    click.option('--debug', is_flag=True, help='Enable debug mode.')
]


def add_options(options):
    def _add_options(func):
        for option in reversed(options):
            func = option(func)
        return func

    return _add_options


@click.group(name="piperider")
def cli():
    'An open-source toolkit for detecting data issues across pipelines that works with CI systems for continuous data quality assessment.'
    pass


cli.command_class = TrackCommand


@cli.command(short_help='Show version information.')
def version():
    'Show version information.'
    click.echo(__version__)


@cli.command(short_help='Initialize a PipeRider project.')
@click.option('--no-auto-search', type=click.BOOL, default=False, is_flag=True,
              help="Disable auto detection of dbt projects.")
@click.option('--dbt-project-dir', type=click.Path(exists=True), default=None,
              help='Directory to search for dbt_project.yml.')
@click.option('--dbt-profiles-dir', type=click.Path(exists=True), default=None,
              help='Directory to search for dbt profiles.yml.')
@add_options(debug_option)
def init(**kwargs):
    'Initialize a PipeRider project in interactive mode. The configurations are saved in ".piperider".'

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

    if dbt_project_path:
        console.print(f'Use dbt project file: {dbt_project_path}')
    else:
        console.print('[[bold yellow]Skip[/bold yellow]] No dbt project found')
    config = workspace.init(dbt_project_path=dbt_project_path, dbt_profiles_dir=dbt_profiles_dir)
    if kwargs.get('debug'):
        for ds in config.dataSources:
            console.rule('Configuration')
            console.print(ds.__dict__)

    # Show the content of config.yml
    with open(os.path.join(piperider_config_dir, 'config.yml'), 'r') as f:
        console.rule('.piperider/config.yml')
        config = Syntax(f.read(), "yaml", theme="monokai", line_numbers=True)
        console.print(config)


@cli.command(short_help='Check project configuration.')
@add_options(debug_option)
def diagnose(**kwargs):
    'Check project configuration, datasource, connections, assertion configuration and dbt manifest.'

    console = Console()
    console.print('Diagnosing...')

    console.print(f'[bold dark_orange]PipeRider Version:[/bold dark_orange] {__version__}')

    if not workspace.debug():
        sys.exit(1)


@cli.command(short_help='Profile data source, run assertions, and generate report(s).')
@click.option('--datasource', default=None, type=click.STRING, help='Datasource to use.', metavar='DATASOURCE_NAME')
@click.option('--table', default=None, type=click.STRING, help='Table to use.', metavar='TABLE_NAME')
@click.option('--output', default=None, type=click.Path(), help='Directory to save the results.')
@click.option('--no-interaction', is_flag=True, help='Disable interactive mode.')
@click.option('--skip-report', is_flag=True, help='Skip generating report.')
@click.option('--skip-recommend', is_flag=True, help='Skip recommending assertions.')
@click.option('--skip-dbt', is_flag=True, help='Skip running dbt.')
@add_options(debug_option)
def run(**kwargs):
    'Profile data source, run assertions, and generate report(s). By default, the raw results and reports are saved in ".piperider/outputs".'

    datasource = kwargs.get('datasource')
    table = kwargs.get('table')
    output = kwargs.get('output')
    skip_report = kwargs.get('skip_report')
    skip_recommend = kwargs.get('skip_recommend')
    skip_dbt = kwargs.get('skip_dbt')
    ret = workspace.run(datasource=datasource,
                        table=table,
                        output=output,
                        interaction=not kwargs.get('no_interaction'),
                        skip_report=skip_report,
                        skip_recommend=skip_recommend,
                        skip_dbt=skip_dbt)
    if not skip_report and ret == 0:
        workspace.generate_report()


@cli.command(short_help='Generate recommended assertions.')
@click.option('--input', default=None, type=click.Path(exists=True), help='Specify the raw result file.')
@add_options(debug_option)
def generate_assertions(**kwargs):
    input = kwargs.get('input')
    workspace.generate_recommended_assertions(input=input)
    pass


@cli.command(short_help='Generate a report.')
@click.option('--input', default=None, type=click.Path(exists=True), help='Specify the raw result file.')
@add_options(debug_option)
def generate_report(**kwargs):
    'Generate a report from the latest raw result or specified result. By default, the raw results are saved in ".piperider/outputs".'

    input = kwargs.get('input')
    workspace.generate_report(input=input)


@cli.command(short_help='Compare two existing reports.')
@click.option('--base', default=None, type=click.Path(exists=True), help='Specify the base report file.')
@click.option('--input', default=None, type=click.Path(exists=True), help='Specify the report file to be compared.')
@add_options(debug_option)
def compare_reports(**kwargs):
    'Compare two existing reports selected in interactive mode or by option.'

    a = kwargs.get('base')
    b = kwargs.get('input')
    workspace.compare_report(a=a, b=b)
