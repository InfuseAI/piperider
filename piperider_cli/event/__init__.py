import os
import threading
import uuid
from typing import Union

import sentry_sdk
from rich.console import Console
from piperider_cli import yaml as pyml

from piperider_cli import PIPERIDER_USER_HOME, PIPERIDER_USER_PROFILE, is_executed_manually
from piperider_cli.event.collector import Collector
from .events import CompareEventPayload

PIPERIDER_USER_EVENT_PATH = os.path.join(PIPERIDER_USER_HOME, '.unsend_events.json')
PIPERIDER_FLUSH_EVENTS_WHITELIST = ['init', 'run', 'generate-report', 'compare-reports', 'compare']

_collector = Collector()
user_profile_lock = threading.Lock()


def init():
    api_key = _get_api_key()
    user_profile = load_user_profile()

    _collector.set_api_key(api_key)
    _collector.set_user_id(user_profile.get('user_id'))
    _collector.set_unsend_events_file(PIPERIDER_USER_EVENT_PATH)


def load_user_profile():
    # can be called by multiple threads from capture_exception
    with user_profile_lock:
        if not os.path.exists(PIPERIDER_USER_PROFILE):
            user_profile = _generate_user_profile()
        else:
            with open(PIPERIDER_USER_PROFILE, 'r') as f:
                user_profile = pyml.load(f)
                if user_profile.get('user_id') is None:
                    user_profile = _generate_user_profile()

        return user_profile


def update_user_profile(update_values):
    original = load_user_profile()
    original.update(update_values)
    with open(PIPERIDER_USER_PROFILE, 'w+') as f:
        pyml.dump(original, f)
    return original


def _get_api_key():
    from piperider_cli import data
    config_file = os.path.abspath(os.path.join(os.path.dirname(data.__file__), 'CONFIG'))
    try:
        with open(config_file) as fh:
            config = pyml.load(fh)
            return config.get('event_api_key')
    except Exception:
        return None


def _generate_user_profile():
    try:
        os.makedirs(PIPERIDER_USER_HOME, exist_ok=True)
    except Exception:
        # TODO: should show warning message but not raise exception
        print('Please disable command tracking to continue.')
        exit(1)

    user_id = uuid.uuid4().hex
    with open(PIPERIDER_USER_PROFILE, 'w+') as f:
        pyml.dump({'user_id': user_id, 'anonymous_tracking': True}, f)
    return dict(user_id=user_id, anonymous_tracking=True)


def _obtain_project_info(datasource=None):
    try:
        from piperider_cli.configuration import Configuration
        datasource_types = []
        project_type = '-'
        configuration = Configuration.instance()
        for ds in configuration.dataSources:
            if datasource and ds.name != datasource:
                continue
            dbt = ds.args.get('dbt')
            if project_type == '-' and dbt is not None:
                project_type = 'dbt'
            datasource_types.append(ds.type_name)
        return dict(
            project_id=configuration.get_telemetry_id(),
            project_type=project_type,
            datasource_types=datasource_types,
        )
    except Exception:
        return {
            'project_id': '(not init)'
        }


def flush_events(command=None):
    if command and command in PIPERIDER_FLUSH_EVENTS_WHITELIST:
        _collector.send_events()


def log_event(prop, event_type, **kwargs):
    with open(PIPERIDER_USER_PROFILE, 'r') as f:
        user_profile = pyml.load(f)
    # TODO: default anonymous_tracking to false if field is not present
    tracking = user_profile.get('anonymous_tracking', False)
    tracking = tracking and isinstance(tracking, bool)
    if not tracking:
        return

    if not _collector.is_ready():
        return

    ds = None
    if kwargs.get('params'):
        ds = kwargs.get('params').get('datasource')
    project_info = _obtain_project_info(datasource=ds)

    if not project_info.get('project_id'):
        return

    payload = dict(
        **project_info,
        **prop,
    )
    _collector.log_event(payload, event_type)


def capture_exception(e):
    user_id = load_user_profile().get('user_id')
    if is_executed_manually() is False:
        project_info = _obtain_project_info()
        project_id = project_info.get('project_id')
        if not project_id:
            return
        user_id = f"{project_id}_CI"

    sentry_sdk.set_tag("user_id", user_id)
    sentry_sdk.capture_exception(e)


def flush_exceptions():
    sentry_sdk.flush()


class UserProfileConfigurator(object):
    @staticmethod
    def update(key: str, val: Union[str, bool], name: str = None):
        console = Console()
        display_name = name or key.replace('_', ' ').title()
        console.print(f'[[bold green]Config[/bold green]] Default {display_name} behavior is set to {val}')
        update_user_profile({key: val})
