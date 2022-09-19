import json
import os

import requests
from rich.progress import open
from ruamel import yaml

from piperider_cli.event import load_user_profile, update_user_profile

PIPERIDER_CLOUD_SERVICE = 'https://cloud.piperider.io/'

SERVICE_ENV_API_KEY = 'PIPERIDER_API_TOKEN'
SERVICE_ENV_SERVICE_KEY = 'PIPERIDER_API_SERVICE'

yml = yaml.YAML()


class CloudServiceHelper:

    def __init__(self):
        self.api_token: str = None
        self.api_service: str = None
        self.user_profile = load_user_profile()
        if self.user_profile is None:
            return

        self.load_configuration()

    def load_configuration(self):
        # load from the configuration file first
        # overwrite them if found env vars
        self.api_service = os.environ.get(SERVICE_ENV_SERVICE_KEY,
                                          self.user_profile.get('api_service',
                                                                PIPERIDER_CLOUD_SERVICE))
        self.api_token = os.environ.get(SERVICE_ENV_API_KEY,
                                        self.user_profile.get('api_token'))

    def update_configuration(self):
        if self.api_token:
            update_user_profile({'api_token': self.api_token})
        else:
            update_user_profile({'api_token': None})

    def url(self, uri_path: str):
        if uri_path and not uri_path.startswith('/'):
            uri_path = f'/{uri_path}'

        if self.api_service and self.api_service.endswith('/'):
            return f'{self.api_service[:-1]}{uri_path}'
        return f'{self.api_service}{uri_path}'

    def auth_headers(self):
        return dict(Authorization=f'Bearer {self.api_token}')

    def http_get(self, uri_path):
        try:
            return requests.get(
                self.url(uri_path),
                headers=self.auth_headers()) \
                .json()
        except BaseException:
            return None

    def validate(self):
        if not (self.api_token and self.api_service):
            return False

        json_resp = self.http_get('/api/users/me')
        if json_resp and 'email' in json_resp:
            return True
        return False


class PipeRiderCloud:

    def __init__(self):
        self.service = CloudServiceHelper()
        try:
            self.available = self.service.validate()
        except BaseException:
            self.available = False

    def validate(self, api_token=None):
        if api_token:
            self.service.api_token = api_token

        try:
            self.available = self.service.validate()
        except BaseException:
            self.available = False

        return self.available

    def logout(self):
        self.service.api_token = None
        self.service.update_configuration()

    def magic_login(self, email):
        if self.available:
            return True
        login_url = self.service.url('/api/session/new')
        response = requests.post(
            login_url,
            headers={'Content-type': 'application/json', 'Accept': 'text/plain'},
            data=json.dumps({'email': email})
        )
        if response.status_code == 200:
            return response.json()
        return None

    def me(self):
        if not self.available:
            self.raise_error()
        return self.service.http_get('/api/users/me')

    def upload_report(self, file_path, show_progress=False):
        # TODO validate project name
        if not self.available:
            self.raise_error()

        with open(file_path, 'rb') as file:
            url = self.service.url('/api/reports/upload')
            response = requests.post(
                url,
                files={"file": ('run.json', file)}, headers=self.service.auth_headers())
            if response.status_code == 200:
                return response.json()
            else:
                return response.json()

    def raise_error(self):
        raise ValueError("Service not available or configuration invalid")

    def has_configured(self):
        return self.service.api_token is not None


if __name__ == '__main__':
    cloud = PipeRiderCloud()
    cloud.upload_report(json.dumps(dict(foo='barbar')))
