import os.path
import sys

import click
import sentry_sdk
from rich.console import Console
from rich.syntax import Syntax

from piperider_cli import __version__, sentry_dns, sentry_env, event
from piperider_cli.adapter import DbtAdapter
from piperider_cli.assertion_generator import AssertionGenerator
from piperider_cli.cloud_connector import CloudConnector
from piperider_cli.compare_report import CompareReport
from piperider_cli.event.track import TrackCommand, BetaGroup
from piperider_cli.feedback import Feedback
from piperider_cli.generate_report import GenerateReport
from piperider_cli.guide import Guide
from piperider_cli.initializer import Initializer
from piperider_cli.runner import Runner
from piperider_cli.validator import Validator

release_version = __version__ if sentry_env != 'development' else None

sentry_sdk.init(
    sentry_dns,
    environment=sentry_env,
    release=release_version,
    # Set traces_sample_rate to 1.0 to capture 100%
    # of transactions for performance monitoring.
    # We recommend adjusting this value in production.
    traces_sample_rate=1.0
)
sentry_sdk.set_tag("piperider.version", __version__)
sentry_sdk.set_tag("platform", sys.platform)

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


@click.group(name="piperider", invoke_without_command=True)
@click.pass_context
def cli(ctx: click.Context):
    'An open-source toolkit for detecting data issues across pipelines that works with CI systems for continuous data quality assessment.'
    if ctx.invoked_subcommand is None:
        click.echo(ctx.get_help())
        Guide().show_tips(ctx.command.name)


# It works after click>=8
cli.command_class = TrackCommand


@cli.command(short_help='Show version information.', cls=TrackCommand)
def version():
    'Show version information.'
    console = Console()
    console.print(__version__)

    if 'production' == sentry_env:
        return

    from piperider_cli import data
    commit_file = os.path.abspath(os.path.join(os.path.dirname(data.__file__), 'COMMIT'))
    try:
        with open(commit_file) as fh:
            commit_sha = fh.read().strip()
            console.print(f'GitCommit: {commit_sha}')
    except Exception:
        pass


@cli.command(short_help='Send your feedback to help us improve the PipeRider.', cls=TrackCommand)
def feedback():
    'Send your feedback to help us improve the PipeRider.'
    Feedback.exec()


@cli.command(short_help='Initialize a PipeRider project.', cls=TrackCommand)
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
            dbt_project_path = DbtAdapter.search_dbt_project_path()

    if dbt_project_path:
        console.print(f'[[bold green] DBT [/bold green]] Use the existing dbt project file: {dbt_project_path}')

    config = Initializer.exec(dbt_project_path=dbt_project_path, dbt_profiles_dir=dbt_profiles_dir)
    if kwargs.get('debug'):
        for ds in config.dataSources:
            console.rule('Configuration')
            console.print(ds.__dict__)
    if config is None:
        sys.exit(1)

    # Show the content of config.yml
    with open(os.path.join(piperider_config_dir, 'config.yml'), 'r') as f:
        console.rule('.piperider/config.yml')
        config = Syntax(f.read(), "yaml", theme="monokai", line_numbers=True)
        console.print(config)


@cli.command(short_help='Check project configuration.', cls=TrackCommand)
@add_options(debug_option)
def diagnose(**kwargs):
    'Check project configuration, datasource, connections, and assertion configuration.'

    console = Console()
    console.print('Diagnosing...')

    console.print(f'[bold dark_orange]PipeRider Version:[/bold dark_orange] {__version__}')

    if not Validator.diagnose():
        sys.exit(1)


@cli.command(short_help='Profile data source, run assertions, and generate report(s).', cls=TrackCommand)
@click.option('--datasource', default=None, type=click.STRING, help='Datasource to use.', metavar='DATASOURCE_NAME')
@click.option('--table', default=None, type=click.STRING, help='Table to use.', metavar='TABLE_NAME')
@click.option('--output', '-o', default=None, type=click.STRING, help='Directory to save the results.')
@click.option('--no-interaction', is_flag=True, help='Disable interactive mode.')
@click.option('--skip-report', is_flag=True, help='Skip generating report.')
@click.option('--skip-recommend', is_flag=True, help='Skip recommending assertions.')
@click.option('--dbt-test', is_flag=True, help='Run dbt test.')
@click.option('--dbt-build', is_flag=True, help='Run dbt build.')
@click.option('--report-dir', default=None, type=click.STRING, help='Use a different report directory.')
@add_options(debug_option)
def run(**kwargs):
    'Profile data source, run assertions, and generate report(s). By default, the raw results and reports are saved in ".piperider/outputs".'

    datasource = kwargs.get('datasource')
    table = kwargs.get('table')
    output = kwargs.get('output')
    skip_report = kwargs.get('skip_report')
    skip_recommend = kwargs.get('skip_recommend')
    run_dbt_test = kwargs.get('dbt_test')
    run_dbt_build = kwargs.get('dbt_build')
    dbt_command = 'build' if run_dbt_build else 'test' if run_dbt_test else ''
    ret = Runner.exec(datasource=datasource,
                      table=table,
                      output=output,
                      interaction=not kwargs.get('no_interaction'),
                      skip_report=skip_report,
                      skip_recommend=skip_recommend,
                      dbt_command=dbt_command,
                      report_dir=kwargs.get('report_dir'))
    if not skip_report and ret == 0:
        GenerateReport.exec(None, kwargs.get('report_dir'), output)
    return ret


