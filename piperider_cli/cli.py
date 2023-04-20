import os.path
import sys

import click
import sentry_sdk
from rich.console import Console

import piperider_cli.dbtutil as dbtutil
from piperider_cli import __version__, sentry_dns, sentry_env, event, get_run_json_path
from piperider_cli.assertion_generator import AssertionGenerator
from piperider_cli.cloud_connector import CloudConnector
from piperider_cli.compare_report import CompareReport
from piperider_cli.configuration import PIPERIDER_WORKSPACE_PATH
from piperider_cli.error import RecipeConfigException
from piperider_cli.event import UserProfileConfigurator
from piperider_cli.event.track import TrackCommand
from piperider_cli.exitcode import EC_ERR_TEST_FAILED
from piperider_cli.feedback import Feedback
from piperider_cli.generate_report import GenerateReport
from piperider_cli.guide import Guide
from piperider_cli.initializer import Initializer
from piperider_cli.recipe_executor import RecipeExecutor
from piperider_cli.recipes import RecipeConfiguration
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

    # TODO show the process and message to users
    console.print(f'Initialize piperider to path {PIPERIDER_WORKSPACE_PATH}')

    # Search dbt project config files
    dbt_project_path = None
    dbt_project_dir = kwargs.get('dbt_project_dir')
    dbt_profiles_dir = kwargs.get('dbt_profiles_dir')
    no_auto_search = kwargs.get('no_auto_search')
    if not no_auto_search:
        if dbt_project_dir:
            dbt_project_path = os.path.join(dbt_project_dir, "dbt_project.yml")
        else:
            dbt_project_path = dbtutil.search_dbt_project_path()

    if dbt_project_path:
        console.print(f'[[bold green] DBT [/bold green]] Use the existing dbt project file: {dbt_project_path}')
        console.print(
            "[[bold green] DBT [/bold green]] "
            "By default, PipeRider will profile the models and metrics with 'piperider' tag\n"
            "        Apply 'piperider' tag to your models or change the tag in '.piperider/config.yml'\n")

    config = Initializer.exec(dbt_project_path=dbt_project_path, dbt_profiles_dir=dbt_profiles_dir)
    if kwargs.get('debug'):
        for ds in config.dataSources:
            console.rule('Configuration')
            console.print(ds.__dict__)
    if config is None:
        sys.exit(1)

    # Show the content of config.yml
    Initializer.show_config()


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
@click.option('--skip-report', is_flag=True, help='Skip generating report.')
@click.option('--dbt-state', default=None, help='Directory of the the dbt state.')
@click.option('--dbt-list', is_flag=True, help='Associate with dbt list format input.')
@click.option('--dbt-run-results', is_flag=True, help='Associate with dbt run results.')
@click.option('--report-dir', default=None, type=click.STRING, help='Use a different report directory.')
@click.option('--upload', is_flag=True, help='Upload the report to the PipeRider Cloud.')
@click.option('--project', default=None, type=click.STRING, help='Specify the project name to upload.')
@click.option('--share', default=False, is_flag=True, help='Enable public share of the report to PipeRider Cloud.')
@click.option('--open', is_flag=True, help='Opens the generated report in the system\'s default browser')
@add_options(debug_option)
def run(**kwargs):
    'Profile data source, run assertions, and generate report(s). By default, the raw results and reports are saved in ".piperider/outputs".'

    datasource = kwargs.get('datasource')
    table = kwargs.get('table')
    output = kwargs.get('output')
    open_report = kwargs.get('open')
    enable_share = kwargs.get('share')
    skip_report = kwargs.get('skip_report')
    dbt_state_dir = kwargs.get('dbt_state')
    dbt_list = kwargs.get('dbt_list')
    dbt_run_results = kwargs.get('dbt_run_results')
    force_upload = kwargs.get('upload')
    project_name = kwargs.get('project')

    console = Console()

    # True -> 1, False -> 0
    if sum([True if table else False, dbt_list, dbt_run_results]) > 1:
        console.print("[bold red]Error:[/bold red] "
                      "['--table', '--dbt-list', '--dbt-run-results'] are mutually exclusive")
        sys.exit(1)

    dbt_resources = None
    if dbt_list:
        metrics = []
        models = []
        for dbt_resource in sys.stdin:
            if dbt_resource.startswith('source:'):
                continue
            elif dbt_resource.startswith('metric:'):
                metrics.append(dbt_resource.rstrip().replace('metric:', 'metric.'))
            else:
                models.append(dbt_resource.rstrip())
        dbt_resources = dict(metrics=metrics, models=models)

    ret = Runner.exec(datasource=datasource,
                      table=table,
                      output=output,
                      skip_report=skip_report,
                      dbt_state_dir=dbt_state_dir,
                      dbt_run_results=dbt_run_results,
                      dbt_resources=dbt_resources,
                      report_dir=kwargs.get('report_dir'))
    if ret in (0, EC_ERR_TEST_FAILED):
        if enable_share:
            force_upload = True

        auto_upload = CloudConnector.is_auto_upload()
        is_cloud_view = (force_upload or auto_upload)

        if not skip_report:
            GenerateReport.exec(None, kwargs.get('report_dir'), output, open_report, is_cloud_view)

        if CloudConnector.is_login() and is_cloud_view:
            ret = CloudConnector.upload_latest_report(report_dir=kwargs.get('report_dir'), debug=kwargs.get('debug'),
                                                      open_report=open_report, enable_share=enable_share,
                                                      project_name=project_name)
    if ret != 0:
        sys.exit(ret)
    return ret


