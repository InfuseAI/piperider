import json
import os
import sys
import webbrowser
from typing import List, Optional, Union

import inquirer
import readchar
from rich import box
from rich.console import Console
from rich.prompt import Prompt
from rich.table import Table

from piperider_cli import datetime_to_str, open_report_in_browser, str_to_datetime, get_run_json_path
from piperider_cli.cloud import PipeRiderCloud, PipeRiderProject, PipeRiderTemporaryProject
from piperider_cli.compare_report import CompareReport, RunOutput
from piperider_cli.configuration import Configuration
from piperider_cli.datasource import FANCY_USER_INPUT
from piperider_cli.error import CloudReportError
from piperider_cli.githubutil import fetch_pr_metadata

console = Console()
piperider_cloud = PipeRiderCloud()

WORKSPACE_PROJECT_NAME_REGEX = r'^[a-zA-Z0-9-_]+$'


def _ask_email():
    if FANCY_USER_INPUT:
        account = inquirer.text('Email address', validate=lambda _, x: '@' in x)
    else:
        while True:
            account = Prompt.ask('[[yellow]?[/yellow]] Email address')
            if '@' in account:
                break
            else:
                console.print(f"'{account}' is not a valid")

    return account


def _ask_api_token():
    console.print('We have just sent an email with a magic link.\n'
                  'Please paste the api token from the magic link.')
    while True:
        api_token = Prompt.ask('[[yellow]?[/yellow]] API token')
        if len(api_token) > 0:
            break
    return api_token


def _process_magic_signup(account: str, username: str = None):
    response = piperider_cloud.magic_signup(account, username)
    if response is None:
        console.print('[[red]Error[/red]] Signup failed. Please try again.')
        return False
    elif response.get('success') is False:
        # TODO: use error code
        if 'User email or username already exists.' in response.get('message', ''):
            console.print(f"'{account}' already exists.")
            if not _process_magic_login(account):
                return False
        else:
            console.print(f"[[red]Error[/red]] {response.get('message')}")
            return False
    return True


def _process_magic_login(account: str):
    response = piperider_cloud.magic_login(account)
    if response is None:
        console.print('[[red]Error[/red]] Login failed. Please try again.')
        return False
    elif response.get('success') is False:
        # TODO: use error code
        if f"'{account}' does not exist." in response.get('message', ''):
            console.print('This email account was not found.')
            question = f"Signup with '{account}' (y/n)"
            allowed_ans = ['y', 'n', 'Y', 'N']
            if FANCY_USER_INPUT:
                ans = inquirer.text(question, validate=lambda _, x: x in allowed_ans)
            else:
                while True:
                    ans = Prompt.ask(f'[[yellow]?[/yellow]] {question}')
                    if ans in allowed_ans:
                        break
                    else:
                        console.print(f"'{ans}' is not a valid")
            if ans.upper() == 'N':
                return False
            else:
                if _process_magic_signup(account):
                    return True
                return False
        else:
            console.print(f"[[red]Error[/red]] {response.get('message')}")
            return False

    if response.get('link'):
        webbrowser.open(response.get('link'))
    return True


def ask_signup_info() -> str:
    console.print('Please provide your email account to signup')
    account = _ask_email()

    if _process_magic_signup(account):
        return _ask_api_token()
    return ''


def ask_login_info() -> str:
    console.print('Please provide your email account to login')
    account = _ask_email()

    if _process_magic_login(account):
        return _ask_api_token()
    return ''


def verify_api_token(api_token) -> bool:
    if piperider_cloud.validate(api_token) is False:
        console.print('[[red]Error[/red]] Invalid API Token. Please try again.')
        return False

    # Write API Token back to user profile
    piperider_cloud.service.update_api_token()
    return True


def location_mapper(loc_id):
    map = {
        'us': 'North America',
        'eu': 'Europe',
        'ap': 'Asia Pacific'
    }
    return map.get(loc_id, 'N/A')


def show_user_info():
    user = piperider_cloud.me
    if user is None:
        return
    ascii_table = Table(show_header=True, show_edge=True, header_style="bold magenta",
                        box=box.SIMPLE, title='User Profile')
    ascii_table.add_column('Email', justify='left', style='cyan')
    ascii_table.add_column('Username', justify='left')
    ascii_table.add_column('Full Name', justify='left')
    ascii_table.add_column('Storage Location', justify='left')
    ascii_table.add_column('Timezone', justify='left')
    ascii_table.add_row(
        user.get('email'),
        user.get('username', 'N/A'),
        user.get('fullname', 'N/A'),
        location_mapper(user.get('data_storage_location')),
        user.get('timezone_id')
    )
    console.print(ascii_table)
    pass


