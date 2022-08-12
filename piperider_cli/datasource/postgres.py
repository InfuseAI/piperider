from piperider_cli.error import PipeRiderConnectorError
from . import DataSource
from .field import TextField, PasswordField, NumberField


class PostgresDataSource(DataSource):
    def __init__(self, name, **kwargs):
        super().__init__(name, 'postgres', **kwargs)
        self.fields = [
            TextField('host', description='Host URL'),
            NumberField('port', default=5432, description='Port'),
            TextField('user', description='Username'),
            PasswordField('password', description='Password'),
            TextField('dbname', description='Database'),
            TextField('schema', default='public', description='Schema', optional=True),
        ]

    def validate(self):
        if self.type_name != 'postgres':
            raise ValueError('type name should be snowflake')
        return self._validate_required_fields()

    def to_database_url(self):
        credential = self.credential
        host = credential.get('host')
        port = credential.get('port')
        user = credential.get('user')
        password = credential.get('password')
        dbname = credential.get('dbname')
        return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{dbname}"

    def engine_args(self):
        return dict(connect_args={'connect_timeout': 5})

    def verify_connector(self):
        try:
            import psycopg2
            # do nothing when everything is ok
            return None
        except Exception as e:
            return PipeRiderConnectorError(str(e), 'postgres')