@cli.command(short_help='Generate recommended assertions.', cls=TrackCommand)
@click.option('--input', default=None, type=click.Path(exists=True), help='Specify the raw result file.')
@click.option('--no-recommend', is_flag=True, help='Generate assertions templates only.')
@click.option('--report-dir', default=None, type=click.STRING, help='Use a different report directory.')
@click.option('--table', default=None, type=click.STRING, help='Generate assertions for the given table')
@add_options(debug_option)
def generate_assertions(**kwargs):
    'Generate recommended assertions based on the latest result. By default, the profiling result will be loaded from ".piperider/outputs".'
    input_path = kwargs.get('input')
    report_dir = kwargs.get('report_dir')
    no_recommend = kwargs.get('no_recommend')
    table = kwargs.get('table')
    ret = AssertionGenerator.exec(input_path=input_path, report_dir=report_dir, no_recommend=no_recommend, table=table)
    if ret != 0:
        sys.exit(ret)
    return ret


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
@click.option('--summary-file', default=None, type=click.STRING, help='Output the comparison summary markdown file.')
@click.option('--report-dir', default=None, type=click.STRING, help='Use a different report directory.')
@click.option('--tables-from', default='all',
              type=click.Choice(['all', 'target-only', 'base-only'], case_sensitive=False),
              help='Show table comparison from base or target.')
@click.option('--upload', default=False, is_flag=True, help='Upload the report to PipeRider Cloud.')
@click.option('--project', default=None, type=click.STRING,
              help='Specify the project name to upload.')
@click.option('--share', default=False, is_flag=True, help='Enable public share of the report to PipeRider Cloud.')
@click.option('--open', is_flag=True, help='Opens the generated report in the system\'s default browser')
@add_options(debug_option)
def compare_reports(**kwargs):
    'Compare two existing reports selected in interactive mode or by option.'

    a = kwargs.get('base')
    b = kwargs.get('target')
    last = kwargs.get('last')
    datasource = kwargs.get('datasource')
    tables_from = kwargs.get('tables_from')
    summary_file = kwargs.get('summary_file')
    open_report = kwargs.get('open')
    force_upload = kwargs.get('upload')
    enable_share = kwargs.get('share')
    project_name = kwargs.get('project')

    if enable_share or CloudConnector.is_auto_upload():
        force_upload = True

    if force_upload is True and CloudConnector.is_login() is False:
        raise RecipeConfigException(
            message='Please login to PipeRider Cloud first.',
            hint='Run "piprider cloud login" to login to PipeRider Cloud.'
        )

    CompareReport.exec(a=a, b=b, last=last, datasource=datasource,
                       report_dir=kwargs.get('report_dir'), output=kwargs.get('output'), summary_file=summary_file,
                       tables_from=tables_from, force_upload=force_upload, enable_share=enable_share,
                       open_report=open_report, project_name=project_name, debug=kwargs.get('debug', False),
                       show_progress=True)


