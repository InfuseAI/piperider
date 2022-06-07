import os
import json
from re import I
import time
import requests
import portalocker
from datetime import datetime
from piperider_cli.workspace import PIPERIDER_WORKSPACE_NAME

PIPERIDER_EVENT_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, '.unsend_events.json')

class Collector:
    def __init__(self):
        self._api_endpoint = 'https://api.amplitude.com/2/httpapi'
        self._api_key = None
        self._user_id = None

        self._unsend_events_file = PIPERIDER_EVENT_PATH
        self._upload_threshold = 3
        if not os.path.exists(self._unsend_events_file):
            with portalocker.Lock(self._unsend_events_file, 'w+', timeout=5) as f:
                f.write(json.dumps({'unsend_events': []}))

    def set_api_key(self, api_key):
        self._api_key = api_key

    def set_user_id(self, user_id):
        self._user_id = user_id

    def log_event(self, event_type):
        created_at = datetime.now()
        event = dict(user_id=self._user_id, event_type=event_type, time=int(time.mktime(created_at.timetuple())))
        self._store_to_file(event)
        self._send_events_if_ready()

    def _send_events_if_ready(self):
        with portalocker.Lock(self._unsend_events_file, 'r+', timeout=5) as f:
            o = json.loads(f.read())
            if len(o.get('unsend_events', [])) < self._upload_threshold:
                return
            payload = dict(
                api_key=self._api_key,
                events=o['unsend_events'],
            )
            print('sending')
            print(payload)
            ret = requests.post(self._api_endpoint, json=payload)
            print(type(ret.status_code))
            print(ret.status_code)
            if ret.status_code == 200:
                o['unsend_events'] = []
                f.seek(0)
                f.truncate()
                f.write(json.dumps(o))
            else:
                # TODO: handle error
                print(ret.text)
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