import inquirer

from piperider_cli.error import PipeRiderConnectorError, PipeRiderCredentialFieldError
from . import DataSource
from .field import TextField, PasswordField, ListField, PathField, DataSourceField

AUTH_METHOD_PASSWORD = 'password'
AUTH_METHOD_KEYPAIR = 'keypair'
AUTH_METHOD_SSO = 'sso'


class SnowflakeDataSource(DataSource):
    def __init__(self, name, **kwargs):
        super().__init__(name, 'snowflake', **kwargs)
        # self.fields = ["account", "user", "password", "database", "warehouse", "schema"]
        self.fields = [
            TextField('account', description='Account'),
            TextField('user', description='Username'),
            ListField('_method', description='Authentication Methods',
                      default=[AUTH_METHOD_PASSWORD, AUTH_METHOD_KEYPAIR, AUTH_METHOD_SSO]),

            PasswordField('password', description='Password',
                          ignore=lambda answers: answers.get('_method') != AUTH_METHOD_PASSWORD),
            PathField('private_key_path', description='Private key path',
                      ignore=lambda answers: answers.get('_method') != AUTH_METHOD_KEYPAIR),
            PasswordField('private_key_passphrase', description='Passphrase for the private key', optional=True,
                          ignore=lambda answers: answers.get('_method') != AUTH_METHOD_KEYPAIR),
            TextField('authenticator', description='Authenticator (\'externalbrowser\' or a valid Okta URL)',
                      default=lambda answers: 'externalbrowser' if answers.get('_method') == AUTH_METHOD_SSO else None,
                      ignore=lambda answers: answers.get('_method') != AUTH_METHOD_SSO),
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

    def to_database_url(self, database):
        credential = self.credential
        account = credential.get('account')
        password = credential.get('password')
        user = credential.get('user')
        if database is None:
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
            "database": database,
            "schema": schema,
            "warehouse": warehouse
        }

        if password:
            db_parameters["password"] = password

        if role:
            db_parameters["role"] = role

        if authenticator:
            db_parameters["authenticator"] = authenticator

        return URL(**db_parameters)

    def engine_args(self):
        return dict(connect_args={
            'connect_timeout': self._connect_timeout,
            'private_key': self._get_private_key(),
        })

    def _get_private_key(self):
        private_key_path = self.credential.get('private_key_path')
        private_key_passphrase = self.credential.get('private_key_passphrase')

        if private_key_path is None:
            return None

        from cryptography.hazmat.backends import default_backend
        from cryptography.hazmat.primitives import serialization

        if private_key_passphrase:
            encoded_passphase = private_key_passphrase.encode()
        else:
            encoded_passphase = None

        with open(private_key_path, "rb") as key:
            p_key = serialization.load_pem_private_key(
                key.read(),
                password=encoded_passphase,
                backend=default_backend()
            )

        return p_key.private_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption())

    def verify_connector(self):
        try:
            import snowflake.connector
            import snowflake.sqlalchemy
            # do nothing when everything is ok
            return None
        except Exception as e:
            return PipeRiderConnectorError(str(e), 'snowflake')

    def _get_display_description(self):
        cred = self.credential
        return f"type={self.type_name}, database={cred.get('database')}, schema={cred.get('schema')}"

    def get_database(self):
        return self.credential.get('database')

    def get_schema(self):
        return self.credential.get('schema')
