import json
import os
from typing import List

import inquirer

from piperider_cli.error import PipeRiderConnectorError
from . import DataSource
from .field import PathField, ListField, DataSourceField, _default_validate_func

APPLICATION_DEFAULT_CREDENTIALS = os.path.join(os.path.expanduser('~'), '.config', 'gcloud',
                                               'application_default_credentials.json')
DEFAULT_GCP_CREDENTIALS = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', APPLICATION_DEFAULT_CREDENTIALS)
SUGGESTION_FOR_OAUTH_FAILED = f'Default Credential file {DEFAULT_GCP_CREDENTIALS} was not found.\n' \
                              'Please execute the following command to generate it.\n' \
                              '[green]' \
                              'gcloud auth application-default login \\\n' \
                              '--scopes=https://www.googleapis.com/auth/bigquery,\\\n' \
                              'https://www.googleapis.com/auth/drive.readonly,\\\n' \
                              'https://www.googleapis.com/auth/iam.test' \
                              '[/green]'
AUTH_METHOD_OAUTH = 'oauth'
AUTH_METHOD_OAUTH_SECRETS = 'oauth_secrets'
AUTH_METHOD_SERVICE_ACCOUNT = 'service-account'
AUTH_METHOD_SERVICE_ACCOUNT_JSON = 'service-account-json'


class HiddenProjectListFromOAuthField(DataSourceField):

    def __init__(self, name, ds: DataSource):
        super().__init__(name, "hidden", description=f'{name}')
        self.ds = ds
        self.callback = self.list_oauth_projects

    def question(self):
        question = inquirer.Text(self.name)
        question.callback = self.list_oauth_projects
        return question

    def list_oauth_projects(self, answers: dict):
        try:
            import google.auth
            import google.oauth2.service_account
            from google.cloud.bigquery.client import Client as BqClient
            from google.cloud.bigquery.dataset import DatasetListItem

            credentials, project_id = None, None
            if answers['method'] == AUTH_METHOD_OAUTH:
                credentials, project_id = google.auth.load_credentials_from_file(DEFAULT_GCP_CREDENTIALS)
            elif answers.get('keyfile', None) is not None:
                credentials, project_id = google.auth.load_credentials_from_file(os.path.expanduser(answers['keyfile']))

            if project_id is None and hasattr(credentials, 'quota_project_id'):
                project_id = getattr(credentials, 'quota_project_id')

            def list_dataset(project_id):
                client = BqClient(project=project_id, credentials=credentials)
                for x in client.list_datasets(project_id):
                    item: DatasetListItem = x
                    yield json.dumps(dict(project=item.project, dataset=item.dataset_id))

            def list_projects(credentials):
                import google.cloud.client as common_client
                from google.api_core.client_options import ClientOptions
                options = ClientOptions(scopes=['https://www.googleapis.com/auth/cloudplatformprojects.readonly'])
                client = common_client.Client(credentials=credentials, client_options=options)
                list_project = 'https://cloudresourcemanager.googleapis.com/v1/projects'
                response = client._http.get(list_project).json()
                if 'error' in response:
                    raise ValueError(response)
                for p in response['projects']:
                    yield p['projectId']

            # if project_id was found, it could be a service account
            if project_id:
                outputs = list(list_dataset(project_id))
                self.ds.available_datasets += outputs
                return None
            else:
                outputs = []
                for p in list_projects(credentials):
                    outputs += list(list_dataset(p))
                    self.ds.available_datasets += outputs
                return None

        except BaseException as e:
            if answers['method'] == AUTH_METHOD_OAUTH:
                from rich.console import Console
                console = Console()
                console.print(SUGGESTION_FOR_OAUTH_FAILED)
            raise e


class HiddenReduceField(DataSourceField):

    def __init__(self, name, ds: DataSource):
        super().__init__(name, "hidden", description=f'{name}')
        self.ds = ds
        self.callback = self.reformat_answers

    def question(self):
        question = inquirer.Text(self.name)
        question.callback = self.reformat_answers
        return question

    def reformat_answers(self, answers: dict):
        selection = json.loads(answers['selected_dataset'])
        return selection[self.name]


def validate_service_file(answer, current) -> bool:
    if _default_validate_func(answer, current):
        valid_service_account = check_json_file_has_service_account_type(current)
        if valid_service_account:
            return True
        else:
            from rich.console import Console
            console = Console()
            console.print(f'    [[red]Error[/red]] Not a valid service-account json file')  # noqa: F541
            return False
    return False


