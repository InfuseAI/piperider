import os
import webbrowser

import inquirer
from rich.console import Console
from rich.prompt import Prompt

from piperider_cli.cloud import PipeRiderCloud
from piperider_cli.compare_report import CompareReport
from piperider_cli.datasource import FANCY_USER_INPUT
from piperider_cli.filesystem import FileSystem

console = Console()
piperider_cloud = PipeRiderCloud()


def ask_login_info():
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
        return False

    if response.get('link'):
        webbrowser.open(response.get('link'))

    console.print('Please paste the api token from magic link. The link has been sent to your email address.')
    while True:
        api_token = Prompt.ask('[[yellow]?[/yellow]] API token')
        if len(api_token) > 0:
            break

    if piperider_cloud.validate(api_token) is False:
        console.print('[[red]Error[/red]] Invalid API Token. Please try again.')
        return False

    # Write API Token back to user profile
    piperider_cloud.service.update_configuration()
    console.rule('Login Success')
    return True


def select_a_report():
    pass


class CloudConnector():
    @staticmethod
    def login():
        console.rule('Login')

        if piperider_cloud.available:
            console.print(f'Already login by [bold green]{piperider_cloud.me().get("email")}[/bold green]')
            return 0

        ask_login_info()

        pass

    @staticmethod
    def logout():
        console.rule('Logout')

        if piperider_cloud.available is False:
            console.print('[[bold yellow]Skip[/bold yellow]] Already logout')
            return 0

        piperider_cloud.logout()
        console.print('[[bold green]Done[/bold green]] Removed API Token from user profile')
        return 0

    @staticmethod
    def upload_report(report_path=None, report_dir=None, datasource=None, debug=False):
        console.rule('Upload Report')

        def upload_to_cloud(path):
            if not os.path.exists(path):
                raise FileNotFoundError(f'File not found: {path}')

            console.print(f'Uploading report [bold green]{path}[/bold green]')
            response = piperider_cloud.upload_report(path)
            # TODO refine the output when API is ready
            if response.get('success') is True:
                return 0

            console.print(f'[[bold yellow]Skipped[/bold yellow]] Reason: {response.get("message")}')
            if debug:
                console.print(response)
            return 1

        rc = 0
        filesystem = FileSystem(report_dir=report_dir)
        report = CompareReport(filesystem.get_output_dir(), None, None, datasource=datasource)
        if report_path is None:
            for r in report.select_multiple_reports(action='upload'):
                ret = upload_to_cloud(r.path)
                rc = ret if rc == 0 else rc
        else:
            rc = upload_to_cloud(report_path)

        if rc == 0:
            console.rule('Upload Success')
        return rc
