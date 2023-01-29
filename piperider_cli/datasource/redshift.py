import re
from ipaddress import ip_network, ip_address

import requests
from sqlalchemy import text
from sqlalchemy.engine.url import URL
from sqlalchemy.sql import quoted_name
from sqlalchemy.sql.functions import OrderedSetAgg

from piperider_cli.error import PipeRiderConnectorError, AwsCredentialsError
from . import DataSource
from .field import TextField, ListField, PasswordField

AUTH_METHOD_PASSWORD = 'password'
AUTH_METHOD_IAM = 'iam'


class ApproximatePercentileDisc(OrderedSetAgg):
    identifier = "approximate_percentile_disc"
    inherit_cache = True
    name = quoted_name(text("APPROXIMATE PERCENTILE_DISC"), False)
    array_for_multi_clause = True


def _is_redshift_serverless(ans) -> bool:
    # Example:
    #   cluster-endpoint: redshift-cluster-1.xxx.ap-northeast-1.redshift.amazonaws.com:5439/dev
    #   serverless-endpoint: default.xxx.ap-northeast-1.redshift-serverless.amazonaws.com:5439/dev
    endpoint = ans.get('endpoint')
    return 'redshift-serverless' == endpoint.split('.')[3]


def _is_iam_auth(ans) -> bool:
    return AUTH_METHOD_IAM == ans.get('method')


def _is_password_auth(ans) -> bool:
    return AUTH_METHOD_PASSWORD == ans.get('method')


def _is_ip_address(host) -> bool:
    obj = re.search(r"^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$", host)
    if obj is None:
        return False
    else:
        for v in obj.groups():
            if int(v) > 255:
                return False
    return True


def find_aws_region(ip):
    ip_json = requests.get('https://ip-ranges.amazonaws.com/ip-ranges.json').json()
    prefixes = ip_json['prefixes']
    my_ip = ip_address(ip)
    region = 'Unknown'
    for prefix in prefixes:
        if my_ip in ip_network(prefix['ip_prefix']):
            region = prefix['region']
            break
    return region


class RedshiftDataSource(DataSource):
    def __init__(self, name, **kwargs):
        super().__init__(name, 'redshift', **kwargs)
        self.fields = [
            TextField('endpoint', description='Redshift Endpoint'),
            ListField('method', description='Authentication Methods',
                      default=[AUTH_METHOD_PASSWORD, AUTH_METHOD_IAM]),
            TextField('user', description='Redshift User',
                      ignore=lambda answer: _is_iam_auth(answer) and _is_redshift_serverless(answer)),
            PasswordField('password', description='Redshift Password',
                          ignore=_is_iam_auth),
            TextField('iam_profile', description='Redshift IAM Role', optional=True,
                      ignore=_is_password_auth),
            TextField('dbname', description='Redshift Database Name', default='dev'),
            TextField('schema', description='Redshift Schema', default='public'),
        ]

    def validate(self):
        if self.type_name != 'redshift':
            raise ValueError('type name should be redshift')
        return self._validate_required_fields()

    def to_database_url(self, database):
        credential = self.credential
        if database is None:
            database = credential.get('dbname')
        if database is None:
            database = credential.get('database')

        host = credential.get('host') or credential.get('endpoint').split('/')[0].split(':')[0]
        try:
            port = credential.get('port') or credential.get('endpoint').split('/')[0].split(':')[1]
        except Exception:
            port = 5439

        from sqlalchemy_redshift.dialect import RedshiftDialect
        RedshiftDialect.supports_statement_cache = True

        if credential.get('method') == AUTH_METHOD_PASSWORD:
            user = credential.get('user')
            password = credential.get('password')
        else:
            import boto3
            from botocore.config import Config

            try:
                iam_profile = credential.get('iam_profile')
                aws = boto3.Session(profile_name=iam_profile)
            except Exception:
                aws = boto3

            if _is_ip_address(host):
                region = find_aws_region(host)
            else:
                region = host.split('.')[2]

            try:
                if _is_redshift_serverless(credential):
                    # Redshift Serverless
                    client = aws.client('redshift-serverless',
                                        config=Config(region_name=region))
                    workgroup = host.split('.')[0]
                    cluster_creds = client.get_credentials(dbName=database,
                                                           workgroupName=workgroup,
                                                           durationSeconds=3600)
                    user = cluster_creds['dbUser']
                    password = cluster_creds['dbPassword']
                else:
                    # Redshift Provisioned Clusters
                    user = credential.get('user')
                    cluster_id = credential.get('cluster_id') or host.split('.')[0]
                    duration_s = credential.get('iam_duration_seconds', 900)
                    auto_create = credential.get('auto_create', False)
                    db_groups = credential.get('db_groups', [])
                    client = aws.client('redshift',
                                        config=Config(region_name=region))
                    cluster_creds = client.get_cluster_credentials(DbUser=user,
                                                                   DbName=database,
                                                                   ClusterIdentifier=cluster_id,
                                                                   DurationSeconds=duration_s,
                                                                   AutoCreate=auto_create,
                                                                   DbGroups=db_groups, )
                    user = cluster_creds.get('DbUser')
                    password = cluster_creds.get('DbPassword')
                    if _is_ip_address(host):
                        host = client.describe_clusters(ClusterIdentifier=cluster_id)['Clusters'][0]['Endpoint'][
                            'Address']
            except Exception as e:
                raise AwsCredentialsError(str(e))

        url = URL.create(drivername='redshift+psycopg2',
                         host=host,
                         port=port,
                         username=user, password=password, database=database)
        return url

    def engine_args(self):
        args = dict(connect_args={'connect_timeout': 5})
        return args

    def verify_connector(self):
        try:
            import psycopg2
            import redshift_connector
            import sqlalchemy_redshift
            import boto3
            # do nothing when everything is ok
            return None
        except Exception as e:
            return PipeRiderConnectorError(str(e), 'redshift')
