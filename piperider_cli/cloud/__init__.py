import json
import os
from io import BytesIO, StringIO

import requests
from ruamel import yaml

PIPERIDER_USER_HOME = os.path.expanduser('~/.piperider')
PIPERIDER_USER_PROFILE = os.path.join(PIPERIDER_USER_HOME, 'profile.yml')

PIPERIDER_CLOUD_SERIVCE = 'https://cloud.piperider.io/'

SERVICE_ENV_API_KEY = 'PIPERIDER_API_TOKEN'
SERVICE_ENV_SERVICE_KEY = 'PIPERIDER_API_SERVICE'

yml = yaml.YAML()


class CloudServiceHelper:

    def __init__(self):
        self.api_token: str = None
        self.api_service: str = None
        try:
            with open(PIPERIDER_USER_PROFILE, 'r') as f:
                self.user_profile = yml.load(f)
        except BaseException:
            self.user_profile = None

        if self.user_profile is None:
            return

        self.load_configuration()

    def load_configuration(self):
        # load from the configuration file first
        # overwrite them if found env vars

        self.api_service = self.user_profile.get('api_service', PIPERIDER_CLOUD_SERIVCE)
        if os.environ.get(SERVICE_ENV_SERVICE_KEY):
            self.api_service = os.environ.get(SERVICE_ENV_SERVICE_KEY)
        self.api_token = self.user_profile.get('api_token')
        if os.environ.get(SERVICE_ENV_API_KEY):
            self.api_token = os.environ.get(SERVICE_ENV_API_KEY)

    def url(self, uri_path: str):
        if uri_path and not uri_path.startswith('/'):
            uri_path = f'/{uri_path}'

        if self.api_service and self.api_service.endswith('/'):
            return f'{self.api_service}{uri_path}'
        return f'{self.api_service}/{uri_path}'

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

    def me(self):
        if not self.available:
            self.raise_error()
        return self.service.http_get('/api/users/me')

    def upload_report(self, report_json_content, project: str = 'default'):
        # TODO validate project name
        if not self.available:
            self.raise_error()

        buffer = StringIO(report_json_content)
        url = self.service.url('/api/reports/upload')
        response = requests.post(
            url,
            data={"project": project},
            files={"file": ('run.json', buffer)}, headers=self.service.auth_headers())
        return response.json()

    def raise_error(self):
        raise ValueError("Service not available or configuration invalid")

    def has_configured(self):
        return self.service.api_token is not None


if __name__ == '__main__':
    cloud = PipeRiderCloud()
    cloud.upload_report(json.dumps(dict(foo='barbar')))
