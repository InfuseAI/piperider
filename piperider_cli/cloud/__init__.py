import json
import os
from typing import List

import requests
from requests_toolbelt import MultipartEncoder, MultipartEncoderMonitor
from rich.progress import Progress, TextColumn, BarColumn, DownloadColumn, TimeElapsedColumn
from ruamel import yaml

from piperider_cli import __version__
from piperider_cli.error import PipeRiderNoDefaultProjectError
from piperider_cli.event import load_user_profile, update_user_profile

PIPERIDER_CLOUD_SERVICE = 'https://cloud.piperider.io/'

SERVICE_ENV_API_KEY = 'PIPERIDER_API_TOKEN'
SERVICE_ENV_SERVICE_KEY = 'PIPERIDER_API_SERVICE'

yml = yaml.YAML()


class PipeRiderProject(object):
    def __init__(self, project: dict):
        self.id = project.get('id')
        self.name = project.get('name')
        self.workspace_name = project.get('workspace_name')


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

        json_resp = self.http_get('/api/v2/users/me')
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

        # remove the default project when logout
        self.update_config({'default_project': None})

    def magic_signup(self, email: str, username: str = None):
        if self.available:
            return True
        signup_url = self.service.url('/api/v2/credentials/signup')
        payload = {'email': email, 'source': 'cli'}
        if username:
            payload['username'] = username
        response = requests.post(
            signup_url,
            headers={'Content-type': 'application/json', 'Accept': 'text/plain'},
            data=json.dumps(payload)
        )
        if response.status_code == 200:
            return response.json()
        return None

    def magic_login(self, email):
        if self.available:
            return True
        login_url = self.service.url('/api/v2/session/new')
        response = requests.post(
            login_url,
            headers={'Content-type': 'application/json', 'Accept': 'text/plain'},
            data=json.dumps({'email': email, 'source': 'cli'})
        )
        if response.status_code == 200:
            return response.json()
        return None

    def set_default_project(self, project_name):
        self.update_config({'default_project': project_name})

    def get_default_project(self) -> PipeRiderProject:
        if not self.available:
            self.raise_error()

        if self.config.get('default_project'):
            name = self.config.get('default_project')
            project = self.get_project_by_name(name)
            if project:
                return project

        url = self.service.url('/api/v2/workspaces')
        headers = self.service.auth_headers()
        response = requests.get(url, headers=headers)

        if response.status_code != 200:
            return None

        responseData = response.json()

        def genProjects():
            for workspace in responseData.get('data', []):
                for project in workspace.get('projects', []):
                    yield project

        projects = list(genProjects())
        if len(projects) == 1:
            return PipeRiderProject(projects[0])
        else:
            raise PipeRiderNoDefaultProjectError()

    def get_default_workspace_and_project(self):
        if not self.available:
            self.raise_error()

        if self.config.get('default_project'):
            name = self.config.get('default_project')
            workspace_name, project_name = name.split('/')
            return workspace_name, project_name

        # Query workspace
        url = self.service.url('/api/v2/workspaces')
        headers = self.service.auth_headers()
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            return None, None

        response = response.json()
        if len(response.get('data', [])) == 0:
            return None, None
        workspace = response.get('data')[0]
        workspace_name = workspace.get('name')
        project_name = None
        for p in workspace.get('projects', [])[:1]:
            project_name = p.get('name')
            break

        return workspace_name, project_name

    def list_reports(self, project: PipeRiderProject, datasource=None):
        if not self.available:
            self.raise_error()

        url = self.service.url(f'/api/v2/workspaces/{project.workspace_name}/projects/{project.name}/runs')

        if datasource:
            url = self.service.url(
                f'/api/v2/workspaces/{project.workspace_name}/projects/{project.name}/runs?datasource={datasource}')

        headers = self.service.auth_headers()
        response = requests.get(url, headers=headers)

        if response.status_code != 200:
            return []

        return response.json()

    def upload_run(self, file_path, show_progress=True, project: PipeRiderProject = None):
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

            url = self.service.url(
                f'/api/v2/workspaces/{project.workspace_name}/projects/{project.name}/runs/upload')
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

    def compare_reports(self, base_id: int, target_id: int, tables_from, project: PipeRiderProject):
        if not self.available:
            self.raise_error()

        url = self.service.url(
            f'/api/v2/workspaces/{project.workspace_name}/projects/{project.name}/runs/{base_id}/compare/{target_id}')
        headers = self.service.auth_headers()
        response = requests.post(url, data=json.dumps({'tables_from': tables_from}), headers=headers)

        if response.status_code != 200:
            return None

        return response.json()

    def share_compare_report(self, workspace_name: str, project_name: str, base_id: int, target_id: int):
        if not self.available:
            self.raise_error()

        url = self.service.url(
            f'/api/v2/workspaces/{workspace_name}/projects/{project_name}/runs/{base_id}/compare/{target_id}/share')
        headers = self.service.auth_headers()
        response = requests.post(url, headers=headers)

        if response.status_code != 200:
            return None

        return response.json()

    def raise_error(self):
        raise ValueError("Service not available or configuration invalid")

    def has_configured(self):
        return self.service.api_token is not None

    def list_projects(self) -> List[dict]:
        if not self.available:
            self.raise_error()

        url = self.service.url('/api/v2/workspaces')
        headers = self.service.auth_headers()
        response = requests.get(url, headers=headers)

        if response.status_code != 200:
            return None

        data = response.json()
        output = []

        if not data.get('success'):
            return None

        data = data.get('data')

        def _parse_projects_with_workspace_list(x):
            for project in x.get('projects', []):
                p = {
                    'id': project.get('id'),
                    'name': project.get('name'),
                    'workspace_name': x.get('name'),
                    'workspace_display_name': x.get('display_name'),
                }
                output.append(p)

        for x in data:
            _parse_projects_with_workspace_list(x)
        return output

    def get_project_by_name(self, name) -> PipeRiderProject:
        workspace_name = None
        if '/' in name:
            workspace_name, project_name = name.split('/')
        else:
            project_name = name

        projects = self.list_projects()
        for project in projects:
            if project.get('name') == project_name and project.get('workspace_name') == workspace_name:
                return PipeRiderProject(project)
        return None


if __name__ == '__main__':
    cloud = PipeRiderCloud()
    cloud.upload_run(json.dumps(dict(foo='barbar')))
