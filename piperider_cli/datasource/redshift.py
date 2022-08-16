from sqlalchemy import text
from sqlalchemy.sql import quoted_name
from sqlalchemy.sql.functions import OrderedSetAgg

from piperider_cli.error import PipeRiderConnectorError
from . import DataSource
from .field import TextField, NumberField, ListField, PasswordField

AUTH_METHOD_PASSWORD = 'password'
AUTH_METHOD_IAM = 'iam'


class ApproximatePercentileDisc(OrderedSetAgg):
    identifier = "approximate_percentile_disc"
    inherit_cache = True
    name = quoted_name(text("APPROXIMATE PERCENTILE_DISC"), False)
    array_for_multi_clause = True


class RedshiftDataSource(DataSource):
    def __init__(self, name, **kwargs):
        super().__init__(name, 'redshift', **kwargs)
        self.fields = [
            TextField('host', description='Redshift Host'),
            TextField('user', description='Redshift User'),
            ListField('method', description='Authentication Methods',
                      default=[AUTH_METHOD_PASSWORD, AUTH_METHOD_IAM]),
            PasswordField('password', description='Redshift Password',
                          ignore=lambda answer: AUTH_METHOD_PASSWORD != answer.get('method')),
            TextField('cluster_id', description='Redshift Cluster ID',
                      ignore=lambda answer: AUTH_METHOD_IAM != answer.get('method')),
            TextField('iam_profile', description='Redshift IAM Role', default='default',
                      ignore=lambda answer: AUTH_METHOD_IAM != answer.get('method')),
            NumberField('port', description='Redshift Port', default=5439),
            TextField('dbname', description='Redshift Database Name'),
            TextField('schema', description='Redshift Schema'),
        ]

    def validate(self):
        if self.type_name != 'redshift':
            raise ValueError('type name should be redshift')
        return self._validate_required_fields()

    def to_database_url(self):
        credential = self.credential
        host = credential.get('host')
        port = credential.get('port')
        user = credential.get('user')
        dbname = credential.get('dbname')

        from sqlalchemy_redshift.dialect import RedshiftDialect
        import boto3

        RedshiftDialect.supports_statement_cache = True

        if credential.get('method') == AUTH_METHOD_PASSWORD:
            password = credential.get('password')
        else:
            cluster_id = credential.get('cluster_id')
            client = boto3.client('redshift')
            cluster_creds = client.get_cluster_credentials(DbUser=user,
                                                           DbName=dbname,
                                                           ClusterIdentifier=cluster_id,
                                                           AutoCreate=False)
            password = cluster_creds['DbPassword']

        return f"redshift+psycopg2://{user}:{password}@{host}:{port}/{dbname}"

    def engine_args(self):
        args = dict(connect_args={'connect_timeout': 5})
        return args

    def verify_connector(self):
        try:
            import psycopg2
            import redshift_connector
            import sqlalchemy_redshift
            # do nothing when everything is ok
            return None
        except Exception as e:
            return PipeRiderConnectorError(str(e), 'redshift')
