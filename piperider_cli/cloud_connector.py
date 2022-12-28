import os
import webbrowser
from typing import List, Optional

import inquirer
from rich import box
from rich.console import Console
from rich.prompt import Prompt
from rich.table import Table

from piperider_cli import datetime_to_str, open_report_in_browser, str_to_datetime
from piperider_cli.cloud import PipeRiderCloud
from piperider_cli.compare_report import CompareReport, RunOutput
from piperider_cli.datasource import FANCY_USER_INPUT
from piperider_cli.filesystem import FileSystem

console = Console()
piperider_cloud = PipeRiderCloud()


def ask_login_info() -> str:
    console.print('Please provide available email account to login')
    if FANCY_USER_INPUT:
        account = inquirer.text('Email address', validate=lambda _, x: '@' in x)
    else:
        while True:
            account = Prompt.ask('[[yellow]?[/yellow]] Email address')
            if '@' in account:
                break

    response = piperider_cloud.magic_login(account)
    if response is None or response.get('success') is False:
        console.print('[[red]Error[/red]] Login failed. Please try again.')
        return None

    if response.get('link'):
        webbrowser.open(response.get('link'))

    console.print('Please paste the api token from magic link. The link has been sent to your email address.')
    while True:
        api_token = Prompt.ask('[[yellow]?[/yellow]] API token')
        if len(api_token) > 0:
            break
    return api_token


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


def check_default_config(options: dict):
    if options is None:
        return

    cloud_config = piperider_cloud.config

    auto_upload_flag = options.get('auto_upload')

    if cloud_config.get('auto_upload') is not None and auto_upload_flag is None:
        # Skip if auto_upload is already set
        return
    if auto_upload_flag is None and cloud_config.get('auto_upload') is None:
        console.print('Please select default behavior for auto upload')
        if FANCY_USER_INPUT:
            auto_upload_flag = inquirer.confirm('Auto upload reports to cloud', default=True)
        else:
            auto_upload_flag = Prompt.ask('[[yellow]?[/yellow]] Auto upload reports to cloud', choices=['y', 'n'],
                                          default='y') == 'y'
    console.print(f'[[bold green]Config[/bold green]] Default auto upload behavior is set to {auto_upload_flag}')
    piperider_cloud.update_config({'auto_upload': auto_upload_flag})


def select_reports(report_dir=None, datasource=None) -> List[RunOutput]:
    filesystem = FileSystem(report_dir=report_dir)
    selector = CompareReport(filesystem.get_output_dir(), None, None, datasource=datasource)
    console.rule('Select Reports to Upload')
    return selector.select_multiple_reports(action='upload')


def upload_to_cloud(report: RunOutput, debug=False) -> dict:
    response = piperider_cloud.upload_report(report.path)
    # TODO refine the output when API is ready

    if response.get('success') is True:
        project_id = response.get('project_id')
        report_id = response.get('id')
        if project_id and report_id:
            report_url = f'{piperider_cloud.service.cloud_host}/projects/{project_id}/reports/{report_id}'
        else:
            report_url = 'N/A'
        return {
            'success': True,
            'message': response.get("message"),
            'report_url': report_url,
            'file_path': report.path
        }

    if debug:
        console.print(response)
    return {
        'success': False,
        'message': response.get("message"),
        'report_url': 'N/A',
        'file_path': report.path
    }


def get_run_report_id(report_key: str) -> Optional[int]:
    if report_key.isdecimal():
        if int(report_key) < 1:
            return None
        return int(report_key)

    if report_key.startswith('datasource:'):
        datasource = report_key.split(':')[-1]
        project_id = piperider_cloud.get_default_project()
        reports = piperider_cloud.list_reports(project_id, datasource=datasource)

        if reports:
            return reports[0].get('id')

    return None


