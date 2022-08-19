import os

from piperider_cli.error import PipeRiderConnectorError
from . import DataSource
from .field import TextField, PathField, ListField

APPLICATION_DEFAULT_CREDENTIALS = os.path.join(os.path.expanduser('~'), '.config', 'gcloud',
                                               'application_default_credentials.json')
DEFAULT_GCP_CREDENTIALS = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', APPLICATION_DEFAULT_CREDENTIALS)
AUTH_METHOD_OAUTH = 'oauth'
AUTH_METHOD_OAUTH_SECRETS = 'oauth_secrets'
AUTH_METHOD_SERVICE_ACCOUNT = 'service-account'
AUTH_METHOD_SERVICE_ACCOUNT_JSON = 'service-account-json'


class BigQueryDataSource(DataSource):
    def __init__(self, name, **kwargs):
        super().__init__(name, 'bigquery', **kwargs)
        self.fields = [
            TextField('project', description='GCP Project ID'),
            ListField('method', description='Authentication Methods',
                      default=[AUTH_METHOD_OAUTH, AUTH_METHOD_SERVICE_ACCOUNT]),
            PathField('keyfile', description='The path of GCP Service Account Key File',
                      default=DEFAULT_GCP_CREDENTIALS if os.path.exists(DEFAULT_GCP_CREDENTIALS) else None,
                      ignore=lambda answers: AUTH_METHOD_SERVICE_ACCOUNT != answers['method']),
            TextField('dataset', description='The name of BigQuery DataSet'),
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
                reasons.append(
                    f'Default Credential file {DEFAULT_GCP_CREDENTIALS} is not found.\n'
                    'Please execute the following command to generate it.\n'
                    '[green]'
                    'gcloud auth application-default login \\\n'
                    '--scopes=https://www.googleapis.com/auth/bigquery,\\\n'
                    'https://www.googleapis.com/auth/drive.readonly,\\\n'
                    'https://www.googleapis.com/auth/iam.test'
                    '[/green]')
        if method == AUTH_METHOD_SERVICE_ACCOUNT:
            if self.credential.get('keyfile') is None:
                reasons.append('keyfile is required when authentication method is service-account')
        if method == AUTH_METHOD_SERVICE_ACCOUNT_JSON:
            if self.credential.get('keyfile_json') is None:
                reasons.append('keyfile_json is required when authentication method is service-account-json')

        return reasons == [], reasons

    def to_database_url(self):
        from pybigquery.sqlalchemy_bigquery import BigQueryDialect
        BigQueryDialect.supports_statement_cache = True
        return f'bigquery://{self.credential["project"]}/{self.credential["dataset"]}'

    def engine_args(self):
        args = dict()
        if self.credential.get('method') == AUTH_METHOD_SERVICE_ACCOUNT:
            args['credentials_path'] = self.credential.get('keyfile')
        elif self.credential.get('method') == AUTH_METHOD_SERVICE_ACCOUNT_JSON:
            args['credentials_info'] = self.credential.get('keyfile_json', {})
        return args

    def verify_connector(self):
        try:
            import pybigquery

            # do nothing when everything is ok
            return None
        except Exception as e:
            return PipeRiderConnectorError(str(e), 'bigquery')
