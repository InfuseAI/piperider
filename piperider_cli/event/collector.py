import os
import json
import sys
from re import I
import time
import requests
import portalocker
from datetime import datetime
from piperider_cli import __version__
from piperider_cli.configuration import PIPERIDER_WORKSPACE_NAME

PIPERIDER_WORKING_DIR = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME)
PIPERIDER_EVENT_PATH = os.path.join(PIPERIDER_WORKING_DIR, '.unsend_events.json')


class Collector:
    def __init__(self):
        self._api_endpoint = 'https://api.amplitude.com/2/httpapi'
        self._api_key = None
        self._user_id = None

        self._unsend_events_file = PIPERIDER_EVENT_PATH
        self._delete_threshold = 1000
        self._upload_threshold = 10

        self._check_required_files()

    def is_ready(self):
        if self._api_key is None or self._user_id is None:
            return False
        return True

    def set_api_key(self, api_key):
        self._api_key = api_key

    def set_user_id(self, user_id):
        self._user_id = user_id

    def log_event(self, prop, event_type):
        # Use local timezone
        created_at = datetime.now()
        python_version = f'{sys.version_info.major}.{sys.version_info.minor}'
        event = dict(
            user_id=self._user_id,
            event_type=event_type,
            ip='$remote',
            time=int(time.mktime(created_at.timetuple())),
            user_properties=dict(
                version=__version__,
                python_version=python_version,
            ),
            event_properties=prop,
        )

        # TODO: handle exception when writing to file
        self._store_to_file(event)
        if self._is_full():
            self.send_events()
        self._cleanup_unsend_events()

    def _check_required_files(self):
        if not os.path.exists(PIPERIDER_WORKING_DIR):
            os.makedirs(PIPERIDER_WORKING_DIR, exist_ok=True)
        if not os.path.exists(self._unsend_events_file):
            with portalocker.Lock(self._unsend_events_file, 'w+', timeout=5) as f:
                f.write(json.dumps({'unsend_events': []}))

    def _is_full(self):
        with portalocker.Lock(self._unsend_events_file, 'r+', timeout=5) as f:
            o = json.loads(f.read())
            return len(o.get('unsend_events', [])) >= self._upload_threshold

    def send_events(self):
        with portalocker.Lock(self._unsend_events_file, 'r+', timeout=5) as f:
            o = json.loads(f.read())
            payload = dict(
                api_key=self._api_key,
                events=o['unsend_events'],
            )
            # TODO: handle exception when sending events
            try:
                ret = requests.post(self._api_endpoint, json=payload)
                if ret.status_code == 200:
                    o['unsend_events'] = []
                    f.seek(0)
                    f.truncate()
                    f.write(json.dumps(o))
                else:
                    # TODO: handle error
                    pass
            except Exception:
                pass

    def _store_to_file(self, event):
        with portalocker.Lock(self._unsend_events_file, 'r+', timeout=5) as f:
            o = json.loads(f.read())
            events = o.get('unsend_events', None)
            if events is None:
                o['unsend_events'] = []

            o['unsend_events'].append(event)
            f.seek(0)
            f.truncate()
            f.write(json.dumps(o))

    def _cleanup_unsend_events(self):
        with portalocker.Lock(self._unsend_events_file, 'r+', timeout=5) as f:
            o = json.loads(f.read())
            events = o.get('unsend_events', None)
            if events is None:
                o['unsend_events'] = []

            while len(o['unsend_events']) > self._delete_threshold:
                o['unsend_events'].pop(0)

            f.seek(0)
            f.truncate()
            f.write(json.dumps(o))