def setup_cloud_default_config(options: dict = None):
    if piperider_cloud.config.get('auto_upload') is None:
        piperider_cloud.update_config({'auto_upload': False})

    if options and options.get('default_project'):
        project_name = options.get('default_project')
        if piperider_cloud.get_project_by_name(project_name):
            piperider_cloud.update_config({'default_project': project_name})
            console.print(f'[[bold green]Config[/bold green]] Default project is set to \'{project_name}\'')
        else:
            console.print(f"[[yellow]Skip[/yellow]] Project '{project_name}' does not exist.")

    if piperider_cloud.config.get('default_project') is None:
        no_interaction = options and options.get('no_interaction')
        CloudConnector.select_project(no_interaction=no_interaction)


def select_reports(report_dir=None, datasource=None) -> List[RunOutput]:
    filesystem = Configuration.instance().activate_report_directory(report_dir=report_dir)
    selector = CompareReport(filesystem.get_output_dir(), None, None, datasource=datasource)
    console.rule('Select Reports to Upload')
    return selector.select_multiple_reports(action='upload')


class CloudReportOutput(RunOutput):
    def __init__(self, report):
        self.report = report
        self.id = report['id']
        self.name = report['datasource_name']
        self.created_at = report['created_at']
        self.table_count = report['tables']
        self.pass_count = report['passed']
        self.fail_count = report['failed']


def select_cloud_report_ids(datasource=None, project: PipeRiderProject = None, target=None,
                            base=None) -> (int, int):
    if project is None:
        project = piperider_cloud.get_default_project()

    if target:
        target_id = get_run_report_id(project, target)
    if base:
        base_id = get_run_report_id(project, base)

    reports = [CloudReportOutput(r) for r in piperider_cloud.list_reports(project, datasource=datasource)]
    if len(reports) == 0:
        return None, None

    selector = CompareReport(None, None, None, datasource=datasource, profiler_outputs=reports)

    if base is None and target is None:
        console.rule('Please select base and target reports to compare')
        base, target = selector.select_two_reports(action='compare')
        target_id = target.id
        base_id = base.id
    elif base and target is None:
        console.rule('Please select a target report to compare')
        target = selector.select_one_report(action='compare')
        target_id = target.id
    elif target and base is None:
        console.rule('Please select a base report to compare')
        base = selector.select_one_report(action='compare')
        base_id = base.id

    return base_id, target_id


def upload_to_cloud(run: RunOutput, debug=False, project: PipeRiderProject = None, show_progress=True) -> dict:
    response = piperider_cloud.upload_run(run.path, project=project, show_progress=show_progress)

    # TODO refine the output when API is ready

    def _patch_cloud_upload_response(run_path, project: PipeRiderProject, run_id):
        with open(run_path, 'r') as f:
            report = json.load(f)
        if isinstance(project, PipeRiderTemporaryProject):
            report['cloud'] = {
                'run_id': run_id,
                'is_temporary': True,
            }
        else:
            report['cloud'] = {
                'run_id': run_id,
                'project_name': f'{project.workspace_name}/{project.name}'
            }
        with open(run_path, 'w', encoding='utf-8') as f:
            f.write(json.dumps(report, separators=(',', ':')))

    if response.get('success') is True:
        run_id = response.get('id')
        report_url = response.get('url')
        if run_id:
            _patch_cloud_upload_response(run.path, project, run_id)

        return {
            'success': True,
            'message': response.get("message"),
            'run_id': run_id,
            'report_url': report_url,
            'file_path': run.path
        }

    if debug:
        console.print(response)
    return {
        'success': False,
        'message': response.get("message"),
        'report_url': 'N/A',
        'file_path': run.path
    }


def get_run_report_id(project: PipeRiderProject, report_key: str) -> Optional[int]:
    if report_key.isdecimal():
        if int(report_key) < 1:
            return None
        return int(report_key)

    if report_key.startswith('datasource:'):
        datasource = report_key.split(':')[-1]
        reports = piperider_cloud.list_reports(project, datasource=datasource)

        if reports:
            return reports[0].get('id')

    return None


def create_compare_reports(base_id: Union[str, int], target_id: Union[str, int], tables_from,
                           project: PipeRiderProject = None,
                           metadata: dict = None) -> dict:
    if project is None:
        project = piperider_cloud.get_default_project()
    response = piperider_cloud.compare_reports(base_id, target_id, tables_from, project=project, metadata=metadata)
    return response