def check_json_file_has_service_account_type(filepath):
    try:
        with open(os.path.expanduser(filepath)) as fh:
            service_account_info = json.loads(fh.read())
            if service_account_info.get('type') == 'service_account':
                return True
            else:
                return False
    except BaseException:
        return False


class SystemAccountPathField(DataSourceField):
    def __init__(self, name, value=None, default=None, description=None, validate=_default_validate_func,
                 optional=False, ignore=False):
        super().__init__(name, "path", value, default, description, validate, optional, ignore)

    def question(self):
        path = inquirer.Path(self.name, message=self.description, default=self.default, exists=True, ignore=self.ignore)
        path.origin_validate = path.validate

        def wrapper_validate(current):
            # check the original validator
            path.origin_validate(current)
            # verify the file is a service account file
            filepath = path.normalize_value(current)
            if not check_json_file_has_service_account_type(filepath):
                from inquirer import errors
                raise errors.ValidationError(current, reason='Not a valid service-account json file')

        path.validate = wrapper_validate
        return path


class BigQueryDataSource(DataSource):
    def __init__(self, name, **kwargs):
        super().__init__(name, 'bigquery', **kwargs)

        error = self.verify_connector()
        if error:
            raise error

        self.available_datasets: List[str] = []
        self.fields = [
            ListField('method', description='Authentication Methods',
                      default=[AUTH_METHOD_OAUTH, AUTH_METHOD_SERVICE_ACCOUNT]),
            SystemAccountPathField('keyfile', description='The path of GCP Service Account Key File',
                                   ignore=lambda answers: AUTH_METHOD_SERVICE_ACCOUNT != answers['method'],
                                   validate=validate_service_file),
            HiddenProjectListFromOAuthField('selected_dataset', self),
            ListField('selected_dataset', description='Pick a dataset',
                      default=self.available_datasets),
            HiddenReduceField('dataset', self),
            HiddenReduceField('project', self),
        ]

    def validate(self):
        reasons = []
        if self.type_name != 'bigquery':
            raise ValueError('type name should be bigquery')

        method = self.credential.get('method')
        if method not in [AUTH_METHOD_OAUTH, AUTH_METHOD_SERVICE_ACCOUNT,
                          AUTH_METHOD_SERVICE_ACCOUNT_JSON]:
            reasons.append(f'Unsupported authentication method: {method}')

        if method == AUTH_METHOD_OAUTH:
            if not os.path.exists(DEFAULT_GCP_CREDENTIALS):
                reasons.append(SUGGESTION_FOR_OAUTH_FAILED)
        if method == AUTH_METHOD_SERVICE_ACCOUNT:
            if self.credential.get('keyfile') is None:
                reasons.append('keyfile is required when authentication method is service-account')
        if method == AUTH_METHOD_SERVICE_ACCOUNT_JSON:
            if self.credential.get('keyfile_json') is None:
                reasons.append('keyfile_json is required when authentication method is service-account-json')

        return reasons == [], reasons

    def to_database_url(self, database):
        from sqlalchemy_bigquery import BigQueryDialect

        BigQueryDialect.supports_statement_cache = True

        project = database
        if project is None:
            project = self.credential["project"]
        if project is None:
            project = self.credential["database"]

        dataset = self.credential.get("dataset")
        if dataset is None:
            dataset = self.credential.get("schema")

        return f'bigquery://{project}/{dataset}'

    def engine_args(self):
        args = dict()
        if self.credential.get('method') == AUTH_METHOD_SERVICE_ACCOUNT:
            args['credentials_path'] = self.credential.get('keyfile')
        elif self.credential.get('method') == AUTH_METHOD_SERVICE_ACCOUNT_JSON:
            args['credentials_info'] = self.credential.get('keyfile_json', {})
        return args

    def verify_connector(self):
        try:
            from sqlalchemy_bigquery import BigQueryDialect

            # do nothing when everything is ok
            return None
        except Exception as e:
            return PipeRiderConnectorError(str(e), 'bigquery')

    def _get_display_description(self):
        cred = self.credential
        project = cred.get('project') if cred.get('project') else cred.get('database')
        dataset = cred.get('dataset') if cred.get('dataset') else cred.get('schema')
        return f"type={self.type_name}, project={project}, dataset={dataset}"

    def get_database(self):
        cred = self.credential
        project = cred.get('project') if cred.get('project') else cred.get('database')
        return project

    def get_schema(self):
        cred = self.credential
        dataset = cred.get('dataset') if cred.get('dataset') else cred.get('schema')
        return dataset