@cli.group('config', short_help='Manage the PipeRider configurations.')
def config(**kwargs):
    pass


@config.command(name='list-datasource', short_help='List DataSources in current PipeRider project',
                cls=TrackCommand)
@add_options(debug_option)
def list(**kwargs):
    'List PipeRider current configurations.'
    Initializer.list()


@config.command(name='add-datasource', short_help='Add a DataSource to current PipeRider project.',
                cls=TrackCommand)
@add_options(debug_option)
def add(**kwargs):
    Initializer.add()
    pass


@config.command(name='delete-datasource', short_help='Delete a DataSource from current PipeRider project.',
                cls=TrackCommand)
@add_options(debug_option)
def delete(**kwargs):
    Initializer.list()
    Initializer.delete()
    pass


@config.command(name='enable-auto-upload', short_help='Enable auto upload to PipeRider Cloud.', cls=TrackCommand)
def enable_auto_upload(**kwargs):
    CloudConnector.config_auto_upload(True)
    pass


@config.command(name='disable-auto-upload', short_help='Disable auto upload to PipeRider Cloud.', cls=TrackCommand)
def disable_auto_upload(**kwargs):
    CloudConnector.config_auto_upload(False)
    pass


@config.command(name='enable-user-tracking', short_help='Enable user tracking.', cls=TrackCommand)
def enable_user_tracking(**kwargs):
    UserProfileConfigurator.update('anonymous_tracking', True, name='user tracking')


@config.command(name='disable-user-tracking', short_help='Disable user tracking.', cls=TrackCommand)
def disable_user_tracking(**kwargs):
    UserProfileConfigurator.update('anonymous_tracking', False, name='user tracking')


@cli.group('cloud', short_help='Manage PipeRider Cloud')
def cloud(**kwargs):
    # Manage PipeRider Cloud.
    pass


@cloud.command(short_help='Upload a report to the PipeRider Cloud.', cls=TrackCommand)
@click.option('--run', type=click.Path(exists=True), help='Specify the raw result file.')
@click.option('--report-dir', default=None, type=click.STRING, help='Use a different report directory.')
@click.option('--datasource', default=None, type=click.STRING, metavar='DATASOURCE_NAME',
              help='Specify the datasource.')
@click.option('--project', default=None, type=click.STRING, metavar='PROJECT_NAME',
              help='Specify the project name to upload.')
@add_options(debug_option)
def upload_report(**kwargs):
    """
    Upload a single run report to PipeRider Cloud
    """
    report_path = kwargs.get('run')
    datasource = kwargs.get('datasource')
    report_dir = kwargs.get('report_dir')
    project_name = kwargs.get('project')
    ret = CloudConnector.upload_report(report_path=report_path, datasource=datasource, report_dir=report_dir,
                                       project_name=project_name,
                                       debug=kwargs.get('debug', False))
    return ret


@cloud.command(name='compare-reports', short_help='Generate comparison report on PipeRider Cloud.', cls=TrackCommand)
@click.option('--base', default=None, required=False, type=click.STRING,
              help='Specify the base report id or data source name. e.g., 123 or datasource:<name>')
@click.option('--target', default=None, required=False, type=click.STRING,
              help='Specify the target report id or data source name. e.g., 123 or datasource:<name>')
@click.option('--tables-from', default='all',
              type=click.Choice(['all', 'target-only', 'base-only'], case_sensitive=False),
              help='Show table comparison from base or target.')
@click.option('--summary-file', default=None, type=click.STRING, help='Download the comparison summary markdown file.')
@click.option('--project', default=None, type=click.STRING, metavar='PROJECT_NAME',
              help='Specify the project name to upload.')
@add_options(debug_option)
def cloud_compare_reports(**kwargs):
    """
    Generate comparison report on PipeRider Cloud
    """
    base = kwargs.get('base')
    target = kwargs.get('target')
    tables_from = kwargs.get('tables_from')
    summary_file = kwargs.get('summary_file')
    project_name = kwargs.get('project')

    ret = CloudConnector.compare_reports(base=base, target=target, tables_from=tables_from, summary_file=summary_file,
                                         project_name=project_name, debug=kwargs.get('debug', False))

    if ret != 0:
        sys.exit(ret)
    return ret


