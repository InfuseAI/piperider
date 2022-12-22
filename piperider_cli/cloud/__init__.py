import json
import os

import requests
from requests_toolbelt import MultipartEncoder, MultipartEncoderMonitor
from rich.progress import Progress, TextColumn, BarColumn, DownloadColumn, TimeElapsedColumn
from ruamel import yaml

from piperider_cli import __version__
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

    @property
    def cloud_host(self):
        if 'localhost' in self.api_service:
            return 'http://localhost:3000'
        return self.api_service

    def load_configuration(self):
        # load from the configuration file first
        # overwrite them if found env vars
        self.api_service = os.environ.get(SERVICE_ENV_SERVICE_KEY,
                                          self.user_profile.get('api_service',
                                                                PIPERIDER_CLOUD_SERVICE))
        self.api_token = os.environ.get(SERVICE_ENV_API_KEY,
                                        self.user_profile.get('api_token'))

    def get_config(self) -> dict:
        config = self.user_profile.get('cloud_config', {})
        return config if config else {}

    def update_config(self, options: dict):
        cloud_config = self.get_config()
        cloud_config.update(options)
        update_user_profile({'cloud_config': cloud_config})

    def update_api_token(self):
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
        return {
            'User-Agent': f'PipeRider CLI/{__version__}',
            'Authorization': f'Bearer {self.api_token}',
        }

    def http_get(self, uri_path):
        try:
            return requests.get(
                self.url(uri_path),
                headers=self.auth_headers()) \
                .json()
        except BaseException:
            return None

    def validate(self) -> (bool, dict):
        if not (self.api_token and self.api_service):
            return False, None

        json_resp = self.http_get('/api/users/me')
        if json_resp and 'email' in json_resp:
            return True, json_resp
        return False, None


class PipeRiderCloud:

    def __init__(self):
        self.service = CloudServiceHelper()
        self.config: dict = self.service.get_config()
        try:
            self.available, self.me = self.service.validate()
        except BaseException:
            self.available = False
            self.me = None

    def update_config(self, options: dict):
        self.service.update_config(options)
        self.config = self.service.get_config()

    def validate(self, api_token=None):
        if api_token:
            self.service.api_token = api_token

        try:
            self.available, self.me = self.service.validate()
        except BaseException:
            self.available = False
            self.me = None

        return self.available

    def logout(self):
        self.service.api_token = None
        self.service.update_api_token()

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

    def get_default_project(self):
        if not self.available:
            self.raise_error()

        url = self.service.url('/api/projects')
        headers = self.service.auth_headers()
        response = requests.get(url, headers=headers)

        if response.status_code != 200:
            return None

        for project in response.json():
            if project.get('is_default'):
                return project.get('id')

    def list_reports(self, project_id, datasource=None):
        if not self.available:
            self.raise_error()

        url = self.service.url(f'/api/projects/{project_id}/reports')
        if datasource:
            url = self.service.url(f'/api/projects/{project_id}/reports?datasource={datasource}')

        headers = self.service.auth_headers()
        response = requests.get(url, headers=headers)

        if response.status_code != 200:
            return None

        return response.json()

    def upload_report(self, file_path, show_progress=True):
        # TODO validate project name
        if not self.available:
            self.raise_error()

        upload_progress = None
        task_id = None

        def _upload_callback(monitor):
            if show_progress and upload_progress:
                upload_progress.update(task_id, completed=monitor.bytes_read)

        with open(file_path, 'rb') as file:
            encoder = MultipartEncoder(
                fields={'file': ('run.json', file)},
            )
            m = MultipartEncoderMonitor(encoder, _upload_callback)

            url = self.service.url('/api/reports/upload')
            headers = self.service.auth_headers()
            headers['Content-Type'] = m.content_type

            if show_progress:
                upload_progress = Progress(
                    TextColumn("[bold magenta]{task.description}[/bold magenta]"),
                    BarColumn(bar_width=80),
                    DownloadColumn(binary_units=True),
                    TimeElapsedColumn(),
                )
                task_id = upload_progress.add_task(description=file_path, total=encoder.len)
                upload_progress.start()

            response = requests.post(url, data=m, headers=headers)

            if show_progress:
                upload_progress.stop()

            return response.json()

    def compare_reports(self, project_id, base_id: int, target_id: int, tables_from):
        if not self.available:
            self.raise_error()

        url = self.service.url(f'/api/projects/{project_id}/reports/{base_id}/compare/{target_id}')
        headers = self.service.auth_headers()
        response = requests.post(url, data=json.dumps({'tables_from': tables_from}), headers=headers)

        if response.status_code != 200:
            return None

        return response.json()

    def raise_error(self):
        raise ValueError("Service not available or configuration invalid")

    def has_configured(self):
        return self.service.api_token is not None


if __name__ == '__main__':
    cloud = PipeRiderCloud()
    cloud.upload_report(json.dumps(dict(foo='barbar')))
