import os
from os.path import basename, splitext

from piperider_cli.error import PipeRiderConnectorError
from . import DataSource
from .field import PathField


class DuckDBDataSource(DataSource):
    def __init__(self, name, **kwargs):
        super().__init__(name, 'duckdb', **kwargs)

        self.fields = [
            PathField('dbpath', description='Path of database file'),
        ]

    def validate(self):
        if self.type_name != 'duckdb':
            raise ValueError('type name should be duckdb')
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


class CsvDataSource(DuckDBDataSource):
    def __init__(self, name, **kwargs):
        super(DuckDBDataSource, self).__init__(name, 'csv', **kwargs)

        self.fields = [
            PathField('path', description='Path of csv file'),
        ]

    def validate(self):
        if self.type_name != 'csv':
            raise ValueError('type name should be csv')
        return self._validate_required_fields()

    def to_database_url(self):
        credential = self.credential
        csv_path = os.path.abspath(credential.get('path'))
        if not os.path.exists(csv_path):
            raise ValueError('Cannot find the CSV file')

        return 'duckdb:///:memory:'

    def _formalize_table_name(self, name):
        if not name:
            return 'csv_table'

        if not name[0].isalpha():
            name = 'TABLE_' + name

        if len(name) > 120:
            name = name[:115] + '...'

        return name

    def create_engine(self):
        credential = self.credential
        csv_file = os.path.abspath(credential.get('path'))
        table_name = self._formalize_table_name(splitext(basename(csv_file))[0])
        engine = super().create_engine()
        # Load csv file as table
        sql_query = f"CREATE TABLE {table_name} AS SELECT * FROM read_csv_auto('{csv_file}')"
        engine.execute(sql_query)
        return engine
