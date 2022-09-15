import os
import sys

import inquirer
import requests
from rich.console import Console
from rich.prompt import Prompt

from piperider_cli import __version__, get_user_id

USER_FEEDBACK_API_TOKEN = '371aa67a-a6eb-44cc-9d02-4a05810f24ac'


def _feedback_collector(message, email=None, version=__version__):
    try:
        user_id = get_user_id()
        json_payload = {
            'user_id': user_id,
            'message': message,
            'email': email,
            'version': version,
        }
        url = f'https://api.aws.piperider.io/v1/feedback?token={USER_FEEDBACK_API_TOKEN}'
        requests.post(url, json=json_payload)
    except Exception:
        pass


def _should_use_fancy_user_input() -> bool:
    env_flag = os.environ.get('PIPERIDER_FANCY_USER_INPUT', 'true').lower() == 'true'
    is_a_tty = sys.stdin.isatty() and sys.stdout.isatty()
    if env_flag is False:
        return False
    if is_a_tty is False:
        return False
    if sys.platform == "darwin" or sys.platform == "linux":
        return True
    else:
        return False


FANCY_USER_INPUT = _should_use_fancy_user_input()


def _feedback_by_inquirer():
    console = Console()
    console.print('[bold dark_orange]Please specify your feedback messages[/bold dark_orange]')
    questions = [
        inquirer.Editor('message', message="Feedback"),
        inquirer.Text('email', message="Contact email (Optional)")
    ]
    feedback = inquirer.prompt(questions, raise_keyboard_interrupt=True)
    _feedback_collector(feedback['message'], feedback['email'])


def _feedback_by_rich():
    console = Console()
    console.print('[bold dark_orange]Please specify your feedback messages[/bold dark_orange]')
    message = Prompt.ask("Feedback")
    email = Prompt.ask("Contact email (Optional)")
    _feedback_collector(message, email)


class Feedback:
    @staticmethod
    def exec():
        if FANCY_USER_INPUT:
            _feedback_by_inquirer()
        else:
            _feedback_by_rich()

    @staticmethod
    def suggest_datasource(data_source_name):
        _feedback_collector(f'Feature request datasource: {data_source_name}')
        pass
