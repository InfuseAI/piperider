import os

from piperider_cli.error import PipeRiderConnectorError
from . import DataSource
from .field import TextField, PathField, ListField

APPLICATION_DEFAULT_CREDENTIALS = os.path.join(os.path.expanduser('~'), '.config', 'gcloud',
                                               'application_default_credentials.json')
DEFAULT_GCP_CREDENTIALS = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS', APPLICATION_DEFAULT_CREDENTIALS)


class BigQueryDataSource(DataSource):
    def __init__(self, name, **kwargs):
        super().__init__(name, 'bigquery', **kwargs)
        self.fields = [
            TextField('project', description='GCP Project ID'),
            ListField('method', description='Authentication Methods',
                      default=['google-application-credential', 'service-account-keyfile']),
            PathField('keyfile', description='The path of GCP Service Account Key File',
                      default=DEFAULT_GCP_CREDENTIALS if os.path.exists(DEFAULT_GCP_CREDENTIALS) else None,
                      ignore=lambda answers: 'service-account-keyfile' is not answers['method']),
            TextField('dataset', description='The name of BigQuery DataSet'),
        ]

    def validate(self):
        if self.type_name != 'bigquery':
            raise ValueError('type name should be bigquery')
        return self._validate_required_fields()

    def to_database_url(self):
        from pybigquery.sqlalchemy_bigquery import BigQueryDialect
        BigQueryDialect.supports_statement_cache = True
        return f'bigquery://{self.credential["project"]}/{self.credential["dataset"]}'

    def engine_args(self):
        args = dict()
        if self.credential.get('method') == 'keyfile':
            args['credentials_path'] = self.credential.get('keyfile')
        return args

    def verify_connector(self):
        try:
            import pybigquery

            # do nothing when everything is ok
            return None
        except Exception as e:
            return PipeRiderConnectorError(str(e), 'bigquery')