class CloudConnector:
    @staticmethod
    def is_login() -> bool:
        return piperider_cloud.available

    @staticmethod
    def is_auto_upload() -> bool:
        return piperider_cloud.config.get('auto_upload', False)

    @staticmethod
    def config_auto_upload(flag: bool):
        console.print(f'[[bold green]Config[/bold green]] Default auto upload behavior is set to {flag}')
        piperider_cloud.update_config({'auto_upload': flag})

    @staticmethod
    def signup(debug=False):

        if piperider_cloud.available:
            console.rule('Already Logged In')
            show_user_info()
            setup_cloud_default_config()
            return 0

        api_token = ask_signup_info()

        if api_token:
            if verify_api_token(api_token):
                console.rule('Login Successful')
                show_user_info()
                setup_cloud_default_config()
                return 0

        console.rule('Login Failed', style='red')
        return 1

    @staticmethod
    def login(api_token=None, options: dict = None, debug=False):

        if piperider_cloud.available:
            console.rule('Already Logged In')
            show_user_info()
            setup_cloud_default_config(options)
            return 0

        if api_token is None:
            api_token = ask_login_info()

        if api_token:
            if verify_api_token(api_token):
                console.rule('Login Successful')
                show_user_info()
                setup_cloud_default_config(options)
                return 0

        console.rule('Login Failed', style='red')
        return 1

    @staticmethod
    def logout():

        if piperider_cloud.available is False:
            console.rule('Already Logout', style='yellow')
            return 0

        piperider_cloud.logout()
        console.rule('Logout')
        return 0

    @staticmethod
    def upload_latest_report(report_dir=None, debug=False, open_report=False, enable_share=False,
                             project_name: str = None) -> int:
        filesystem = Configuration.instance().activate_report_directory(report_dir=report_dir)
        latest_report_path = get_run_json_path(filesystem.get_output_dir())
        return CloudConnector.upload_report(latest_report_path, debug=debug, open_report=open_report,
                                            enable_share=enable_share, project_name=project_name)

    @staticmethod
    def upload_report(report_path=None, report_dir=None, datasource=None, debug=False, open_report=False,
                      enable_share=False, project_name=None, show_progress=True) -> int:
        is_temporary_report = False
        if piperider_cloud.available is False and enable_share is True:
            is_temporary_report = True
        elif piperider_cloud.available is False:
            console.rule('Please login PipeRider Cloud first', style='red')
            return 1

        if project_name:
            project = piperider_cloud.get_project_by_name(project_name)
            if project is None:
                console.print(f'[[bold red]Error[/bold red]] Project \'{project_name}\' does not exist')
                return 1
        elif is_temporary_report:
            project = PipeRiderTemporaryProject()
        else:
            project = piperider_cloud.get_default_project()

        rc = 0
        results = []
        if report_path is None:
            reports = select_reports(report_dir=report_dir, datasource=datasource)
            if show_progress:
                console.rule('Uploading Reports')
            for r in reports:
                response = upload_to_cloud(r, debug, project=project, show_progress=show_progress)
                if response.get('success') is False:
                    rc = 1
                response['name'] = r.name
                response['created_at'] = r.created_at
                results.append(response)
        else:
            if show_progress:
                console.rule('Uploading Report')
            report = RunOutput(report_path)
            response = upload_to_cloud(report, debug, project=project, show_progress=show_progress)
            if response.get('success') is False:
                rc = 1
            response['name'] = report.name
            response['created_at'] = report.created_at
            results.append(response)

        if show_progress:
            console.rule('Upload Completed')
            ascii_table = Table(show_header=True, show_edge=True, header_style="bold magenta",
                                box=box.SIMPLE)
            ascii_table.add_column('ID', justify='left', style='cyan')
            ascii_table.add_column('Status', justify='left', style='cyan')
            ascii_table.add_column('Name', justify='left')
            ascii_table.add_column('Created At', justify='left')
            ascii_table.add_column('Message', justify='left')

            reports = []
            for response in results:
                status = '[bold green]Success[/bold green]' if response.get(
                    'success') else '[bold yellow]Skipped[/bold yellow]'
                reports.append((response.get('run_id'), response.get('report_url', 'N/A')))
                message = response.get('message')
                created_at = datetime_to_str(str_to_datetime(response.get('created_at')), to_tzlocal=True)
                ascii_table.add_row(str(response.get('run_id')), status, response.get('name'), created_at, message)
            console.print(ascii_table)

            for report in reports:
                console.print(f'Report #{report[0]} URL: [deep_sky_blue1]{report[1]}?utm_source=cli[/deep_sky_blue1]',
                              soft_wrap=True)

        if open_report:
            url = response.get('report_url')
            open_report_in_browser(url, True)

        if enable_share and is_temporary_report is False:
            run_id = response.get('run_id')
            CloudConnector.share_run_report(run_id, debug, project_name=project_name)

        return rc

    @staticmethod
    def generate_compare_report(base_id: str, target_id: str, tables_from='all',
                                project_name: str = None, is_temporary: bool = False, debug: bool = False):
        # TODO: Change to use new front-end URL pattern
        def _generate_legacy_compare_report_url(base_id, target_id, project=None):
            metadata = fetch_pr_metadata()
            if project is None:
                project = piperider_cloud.get_default_project()

            response = create_compare_reports(base_id, target_id, tables_from, project=project, metadata=metadata)
            return response

        try:
            # TODO: change to use workspace and project name instead of project id
            if is_temporary is True:
                project = PipeRiderTemporaryProject()
            elif project_name:
                project = piperider_cloud.get_project_by_name(project_name)
                if project is None:
                    console.print(f'[[bold red]Error[/bold red]] Project \'{project_name}\' does not exist')
                    return 1
            else:
                project = piperider_cloud.get_default_project()
            return _generate_legacy_compare_report_url(base_id, target_id, project=project)
        except CloudReportError as e:
            console.print(f'[[bold red]Error[/bold red]] Cannot generate compare report in the cloud: {e.message}')
            return None

    @staticmethod
    def compare_reports(base=None, target=None, tables_from='all', summary_file=None, debug=False,
                        project_name=None) -> int:
        if piperider_cloud.available is False:
            console.rule('Please login PipeRider Cloud first', style='red')
            return 1

        if project_name:
            project = piperider_cloud.get_project_by_name(project_name)
            if project is None:
                console.print(f'[[bold red]Error[/bold red]] Project \'{project_name}\' does not exist')
                return 1
        else:
            project = piperider_cloud.get_default_project()

        base_id, target_id = select_cloud_report_ids(base=base, target=target, project=project)
        if base_id is None or target_id is None:
            raise Exception(
                f'No reports found in the project: {project.workspace_name}/{project.name}. '
                f'Please upload reports to PipeRider Cloud first.')

        console.print(f"Creating comparison report id={base_id} ... id={target_id}")

        metadata = fetch_pr_metadata()

        response = create_compare_reports(base_id, target_id, tables_from, project=project, metadata=metadata)
        if response is None:
            console.print('Failed to create the comparison report')
        else:
            url = response.get('url')
            console.print(f'Comparison report URL: {url}?utm_source=cli')

        if debug:
            console.print(response)

        if summary_file:
            summary_file = os.path.abspath(summary_file)
            summary_dir = os.path.dirname(summary_file)
            if summary_dir:
                os.makedirs(summary_dir, exist_ok=True)
            with open(summary_file, 'w', encoding='utf-8') as f:
                f.write(response.get('summary'))

    @staticmethod
    def share_run_report(run_id=None, debug=False, project_name=None):
        if piperider_cloud.available is False:
            console.rule('Please login PipeRider Cloud first', style='red')
            return 1

        if project_name is None:
            workspace_name, project_name = piperider_cloud.get_default_workspace_and_project()
        else:
            workspace_name, project_name = project_name.split('/')

        if workspace_name is None or project_name is None:
            console.rule('Please select a workspace and a project first', style='red')
            return 1

        if debug:
            console.print(f"Sharing comparison report id={run_id}")
        piperider_cloud.share_run_report(
            workspace_name=workspace_name,
            project_name=project_name,
            run_id=run_id
        )

    @staticmethod
    def share_compare_report(base_id=None, target_id=None, debug=False, project_name=None):
        if piperider_cloud.available is False:
            console.rule('Please login PipeRider Cloud first', style='red')
            return 1

        if project_name is None:
            workspace_name, project_name = piperider_cloud.get_default_workspace_and_project()
        else:
            workspace_name, project_name = project_name.split('/')

        if workspace_name is None or project_name is None:
            console.rule('Please select a workspace and a project first', style='red')
            return 1

        if debug:
            console.print(f"Sharing comparison report id={base_id} ... id={target_id}")
        piperider_cloud.share_compare_report(
            workspace_name=workspace_name,
            project_name=project_name,
            base_id=base_id,
            target_id=target_id,
        )

    @staticmethod
    def list_projects(debug=False) -> int:
        if piperider_cloud.available is False:
            console.rule('Please login PipeRider Cloud first', style='red')
            return 1

        projects = piperider_cloud.list_projects()
        # console.print(projects)

        layout_table = Table(
            title="PipeRider Cloud - Project List",
            title_style='bold magenta',
            show_header=True,
            show_edge=True,
            box=box.SIMPLE_HEAVY,
        )
        layout_table.add_column('Name')
        layout_table.add_column('Workspace')
        # layout_table.add_column('Project URL', justify='right', no_wrap=True)

        for project in projects:
            # TODO: Put the project URL in the table once the project URL is available
            # project_id = project.get('id')
            # project_url = f'[deep_sky_blue1]{piperider_cloud.service.cloud_host}/projects/{project_id}[/deep_sky_blue1]'
            project_name = project.get('name') if project.get(
                'workspace_name') is None else f"{project.get('workspace_name')}/{project.get('name')}"
            workspace_name = project.get('workspace_name')
            display_name = project.get('workspace_display_name') if project.get(
                'workspace_display_name') else workspace_name
            layout_table.add_row(
                project_name,
                display_name
                # project_url,
            )

        console.print(layout_table)
        pass

    @staticmethod
    def select_project(project_name: str = None,
                       datasource: str = None,
                       no_interaction: bool = False,
                       debug: bool = False) -> int:

        def _select_project_by_inquirer(project_list: list) -> PipeRiderProject:
            arrow_alias_msg = ''
            if sys.platform == "win32" or sys.platform == "cygwin":
                # change readchar key UP & DOWN by 'w' and 's'
                readchar.key.UP = 'w'
                readchar.key.DOWN = 's'
                arrow_alias_msg = " 'w' to Up, 's' to Down,"

            projects = [
                (f"{p.get('workspace_name')}/{p.get('name')}" if p.get('workspace_name') else p.get('name'),
                 PipeRiderProject(p))
                for p in project_list]

            if len(projects) == 1:
                _, p = projects[0]
                return p

            question = [
                inquirer.List('selected_project',
                              message=f"Please select a project as default project ({arrow_alias_msg} ENTER to confirm )",
                              choices=projects,
                              carousel=True,
                              )
            ]
            answers = inquirer.prompt(question, raise_keyboard_interrupt=True)
            if answers:
                return answers['selected_project']
            return None

        def _select_project_by_rich(project_list: list) -> PipeRiderProject:
            console = Console()
            console.print('[[yellow]?[/yellow]] Please select a project as default project:')
            i = 0
            for p in project_list:
                i += 1
                if p.get('workspace_name'):
                    project_name = f"{p.get('workspace_name')}/{p.get('name')}"
                else:
                    project_name = p.get('name')
                console.print(f"[[blue]{i}[/blue]] {project_name}")

            while True:
                try:
                    type_idx = Prompt.ask('[[yellow]?[/yellow]] Select a number')
                    type_idx = int(type_idx)
                except EOFError as e:
                    raise e
                except Exception:
                    type_idx = 0
                if type_idx > len(project_list) or type_idx < 1:
                    console.print('    [[red]Error[/red]] Input is not a valid index value. Please try again.')
                else:
                    answer = PipeRiderProject(project_list[type_idx - 1])
                    break
            return answer if answer is not None else ''

        if project_name is None:
            existing_project_list = piperider_cloud.list_projects()
            if no_interaction is True:
                if len(existing_project_list) == 0:
                    console.print('[[bold red]Error[/bold red]] No project exists')
                    return 1
                project = PipeRiderProject(existing_project_list[0])
            elif FANCY_USER_INPUT:
                project = _select_project_by_inquirer(existing_project_list)
            else:
                project = _select_project_by_rich(existing_project_list)
        else:
            project = piperider_cloud.get_project_by_name(project_name)
            if project is None:
                console.print(f'[[bold red]Warning[/bold red]] Project \'{project_name}\' does not exist')
                return 1

        name = project.name if project.workspace_name is None else f"{project.workspace_name}/{project.name}"
        piperider_cloud.set_default_project(name)

        # TODO: Add project name into the datasource config if datasource is not None
        console.print(f'[[bold green]Config[/bold green]] Default project is set to \'{name}\'')
        return 0