@cli.command(name='compare', short_help='Generate comparison report with the recipe.', cls=TrackCommand)
@click.option('--recipe', default=None, type=click.STRING, help='Select a different recipe.')
@click.option('--upload', default=False, is_flag=True, help='Upload the report to PipeRider Cloud.')
@click.option('--share', default=False, is_flag=True, help='Enable public share of the report to PipeRider Cloud.')
@click.option('--output', '-o', default=None, type=click.STRING, help='Directory to save the results.')
@click.option('--summary-file', default=None, type=click.STRING, help='Output the comparison summary markdown file.')
@click.option('--open', is_flag=True, help='Opens the generated report in the system\'s default browser')
@add_options(debug_option)
def compare_with_recipe(**kwargs):
    """
    Generate comparison report with the recipe
    """

    recipe = kwargs.get('recipe')
    summary_file = kwargs.get('summary_file')
    force_upload = kwargs.get('upload')
    enable_share = kwargs.get('share')
    open_report = kwargs.get('open')
    debug = kwargs.get('debug', False)

    if enable_share:
        force_upload = True

    if force_upload is True and CloudConnector.is_login() is False:
        raise RecipeConfigException(
            message='Please login to PipeRider Cloud first.',
            hint='Run "piprider cloud login" to login to PipeRider Cloud.'
        )

    ret = 0
    try:
        recipe_config: RecipeConfiguration = RecipeExecutor.exec(recipe_name=recipe, debug=debug)
        last = False
        base = target = None
        if not recipe_config.base.is_file_specified() and not recipe_config.target.is_file_specified():
            last = True
        else:
            base = recipe_config.base.get_run_report()
            target = recipe_config.target.get_run_report()

        CompareReport.exec(a=base, b=target, last=last, datasource=None,
                           output=kwargs.get('output'), tables_from="all",
                           summary_file=summary_file,
                           force_upload=force_upload,
                           enable_share=enable_share,
                           open_report=open_report,
                           show_progress=True,
                           debug=debug)
    except Exception as e:
        raise e

    return ret


@cloud.command(short_help='Signup to PipeRider Cloud.', cls=TrackCommand)
@add_options(debug_option)
def signup(**kwargs):
    ret = CloudConnector.signup(debug=kwargs.get('debug', False))
    return ret


@cloud.command(short_help='Login to PipeRider Cloud.', cls=TrackCommand)
@click.option('--token', default=None, type=click.STRING, help='Specify the API token.')
@click.option('--project', default=None, type=click.STRING, metavar='PROJECT_NAME',
              help='Specify the default project name.')
@click.option('--no-interaction', default=False, is_flag=True, help='Disable interactive mode.')
@add_options(debug_option)
def login(**kwargs):
    options = {
        'no_interaction': False,
    }

    if kwargs.get('project') is not None:
        options['default_project'] = kwargs.get('project')
    if kwargs.get('no_interaction') is True:
        options['no_interaction'] = True

    ret = CloudConnector.login(api_token=kwargs.get('token'), options=options, debug=kwargs.get('debug', False))
    return ret


@cloud.command(short_help='Logout from PipeRider Cloud.', cls=TrackCommand)
@add_options(debug_option)
def logout(**kwargs):
    ret = CloudConnector.logout()
    return ret


@cloud.command(short_help='List projects on PipeRider Cloud.', cls=TrackCommand)
@add_options(debug_option)
def list_projects(**kwargs):
    ret = CloudConnector.list_projects()
    return ret


@cloud.command(short_help='Select a project on PipeRider Cloud as default project.', cls=TrackCommand)
@click.option('--project', default=None, type=click.STRING, metavar='PROJECT_NAME',
              help='Specify the project name.')
@click.option('--no-interaction', default=False, is_flag=True, help='Disable interactive mode.')
@add_options(debug_option)
def select_project(**kwargs):
    project_name = kwargs.get('project')
    no_interaction: bool = kwargs.get('no_interaction', False)
    ret = CloudConnector.select_project(project_name=project_name, no_interaction=no_interaction)
    return ret
