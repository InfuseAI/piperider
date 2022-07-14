import os
import re
import sys
import warnings
from abc import ABCMeta, abstractmethod
from typing import List, Dict

import inquirer
import readchar
from rich.console import Console
from sqlalchemy.exc import SAWarning

from piperider_cli.error import PipeRiderConnectorError


def _default_validate_func(answer, current) -> bool:
    if isinstance(current, str):
        return current.strip() != ''
    return True


class DataSourceField(metaclass=ABCMeta):

    def __init__(self, name, type, value=None, default=None, description=None, validate=True, optional=False):
        self.name = name
        self.type = type
        self.default = default
        self.description = description if not optional else f'{description} (optional)'
        self.value = value
        self.optional = optional
        if optional:
            self.validate = validate
        else:
            self.validate = _default_validate_func if validate is True else validate

    def get(self):
        return self.value

    def set(self, value):
        self.value = value

    @abstractmethod
    def question(self):
        raise NotImplementedError


class TextField(DataSourceField):
    def __init__(self, name, value=None, default=None, description=None, validate=True, optional=False):
        super().__init__(name, "text", value, default, description, validate, optional)

    def question(self):
        return inquirer.Text(self.name, message=self.description, default=self.default, validate=self.validate)


class PathField(DataSourceField):
    def __init__(self, name, value=None, default=None, description=None, validate=True, optional=False):
        super().__init__(name, "path", value, default, description, validate, optional)

    def question(self):
        return inquirer.Path(self.name, message=self.description, default=self.default, exists=True)


class NumberField(DataSourceField):
    def __init__(self, name, value=None, default=None, description=None, validate=True, optional=False):
        def _is_numeric_func(answer, current) -> bool:
            return current.strip().isnumeric()

        def _is_numeric_or_empty_func(answer, current) -> bool:
            return current.strip().isnumeric() or current == ''

        if value and not (isinstance(value, int) or isinstance(value, float)):
            raise ValueError("Value must be a number")
        if default and not (isinstance(default, int) or isinstance(default, float)):
            raise ValueError("Default value must be a number")
        if optional:
            validate = _is_numeric_or_empty_func
        else:
            validate = _is_numeric_func
        super().__init__(name, "number", value, default, description, validate, optional)

    def question(self):
        return inquirer.Text(self.name, message=self.description, default=str(self.default), validate=self.validate)


class PasswordField(DataSourceField):
    def __init__(self, name, value=None, default=None, description=None, validate=True, optional=False):
        super().__init__(name, "password", value, default, description, validate, optional)

    def question(self):
        return inquirer.Password(self.name, message=self.description, default=self.default, validate=self.validate)


class DataSource(metaclass=ABCMeta):

    def __init__(self, name, type_name, credential=None, **kwargs):
        self.name = name
        self.type_name = type_name
        self.args = kwargs
        self.fields: List[DataSourceField] = []
        self.credential: Dict = credential or {}

    def _validate_required_fields(self):
        reasons = []
        # check required fields
        for f in self.fields:
            if f.name not in self.credential and f.optional is False:
                reasons.append(f"{f.name} is required")

        # check if got duplicate keys: pass & password
        if self.credential.get('pass') and self.credential.get('password'):
            reasons.append('Got duplicate keys: (pass) all map to "password"')

        return reasons == [], reasons

    @abstractmethod
    def validate(self):
        """
        validate type name and required fields.

        Returns True if everything is fine, False and reasons otherwise.

        :return: bool, []
        """
        raise NotImplementedError

    @abstractmethod
    def to_database_url(self):
        """
        build a database url for sqlalchemy create_engine method
        :return:
        """
        raise NotImplementedError

    @abstractmethod
    def verify_connector(self):
        raise NotImplementedError

    def engine_args(self):
        return dict()

    def show_installation_information(self):
        from rich.markup import escape
        err = self.verify_connector()
        if err:
            console = Console()
            console.print(f'\n{escape(err.hint)}\n')
            return False
        return True

    def ask_credential(self):
        """
        ask for user filling all fields.
        """

        if sys.platform == "darwin" or sys.platform == "linux":
            # change readchar key backspace
            readchar.key.BACKSPACE = '\x7F'

        questions = []
        for f in self.fields:
            questions.append(f.question())

        answers = inquirer.prompt(questions, raise_keyboard_interrupt=True)
        if answers:
            for f in self.fields:
                self.credential[f.name] = answers[f.name].strip()
        return self.credential

    @staticmethod
    def ask():
        source_choices = [(k, v) for k, v in DATASOURCE_PROVIDERS.items()]

        if sys.platform == "darwin" or sys.platform == "linux":
            # change readchar key backspace
            readchar.key.BACKSPACE = '\x7F'

        questions = [
            inquirer.Text('project_name',
                          message='What is your project name? (alphanumeric only)',
                          validate=lambda ans, x: re.match(r'^[a-zA-Z0-9]+$', x) is not None),
            inquirer.List('type',
                          message='Which data source would you like to connect to?',
                          choices=source_choices,
                          ),
        ]
        answers = inquirer.prompt(questions, raise_keyboard_interrupt=True)
        name = answers['project_name'].strip()
        cls = answers['type']
        return cls, name


class PostgreSQLDataSource(DataSource):
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
        from snowflake.sqlalchemy.snowdialect import SnowflakeDialect
        from snowflake.sqlalchemy import URL

        SnowflakeDialect.supports_statement_cache = True
        db_parameters = {
            "account": account,
            "user": user,
            "password": password,
            "database": database,
            "schema": schema,
            "warehouse": warehouse,
            "login_timeout": self._connect_timeout,
            "network_timeout": self._connect_timeout,
        }

        if role:
            db_parameters["role"] = role

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


class SqliteDataSource(DataSource):

    def __init__(self, name, **kwargs):
        super().__init__(name, 'sqlite', **kwargs)

        # in dbt case, we should push the dbpath back to the credential
        if 'dbt' in kwargs:
            dbpath = kwargs.get('credential', {}).get('schemas_and_paths', {}).get('main')
            kwargs.get('credential', {})['dbpath'] = dbpath

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

    def to_database_url(self):
        credential = self.credential
        dbpath = credential.get('dbpath')
        sqlite_file = os.path.abspath(dbpath)
        if not os.path.exists(sqlite_file):
            raise ValueError(f'Cannot find the sqlite at {sqlite_file}')
        return f"sqlite:///{sqlite_file}"

    def verify_connector(self):
        # sqlite is builtin connector
        return None


DATASOURCE_PROVIDERS = dict(snowflake=SnowflakeDataSource, postgres=PostgreSQLDataSource, sqlite=SqliteDataSource)