@cli.command(short_help='Generate recommended assertions.', cls=TrackCommand)
@click.option('--input', default=None, type=click.Path(exists=True), help='Specify the raw result file.')
@click.option('--report-dir', default=None, type=click.STRING, help='Use a different report directory.')
@add_options(debug_option)
def generate_assertions(**kwargs):
    'Generate recommended assertions based on the latest result. By default, the profiling result will be loaded from ".piperider/outputs".'
    input = kwargs.get('input')
    AssertionGenerator.exec(input=input, report_dir=kwargs.get('report_dir'))


@cli.command(short_help='Generate a report.', cls=TrackCommand)
@click.option('--input', default=None, type=click.Path(exists=True), help='Specify the raw result file.')
@click.option('--output', '-o', default=None, type=click.STRING, help='Directory to save the results.')
@click.option('--report-dir', default=None, type=click.STRING, help='Use a different report directory.')
@add_options(debug_option)
def generate_report(**kwargs):
    'Generate a report from the latest raw result or specified result. By default, the raw results are saved in ".piperider/outputs".'
    GenerateReport.exec(input=kwargs.get('input'), report_dir=kwargs.get('report_dir'), output=kwargs.get('output'))


@cli.command(short_help='Compare two existing reports.', cls=TrackCommand)
@click.option('--base', default=None, type=click.Path(exists=True), help='Specify the base report file.')
@click.option('--target', default=None, type=click.Path(exists=True), help='Specify the report file to be compared.')
@click.option('--last', default=None, is_flag=True, help='Compare the last two reports.')
@click.option('--datasource', default=None, type=click.STRING, metavar='DATASOURCE_NAME',
              help='Specify the datasource.')
@click.option('--output', '-o', default=None, type=click.STRING, help='Directory to save the results.')
@click.option('--report-dir', default=None, type=click.STRING, help='Use a different report directory.')
@add_options(debug_option)
def compare_reports(**kwargs):
    'Compare two existing reports selected in interactive mode or by option.'

    a = kwargs.get('base')
    b = kwargs.get('target')
    last = kwargs.get('last')
    datasource = kwargs.get('datasource')
    CompareReport.exec(a=a, b=b, last=last, datasource=datasource,
                       report_dir=kwargs.get('report_dir'), output=kwargs.get('output'),
                       debug=kwargs.get('debug', False))


@cli.group('cloud', short_help='Manage PipeRider Cloud', cls=BetaGroup)
def cloud(**kwargs):
    # Manage PipeRider Cloud.
    pass


@cloud.command(short_help='Upload a report to the PipeRider Cloud.', beta=True, cls=TrackCommand)
@click.option('--run', type=click.Path(exists=True), help='Specify the raw result file.')
@click.option('--report-dir', default=None, type=click.STRING, help='Use a different report directory.')
@click.option('--datasource', default=None, type=click.STRING, metavar='DATASOURCE_NAME',
              help='Specify the datasource.')
@add_options(debug_option)
def upload_report(**kwargs):
    """
    Upload a single run report to PipeRider Cloud
    """
    report_path = kwargs.get('run')
    datasource = kwargs.get('datasource')
    report_dir = kwargs.get('report_dir')
    ret = CloudConnector.upload_report(report_path=report_path, datasource=datasource, report_dir=report_dir,
                                       debug=kwargs.get('debug', False))
    return ret


@cloud.command(short_help='Login to PipeRider Cloud.', beta=True, cls=TrackCommand)
@add_options(debug_option)
def login(**kwargs):
    ret = CloudConnector.login()
    return ret


@cloud.command(short_help='Logout from PipeRider Cloud.', beta=True, cls=TrackCommand)
@add_options(debug_option)
def logout(**kwargs):
    ret = CloudConnector.logout()
    return ret
