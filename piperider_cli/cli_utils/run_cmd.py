import os
import sys

from rich.console import Console


def run(**kwargs):
    'Profile data source, run assertions, and generate report(s). By default, the raw results and reports are saved in ".piperider/outputs".'

    from piperider_cli.cli_utils import DbtUtil
    from piperider_cli.cli_utils.cloud import CloudConnectorHelper
    from piperider_cli.configuration import FileSystem, is_piperider_workspace_exist
    from piperider_cli.error import DbtProjectNotFoundError, PipeRiderConflictOptionsError
    from piperider_cli.exitcode import EC_ERR_TEST_FAILED, EC_WARN_NO_PROFILED_MODULES
    from piperider_cli.generate_report import GenerateReport
    from piperider_cli.guide import Guide
    from piperider_cli.initializer import Initializer
    from piperider_cli.runner import Runner

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
    dbt_project_path = DbtUtil.get_dbt_project_path(dbt_project_dir, no_auto_search, recursive=False)
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
        dbt_resources = DbtUtil.read_dbt_resources(sys.stdin)
    if env_dbt_resources is not None:
        dbt_resources = DbtUtil.read_dbt_resources(env_dbt_resources)

    ret = Runner.exec(datasource=datasource,
                      table=table,
                      output=output,
                      skip_report=skip_report,
                      dbt_target_path=dbt_target_path,
                      dbt_resources=dbt_resources,
                      dbt_select=select,
                      dbt_state=state,
                      report_dir=kwargs.get('report_dir'),
                      skip_datasource_connection=kwargs.get('skip_datasource'))
    if ret in (0, EC_ERR_TEST_FAILED, EC_WARN_NO_PROFILED_MODULES):
        if enable_share:
            force_upload = True

        auto_upload = CloudConnectorHelper.is_auto_upload()
        is_cloud_view = (force_upload or auto_upload)

        if not skip_report:
            GenerateReport.exec(None, kwargs.get('report_dir'), output, open_report, is_cloud_view)

        if ret == EC_WARN_NO_PROFILED_MODULES:
            # No module was profiled
            if dbt_list or dbt_resources or select:
                Guide().show('No resources was profiled. Please check given "--select", "--dbt-list" option or '
                             'environment variable "PIPERIDER_DBT_RESOURCES" to choose the resources to profile.')
                ret = 0

        if CloudConnectorHelper.is_login() and is_cloud_view:
            ret = CloudConnectorHelper.upload_latest_report(report_dir=kwargs.get('report_dir'),
                                                            debug=kwargs.get('debug'),
                                                            open_report=open_report, enable_share=enable_share,
                                                            project_name=project_name)
        elif not CloudConnectorHelper.is_login() and is_cloud_view:
            console = Console()
            console.print('[bold yellow]Warning: [/bold yellow]The report is not uploaded due to not logged in.')

    if ret != 0:
        if ret != EC_WARN_NO_PROFILED_MODULES:
            sys.exit(ret)
    return ret