def create_compare_reports(base_id: int, target_id: int, tables_from) -> dict:
    project_id = piperider_cloud.get_default_project()
    response = piperider_cloud.compare_reports(project_id, base_id, target_id, tables_from)
    if response is not None:
        url = f'{piperider_cloud.service.cloud_host}/projects/{project_id}/reports/{base_id}/comparison/{target_id}'
        console.print(f'Comparison report URL: {url}')
    else:
        console.print('Failed to create the comparison report')
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
    def login(api_token=None, options: dict = None, debug=False):

        if piperider_cloud.available:
            console.rule('Already Logged In')
            show_user_info()
            check_default_config(options)
            return 0

        if api_token is None:
            api_token = ask_login_info()

        if api_token:
            if verify_api_token(api_token):
                console.rule('Login Successful')
                show_user_info()
                check_default_config(options)
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
    def upload_latest_report(report_dir=None, debug=False, open_report=False, force_upload=False, auto_upload=False) -> int:
        filesystem = FileSystem(report_dir=report_dir)
        latest_report_path = os.path.join(filesystem.get_output_dir(), 'latest', 'run.json')
        return CloudConnector.upload_report(latest_report_path, debug=debug, open_report=open_report, force_upload=force_upload, auto_upload=auto_upload)

    @staticmethod
    def upload_report(report_path=None, report_dir=None, datasource=None, debug=False, open_report=False, force_upload=False, auto_upload=False) -> int:
        if piperider_cloud.available is False:
            console.rule('Please login PipeRider Cloud first', style='red')
            return 1

        rc = 0
        results = []
        if report_path is None:
            reports = select_reports(report_dir=report_dir, datasource=datasource)
            console.rule('Uploading Reports')
            for r in reports:
                response = upload_to_cloud(r, debug)
                if response.get('success') is False:
                    rc = 1
                response['name'] = r.name
                response['created_at'] = r.created_at
                results.append(response)
        else:
            console.rule('Uploading Report')
            report = RunOutput(report_path)
            response = upload_to_cloud(report, debug)
            if response.get('success') is False:
                rc = 1
            response['name'] = report.name
            response['created_at'] = report.created_at
            results.append(response)

        console.rule('Upload Completed')
        ascii_table = Table(show_header=True, show_edge=True, header_style="bold magenta",
                            box=box.SIMPLE)
        ascii_table.add_column('Status', justify='left', style='cyan')
        ascii_table.add_column('Name', justify='left')
        ascii_table.add_column('Created At', justify='left')
        ascii_table.add_column('Report URL', justify='left', no_wrap=True)
        ascii_table.add_column('Message', justify='left')

        for response in results:
            status = '[bold green]Success[/bold green]' if response.get(
                'success') else '[bold yellow]Skipped[/bold yellow]'
            url = f"[deep_sky_blue1]{response.get('report_url', 'N/A')}[/deep_sky_blue1]"
            message = response.get('message')
            created_at = datetime_to_str(str_to_datetime(response.get('created_at')), to_tzlocal=True)
            ascii_table.add_row(status, response.get('name'), created_at, url, message)

        if open_report:
            url = response.get('report_url')
            open_report_in_browser(url, True)

        console.print(ascii_table)
        return rc

    @staticmethod
    def compare_reports(base=None, target=None, tables_from='all', summary_file=None, debug=False) -> int:
        if piperider_cloud.available is False:
            console.rule('Please login PipeRider Cloud first', style='red')
            return 1

        base_id = get_run_report_id(base)
        target_id = get_run_report_id(target)

        if base_id is None or target_id is None:
            console.print('No report found.')
            return 1

        console.print(f"Creating comparison report id={base_id} ... id={target_id}")
        response = create_compare_reports(base_id, target_id, tables_from)

        if debug:
            console.print(response)

        if summary_file:
            summary_file = os.path.abspath(summary_file)
            summary_dir = os.path.dirname(summary_file)
            if summary_dir:
                os.makedirs(summary_dir, exist_ok=True)
            with open(summary_file, 'w') as f:
                f.write(response.get('summary'))
