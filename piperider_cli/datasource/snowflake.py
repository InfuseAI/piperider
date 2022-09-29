from piperider_cli.error import PipeRiderConnectorError, PipeRiderCredentialFieldError
from . import DataSource
from .field import TextField, PasswordField


class SnowflakeDataSource(DataSource):
    def __init__(self, name, **kwargs):
        super().__init__(name, 'snowflake', **kwargs)
        # self.fields = ["account", "user", "password", "database", "warehouse", "schema"]
        self.fields = [
            TextField('account', description='Account'),
            TextField('user', description='Username'),
            PasswordField('password', description='Password'),
            TextField('role', description='Role', optional=True),
            TextField('database', description='Database'),
            TextField('warehouse', description='Warehouse'),
            TextField('schema', default='PUBLIC', description='Schema'),
        ]
        self._connect_timeout = 5

    def validate(self):
        if self.type_name != 'snowflake':
            raise ValueError('type name should be snowflake')
        return self._validate_required_fields()

    def to_database_url(self):
        credential = self.credential
        account = credential.get('account')
        password = credential.get('password')
        user = credential.get('user')
        database = credential.get('database')
        schema = credential.get('schema')
        warehouse = credential.get('warehouse')
        role = credential.get('role')
        authenticator = credential.get('authenticator')
        from snowflake.sqlalchemy.snowdialect import SnowflakeDialect
        from snowflake.sqlalchemy import URL

        SnowflakeDialect.supports_statement_cache = True
        db_parameters = {
            "account": account,
            "user": user,
            "password": password,
            "database": database,
            "schema": schema,
            "warehouse": warehouse
        }

        if role:
            db_parameters["role"] = role

        if authenticator:
            if authenticator not in ['snowflake', 'username_password_mfa']:
                raise PipeRiderCredentialFieldError('authenticator', 'The authentication method is not supported')
            db_parameters["authenticator"] = authenticator

        return URL(**db_parameters)

    def engine_args(self):
        return dict(connect_args={'connect_timeout': self._connect_timeout})

    def verify_connector(self):
        try:
            import snowflake.connector
            import snowflake.sqlalchemy
            # do nothing when everything is ok
            return None
        except Exception as e:
            return PipeRiderConnectorError(str(e), 'snowflake')
