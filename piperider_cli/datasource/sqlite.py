import os
import warnings

from sqlalchemy.exc import SAWarning

from . import DataSource
from .field import PathField


class SqliteDataSource(DataSource):

    def __init__(self, name, **kwargs):
        super().__init__(name, 'sqlite', **kwargs)

        # in dbt case, we should push the dbpath back to the credential
        if 'dbt' in kwargs:
            dbpath = kwargs.get('credential', {}).get('schemas_and_paths', {}).get('main')
            kwargs.get('credential', {})['dbpath'] = dbpath
        self.credential_source = 'config'
        self.fields = [
            PathField('dbpath', description='Path of database file'),
        ]
        warnings.filterwarnings('ignore',
                                r'^Dialect sqlite\+pysqlite does \*not\* support Decimal objects natively.*$',
                                SAWarning)

    def validate(self):
        if self.type_name != 'sqlite':
            raise ValueError('type name should be sqlite')
        return self._validate_required_fields()

    def to_database_url(self, database):
        credential = self.credential
        dbpath = credential.get('dbpath')
        if dbpath is None:
            return "sqlite://"
        else:
            sqlite_file = os.path.abspath(dbpath)
            if not os.path.exists(sqlite_file):
                raise ValueError(f'Cannot find the sqlite at {sqlite_file}')
            return f"sqlite:///{sqlite_file}"

    def verify_connector(self):
        # sqlite is builtin connector
        return None
