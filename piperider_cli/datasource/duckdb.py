import os
from os.path import basename, splitext
from urllib.parse import urlparse

import requests
from rich.console import Console

from piperider_cli.error import PipeRiderConnectorError, AwsCredentialsError
from . import DataSource
from .field import PathField, TextField


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


class DuckDBDataSource(DataSource):
    def __init__(self, name, **kwargs):
        super().__init__(name, 'duckdb', **kwargs)

        self.fields = [
            PathField('dbpath', description='Path of database file'),
        ]

    def validate(self):
        return self._validate_required_fields()

    def verify_connector(self):
        try:
            import duckdb
            import duckdb_engine
        except Exception as e:
            return PipeRiderConnectorError(str(e), 'duckdb')

    def to_database_url(self):
        credential = self.credential
        dbpath = credential.get('dbpath')
        duckdb_path = os.path.abspath(dbpath)
        if not os.path.exists(duckdb_path):
            raise ValueError(f'Cannot find the duckDB file at {duckdb_path}')
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

        self.fields = [
            PathField('path', description='Path of csv file'),
        ]

    def to_database_url(self):
        return 'duckdb:///:memory:'

    def create_engine(self):
        credential = self.credential
        csv_file = os.path.abspath(credential.get('path'))
        if not os.path.exists(csv_file):
            raise ValueError('Cannot find the CSV file')
        table_name = self._formalize_table_name(splitext(basename(csv_file))[0])
        engine = super().create_engine()
        # Load csv file as table
        sql_query = f"CREATE TABLE {table_name} AS SELECT * FROM read_csv_auto('{csv_file}')"
        engine.execute(sql_query)
        return engine


class ParquetDataSource(DuckDBDataSource):

    def __init__(self, name, **kwargs):
        super(DuckDBDataSource, self).__init__(name, 'parquet', **kwargs)

        self.fields = [
            TextField('path',
                      description='Path of Parquet file. (Support: file path, http and s3)',
                      validate=_parquet_path_validate_func)
        ]

    def to_database_url(self):
        return 'duckdb:///:memory:'

    def _extract_parquet_file(self):
        credential = self.credential
        parquet_file = credential.get('path')

        if _parquet_path_validate_func is False:
            raise ValueError(f'Cannot access the Parquet file: {parquet_file}')

        if parquet_file.startswith('https://') \
            or parquet_file.startswith('http://'):
            return 'http', parquet_file

        if parquet_file.startswith('s3://'):
            if os.getenv('AWS_ACCESS_KEY_ID') is None or os.getenv('AWS_SECRET_ACCESS_KEY') is None:
                raise AwsCredentialsError('No AWS credentials found')
            s3_uri = urlparse(parquet_file)
            s3_region = get_s3_bucket_region(s3_uri.netloc)
            if not s3_region:
                raise ValueError(f'S3 bucket "{s3_uri.netloc}" does not exist')
            return 's3', parquet_file

        return 'file', os.path.abspath(parquet_file)

    def create_engine(self):
        type, parquet_file = self._extract_parquet_file()
        engine = super().create_engine()

        if type == 'http':
            engine.execute('INSTALL httpfs')
            engine.execute('LOAD httpfs')
            url = urlparse(parquet_file)
            table_name = self._formalize_table_name(splitext(os.path.basename(url.path))[0])
            pass
        elif type == 's3':
            s3_uri = urlparse(parquet_file)
            engine.execute('INSTALL httpfs')
            engine.execute('LOAD httpfs')
            engine.execute(f'set s3_access_key_id="{os.getenv("AWS_ACCESS_KEY_ID")}"')
            engine.execute(f'set s3_secret_access_key="{os.getenv("AWS_SECRET_ACCESS_KEY")}"')
            engine.execute(f'set s3_region="{get_s3_bucket_region(s3_uri.netloc)}"')
            table_name = self._formalize_table_name(splitext(os.path.basename(s3_uri.path))[0])

            pass
        else:
            table_name = self._formalize_table_name(splitext(basename(parquet_file))[0])

        sql_query = f"CREATE TABLE {table_name} AS SELECT * FROM read_parquet('{parquet_file}')"
        engine.execute(sql_query)
        return engine
