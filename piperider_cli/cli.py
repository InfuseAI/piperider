import os.path
import sys

import click
import sentry_sdk
from rich.console import Console

import piperider_cli.dbtutil as dbtutil
from piperider_cli import __version__, sentry_dns, sentry_env, event
from piperider_cli.assertion_generator import AssertionGenerator
from piperider_cli.cloud_connector import CloudConnector
from piperider_cli.compare_report import CompareReport
from piperider_cli.configuration import FileSystem, is_piperider_workspace_exist
from piperider_cli.error import RecipeConfigException, DbtProjectNotFoundError, PipeRiderConflictOptionsError
from piperider_cli.event import UserProfileConfigurator
from piperider_cli.event.track import TrackCommand
from piperider_cli.exitcode import EC_ERR_TEST_FAILED
from piperider_cli.feedback import Feedback
from piperider_cli.generate_report import GenerateReport
from piperider_cli.guide import Guide
from piperider_cli.initializer import Initializer
from piperider_cli.recipe_executor import RecipeExecutor
from piperider_cli.recipes import RecipeConfiguration, configure_recipe_execution_flags, is_recipe_dry_run
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


def dbt_select_option_builder():
    try:
        # For dbt-core >= 1.5.0
        from dbt.cli.options import MultiOption
        return click.option('--select', '-s', default=None, type=tuple, help='Specify the dbt nodes to include.',
                            multiple=True,
                            cls=MultiOption)
    except Exception:
        # For dbt-core < 1.5.0
        return click.option('--select', '-s', default=None, help='Specify the dbt nodes to include.',
                            multiple=True)


