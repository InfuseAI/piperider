from sqlalchemy import text
from sqlalchemy.engine.url import URL
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
            ListField('method', description='Authentication Methods',
                      default=[AUTH_METHOD_PASSWORD, AUTH_METHOD_IAM]),
            TextField('user', description='Redshift User'),
            PasswordField('password', description='Redshift Password',
                          ignore=lambda answer: AUTH_METHOD_PASSWORD != answer.get('method')),
            TextField('cluster_id', description='Redshift Cluster ID',
                      ignore=lambda answer: AUTH_METHOD_IAM != answer.get('method')),
            TextField('iam_profile', description='Redshift IAM Role', default='default',
                      ignore=lambda answer: AUTH_METHOD_IAM != answer.get('method')),
            NumberField('port', description='Redshift Port', default=5439),
            TextField('dbname', description='Redshift Database Name', default='dev'),
            TextField('schema', description='Redshift Schema', default='public'),
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

        url = URL.create(drivername='redshift+psycopg2',
                         host=host,
                         port=port,
                         username=user, password=password, database=dbname)
        return url

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


class RedshiftServerlessDataSource(RedshiftDataSource):
    def __init__(self, name, **kwargs):
        DataSource.__init__(self, name, 'redshift-serverless', **kwargs)
        self.fields = [
            TextField('endpoint', description='Redshift Serverless Endpoint'),
            ListField('method', description='Authentication Methods',
                      default=[AUTH_METHOD_PASSWORD, AUTH_METHOD_IAM]),
            TextField('user', description='Redshift User',
                      ignore=lambda answer: AUTH_METHOD_PASSWORD != answer.get('method')),
            PasswordField('password', description='Redshift Password',
                          ignore=lambda answer: AUTH_METHOD_PASSWORD != answer.get('method')),
            TextField('iam_profile', description='Redshift IAM Role', default='default',
                      ignore=lambda answer: AUTH_METHOD_IAM != answer.get('method')),
            TextField('dbname', description='Redshift Database', default='dev'),
            TextField('schema', description='Redshift Schema', default='public'),
        ]

    def validate(self):
        if self.type_name != 'redshift-serverless':
            raise ValueError('type name should be redshift')
        return self._validate_required_fields()

    def to_database_url(self):
        credential = self.credential
        endpoint = credential.get('endpoint').split('/')[0].split(':')[0]
        port = credential.get('endpoint').split('/')[0].split(':')[1]
        dbname = credential.get('dbname')

        from sqlalchemy_redshift.dialect import RedshiftDialect
        import boto3

        RedshiftDialect.supports_statement_cache = True

        if credential.get('method') == AUTH_METHOD_PASSWORD:
            user = credential.get('user')
            password = credential.get('password')
        else:
            iam_profile = credential.get('iam_profile')
            session = boto3.Session(profile_name=iam_profile)
            client = session.client('redshift-serverless')
            workgroup = endpoint.split('.')[0]
            cluster_creds = client.get_credentials(dbName=dbname,
                                                   workgroupName=workgroup,
                                                   durationSeconds=3600)
            user = cluster_creds['dbUser']
            password = cluster_creds['dbPassword']
        url = URL.create(drivername='redshift+psycopg2',
                         host=endpoint,
                         port=port,
                         username=user, password=password, database=dbname)
        return url
