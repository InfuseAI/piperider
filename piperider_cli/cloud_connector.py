import webbrowser

from rich.console import Console
from rich.prompt import Prompt

from piperider_cli.cloud import PipeRiderCloud

console = Console()
piperider_cloud = PipeRiderCloud()


def ask_login_info():
    console.print('Please provide available email account to login')
    account = Prompt.ask('[[yellow]?[/yellow]] Email address')

    response = piperider_cloud.magic_login(account)
    if response is None or response.get('success') is False:
        # Login failed
        return False

    if response.get('link'):
        webbrowser.open(response.get('link'))

    console.print('Please paste the api token from magic link. The link had be send to your email address.')
    api_token = Prompt.ask('[[yellow]?[/yellow]] API Token')
    if piperider_cloud.validate(api_token) is False:
        # Invalid API Token
        return False

    # Write API Token back to user profile
    piperider_cloud.service.update_configuration()
    console.rule('Login Success')
    return True


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
    def upload_report():
        # TODO: move the code from cli.py
        pass
