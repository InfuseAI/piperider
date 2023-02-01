import configparser
import os
import warnings
from os.path import basename, splitext
from urllib.parse import urlparse

import requests
from rich.console import Console
from sqlalchemy.exc import DBAPIError

from piperider_cli.error import PipeRiderConnectorError, AwsCredentialsError, AwsUnExistedS3Bucket, \
    PipeRiderDataBaseConnectionError, PipeRiderDataBaseEncodingError
from . import DataSource
from .field import PathField, TextField

AWS_CREDENTIAL_PATH = os.path.expanduser('~/.aws/credentials')


def _parquet_path_validate_func(answer, current) -> bool:
    if current is None or current == '':
        return False

    if current.startswith('http://') or current.startswith('https://'):
        try:
            # Check header only, don't download entire file
            return requests.head(current).status_code < 400
        except Exception as e:
            console = Console()
            console.print(f'\n  [red]Invalid http request[/red]: {str(e)}')
        return False

    if current.startswith('s3://'):
        return True

    # File path
    print(current)
    return os.path.exists(current)


def get_s3_bucket_region(s3_bucket):
    try:
        s3_url = f'https://{s3_bucket}.s3.amazonaws.com/'
        response = requests.get(s3_url)
        if response.status_code == 403:
            return response.headers.get('x-amz-bucket-region')
        else:
            return ''
    except Exception:
        return ''


def get_aws_credentials():
    if os.path.exists(AWS_CREDENTIAL_PATH):
        config = configparser.RawConfigParser()
        config.read(AWS_CREDENTIAL_PATH)
        profiles = config.sections()
        if len(profiles) == 0:
            return None, None
        return config.get(profiles[0], 'aws_access_key_id'), config.get(profiles[0], 'aws_secret_access_key')

    return os.getenv('AWS_ACCESS_KEY_ID'), os.getenv('AWS_SECRET_ACCESS_KEY')


class DuckDBDataSource(DataSource):

    def __init__(self, name, **kwargs):
        super().__init__(name, 'duckdb', **kwargs)

        self.credential_source = 'config'
        self.fields = [
            PathField('path', description='Path of database file'),
            TextField('schema', description='Name of the schema', optional=True, default='main'),
        ]

        warnings.filterwarnings('ignore', message="duckdb-engine doesn't yet support reflection on indices")

    def validate(self):
        return self._validate_required_fields()

    def verify_connector(self):
        try:
            import duckdb
            import duckdb_engine
            import chardet
        except Exception as e:
            return PipeRiderConnectorError(str(e), self.type_name)

    def to_database_url(self, database):
        credential = self.credential
        dbpath = credential.get('path')
        duckdb_path = os.path.abspath(dbpath)
        if not os.path.exists(duckdb_path):
            raise PipeRiderDataBaseConnectionError(self.name, self.type_name, db_path=duckdb_path)
        return f"duckdb:///{duckdb_path}"

    def _formalize_table_name(self, name):
        if not name:
            return f'{self.type_name}_table'

        if not name[0].isalpha():
            name = 'TABLE_' + name

        if len(name) > 120:
            name = name[:115] + '__'

        return name.replace('.', '_')


class CsvDataSource(DuckDBDataSource):
    def __init__(self, name, **kwargs):
        super(DuckDBDataSource, self).__init__(name, 'csv', **kwargs)

        self.credential_source = 'config'
        self.fields = [
            PathField('path', description='Path of csv file'),
        ]

    def to_database_url(self, database):
        return 'duckdb:///:memory:'

    def create_engine(self, database=None):
        credential = self.credential
        csv_path = os.path.abspath(credential.get('path'))
        if not os.path.exists(csv_path):
            raise PipeRiderDataBaseConnectionError(self.name, self.type_name, db_path=csv_path)
        table_name = self._formalize_table_name(splitext(basename(csv_path))[0])
        engine = super().create_engine(database)
        # Load csv file as table
        sql_query = f"CREATE TABLE '{table_name}' AS SELECT * FROM read_csv_auto('{csv_path}')"
        try:
            engine.execute('SET enable_progress_bar=true;')
            engine.execute(sql_query)
            engine.execute('SET enable_progress_bar=false;')
        except Exception as e:
            if isinstance(e, DBAPIError) and e.args[0].endswith('Invalid Error: String value is not valid UTF8'):
                encoding_detection = self.detect_file_encoding(csv_path)
                raise PipeRiderDataBaseEncodingError(csv_path, 'csv', encoding_detection['encoding'], 'UTF-8')
            raise e
        return engine

    def detect_file_encoding(self, file):
        import chardet
        with open(file, "rb") as fd:
            rawdata = fd.read()
            return chardet.detect(rawdata)


class ParquetDataSource(DuckDBDataSource):

    def __init__(self, name, **kwargs):
        super(DuckDBDataSource, self).__init__(name, 'parquet', **kwargs)

        self.credential_source = 'config'
        self.fields = [
            TextField('path',
                      description='Path of the Parquet file. (Support: file path, http and s3)',
                      validate=_parquet_path_validate_func),
        ]

    def to_database_url(self, database):
        return 'duckdb:///:memory:'

    def _extract_parquet_path(self):
        credential = self.credential
        parquet_path = credential.get('path')

        if _parquet_path_validate_func is False:
            raise PipeRiderDataBaseConnectionError(self.name, self.type_name, db_path=parquet_path)

        if parquet_path.startswith('https://') \
            or parquet_path.startswith('http://'):
            return 'http', parquet_path

        if parquet_path.startswith('s3://'):
            aws_access_key_id, aws_secret_access_key = get_aws_credentials()
            if aws_access_key_id is None or aws_secret_access_key is None:
                raise AwsCredentialsError('No AWS credentials found')
            s3_uri = urlparse(parquet_path)
            s3_bucket = s3_uri.netloc
            s3_region = get_s3_bucket_region(s3_bucket)
            if not s3_region:
                raise AwsUnExistedS3Bucket(s3_bucket)
            return 's3', parquet_path

        return 'file', os.path.abspath(parquet_path)

    def create_engine(self, database=None):
        type, parquet_path = self._extract_parquet_path()
        engine = super().create_engine(database)

        if type == 'http':
            # HTTP
            engine.execute('INSTALL httpfs')
            engine.execute('LOAD httpfs')
            url = urlparse(parquet_path)
            table_name = self._formalize_table_name(splitext(os.path.basename(url.path))[0])
            pass
        elif type == 's3':
            # S3
            s3_uri = urlparse(parquet_path)
            engine.execute('INSTALL httpfs')
            engine.execute('LOAD httpfs')
            aws_access_key_id, aws_secret_access_key = get_aws_credentials()
            engine.execute(f'set s3_access_key_id="{aws_access_key_id}"')
            engine.execute(f'set s3_secret_access_key="{aws_secret_access_key}"')
            engine.execute(f'set s3_region="{get_s3_bucket_region(s3_uri.netloc)}"')
            table_name = self._formalize_table_name(splitext(os.path.basename(s3_uri.path))[0])
        else:
            # File
            table_name = self._formalize_table_name(splitext(basename(parquet_path))[0])

        sql_query = f"CREATE TABLE '{table_name}' AS SELECT * FROM read_parquet('{parquet_path}')"
        engine.execute('SET enable_progress_bar=true;')
        engine.execute(sql_query)
        engine.execute('SET enable_progress_bar=false;')
        return engine