dbt_related_options = [
    click.option('--dbt-project-dir', type=click.Path(exists=True),
                 help='The path to the dbt project directory.'),
    click.option('--dbt-profiles-dir', type=click.Path(exists=True), default=None,
                 help='Directory to search for dbt profiles.yml.'),
    click.option('--no-auto-search', type=click.BOOL, default=False, is_flag=True,
                 help='Disable auto detection of dbt projects.'),
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
    'Code review for data in dbt'
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
@add_options(dbt_related_options)
@add_options(debug_option)
def init(**kwargs):
    'Initialize a PipeRider project in interactive mode. The configurations are saved in ".piperider".'

    console = Console()

    # Search dbt project config files
    dbt_project_dir = kwargs.get('dbt_project_dir')
    no_auto_search = kwargs.get('no_auto_search')
    dbt_project_path = dbtutil.get_dbt_project_path(dbt_project_dir, no_auto_search)
    dbt_profiles_dir = kwargs.get('dbt_profiles_dir')
    if dbt_project_path:
        FileSystem.set_working_directory(dbt_project_path)

    # TODO show the process and message to users
    console.print(f'Initialize piperider to path {FileSystem.PIPERIDER_WORKSPACE_PATH}')

    config = Initializer.exec(dbt_project_path=dbt_project_path, dbt_profiles_dir=dbt_profiles_dir)
    if kwargs.get('debug'):
        for ds in config.dataSources:
            console.rule('Configuration')
            console.print(ds.__dict__)
    if config is None:
        sys.exit(1)

    # Show the content of config.yml
    Initializer.show_config()


@cli.command(short_help='Check the configuraion and connection.', cls=TrackCommand)
@add_options(dbt_related_options)
@add_options(debug_option)
def diagnose(**kwargs):
    'Check project configuration, datasource, connections, and assertion configuration.'

    console = Console()

    # Search dbt project config files
    dbt_project_dir = kwargs.get('dbt_project_dir')
    no_auto_search = kwargs.get('no_auto_search')
    dbt_project_path = dbtutil.get_dbt_project_path(dbt_project_dir, no_auto_search)
    dbt_profiles_dir = kwargs.get('dbt_profiles_dir')
    if dbt_project_path:
        FileSystem.set_working_directory(dbt_project_path)
        # Only run initializer when dbt project path is provided
        Initializer.exec(dbt_project_path=dbt_project_path, dbt_profiles_dir=dbt_profiles_dir, interactive=False)
    elif is_piperider_workspace_exist() is False:
        raise DbtProjectNotFoundError()

    console.print('Diagnosing...')

    console.print(f'[bold dark_orange]PipeRider Version:[/bold dark_orange] {__version__}')

    if not Validator.diagnose():
        sys.exit(1)


@cli.command(short_help='Execute a piperider run.', cls=TrackCommand)
@click.option('--datasource', default=None, type=click.STRING, help='Datasource to use.', metavar='DATASOURCE_NAME')
@click.option('--table', default=None, type=click.STRING, help='Specify the name of a model/seed/source to profile.',
              metavar='TABLE_NAME')
@click.option('--output', '-o', default=None, type=click.STRING, help='Directory to save the results.')
@click.option('--skip-report', is_flag=True, help='Skip generating report.')
@click.option('--dbt-target-path', default=None, help='Configure the "target-path" of dbt.')
@click.option('--dbt-list', is_flag=True, help='Associate with dbt list format input.')
@click.option('--dbt-run-results', is_flag=True, help='Associate with dbt run results.',
              hidden=True)  # For backward compatibility
@click.option('--report-dir', default=None, type=click.STRING, help='Use a different report directory.')
@click.option('--upload', is_flag=True, help='Upload the report to the PipeRider Cloud.')
@click.option('--project', default=None, type=click.STRING, help='Specify the project name to upload.')
@click.option('--share', default=False, is_flag=True, help='Enable public share of the report to PipeRider Cloud.')
@click.option('--open', is_flag=True, help='Opens the generated report in the system\'s default browser')
@add_options([
    dbt_select_option_builder(),
    click.option('--state', default=None,
                 help='If set, use the given directory as the source for JSON files to compare with this project.')
])
@add_options(dbt_related_options)
@add_options(debug_option)
def run(**kwargs):
    'Profile data source, run assertions, and generate report(s). By default, the raw results and reports are saved in ".piperider/outputs".'

    datasource = kwargs.get('datasource')
    table = kwargs.get('table')
    output = kwargs.get('output')
    open_report = kwargs.get('open')
    enable_share = kwargs.get('share')
    skip_report = kwargs.get('skip_report')
    dbt_target_path = kwargs.get('dbt_target_path')
    dbt_list = kwargs.get('dbt_list')
    force_upload = kwargs.get('upload')
    project_name = kwargs.get('project')
    select = kwargs.get('select')
    state = kwargs.get('state')

    if project_name is not None:
        os.environ.get('PIPERIDER_API_PROJECT')

    console = Console()
    env_dbt_resources = os.environ.get('PIPERIDER_DBT_RESOURCES')

    # True -> 1, False -> 0
    if sum([True if table else False, dbt_list, env_dbt_resources is not None]) > 1:
        console.print("[bold red]Error:[/bold red] "
                      "['--table', '--dbt-list'] are mutually exclusive")
        sys.exit(1)

    # Search dbt project config files
    dbt_project_dir = kwargs.get('dbt_project_dir')
    no_auto_search = kwargs.get('no_auto_search')
    dbt_project_path = dbtutil.get_dbt_project_path(dbt_project_dir, no_auto_search, recursive=False)
    dbt_profiles_dir = kwargs.get('dbt_profiles_dir')
    if dbt_project_path:
        working_dir = os.path.dirname(dbt_project_path) if dbt_project_path.endswith('.yml') else dbt_project_path
        FileSystem.set_working_directory(working_dir)
        if dbt_profiles_dir:
            FileSystem.set_dbt_profiles_dir(dbt_profiles_dir)
        # Only run initializer when dbt project path is provided
        Initializer.exec(dbt_project_path=dbt_project_path, dbt_profiles_dir=dbt_profiles_dir, interactive=False)
    elif is_piperider_workspace_exist() is False:
        raise DbtProjectNotFoundError()

    dbt_resources = None
    if select and dbt_list is True:
        raise PipeRiderConflictOptionsError(
            'Cannot use options "--select" with "--dbt-list"',
            hint='Remove "--select" option and use "--dbt-list" instead.'
        )

    if dbt_list:
        dbt_resources = dbtutil.read_dbt_resources(sys.stdin)
    if env_dbt_resources is not None:
        dbt_resources = dbtutil.read_dbt_resources(env_dbt_resources)

    ret = Runner.exec(datasource=datasource,
                      table=table,
                      output=output,
                      skip_report=skip_report,
                      dbt_target_path=dbt_target_path,
                      dbt_resources=dbt_resources,
                      dbt_select=select,
                      dbt_state=state,
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
        elif not CloudConnector.is_login() and is_cloud_view:
            console = Console()
            console.print('[bold yellow]Warning: [/bold yellow]The report is not uploaded due to not logged in.')

    if ret != 0:
        sys.exit(ret)
    return ret


@cli.command(short_help='Generate recommended assertions. - Deprecated', cls=TrackCommand)
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

    if force_upload and not CloudConnector.is_login():
        force_upload = False
        console = Console()
        console.print('[bold yellow]Warning: [/bold yellow]Reports will not be uploaded due to not logged in.')

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


@cli.command(name='compare', short_help='Compare the change for the current branch.', cls=TrackCommand)
@click.option('--recipe', default=None, type=click.STRING, help='Select a different recipe.')
@click.option('--upload', default=False, is_flag=True, help='Upload the report to PipeRider Cloud.')
@click.option('--share', default=False, is_flag=True, help='Enable public share of the report to PipeRider Cloud.')
@click.option('--output', '-o', default=None, type=click.STRING, help='Directory to save the results.')
@click.option('--summary-file', default=None, type=click.STRING, help='Output the comparison summary markdown file.')
@click.option('--project', default=None, type=click.STRING, metavar='PROJECT_NAME',
              help='Specify the default project name.')
@click.option('--open', is_flag=True, help='Opens the generated report in the system\'s default browser')
@click.option('--dry-run', is_flag=True, default=False, help='Display the run details without actually executing it')
@click.option('--interactive', is_flag=True, default=False,
              help='Prompt for confirmation to proceed with the run (Y/N)')
@add_options([
    dbt_select_option_builder(),
    click.option('--modified', default=False, is_flag=True, help='Only compare the modified models.'),
    click.option('--base-branch', default='main', type=click.STRING, help='Specify the base branch.',
                 show_default=True),
])
@add_options(dbt_related_options)
@add_options(debug_option)
def compare_with_recipe(**kwargs):
    """
    Generate the comparison report for your branch.
    """

    recipe = kwargs.get('recipe')
    summary_file = kwargs.get('summary_file')
    force_upload = kwargs.get('upload')
    enable_share = kwargs.get('share')
    open_report = kwargs.get('open')
    project_name = kwargs.get('project')
    debug = kwargs.get('debug', False)
    select = kwargs.get('select')
    modified = kwargs.get('modified')

    base_branch = kwargs.get('base_branch')

    # reconfigure recipe global flags
    configure_recipe_execution_flags(dry_run=kwargs.get('dry_run'), interactive=kwargs.get('interactive'))

    if enable_share:
        force_upload = True

    if force_upload is True and CloudConnector.is_login() is False:
        raise RecipeConfigException(
            message='Please login to PipeRider Cloud first.',
            hint='Run "piperider cloud login" to login to PipeRider Cloud.'
        )

    # Search dbt project config files
    dbt_project_dir = kwargs.get('dbt_project_dir')
    no_auto_search = kwargs.get('no_auto_search')
    dbt_project_path = dbtutil.get_dbt_project_path(dbt_project_dir, no_auto_search, recursive=False)
    dbt_profiles_dir = kwargs.get('dbt_profiles_dir')
    if dbt_project_path:
        FileSystem.set_working_directory(dbt_project_path)
        # Only run initializer when dbt project path is provided
        Initializer.exec(dbt_project_path=dbt_project_path, dbt_profiles_dir=dbt_profiles_dir, interactive=False)
    elif is_piperider_workspace_exist() is False:
        raise DbtProjectNotFoundError()

    ret = 0
    try:
        # note: dry-run and interactive are set by configure_recipe_execution_flags
        recipe_config: RecipeConfiguration = RecipeExecutor.exec(
            recipe_name=recipe,
            select=select,
            modified=modified,
            base_branch=base_branch,
            debug=debug)
        last = False
        base = target = None
        if not recipe_config.base.is_file_specified() and not recipe_config.target.is_file_specified():
            last = True
        else:
            base = recipe_config.base.get_run_report()
            target = recipe_config.target.get_run_report()

        if not is_recipe_dry_run():
            CompareReport.exec(a=base, b=target, last=last, datasource=None,
                               output=kwargs.get('output'), tables_from="all",
                               summary_file=summary_file,
                               force_upload=force_upload,
                               enable_share=enable_share,
                               open_report=open_report,
                               project_name=project_name,
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
