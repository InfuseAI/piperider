import os
import re
import sys
import threading
from abc import ABCMeta, abstractmethod
from typing import List, Dict, Callable

import inquirer
import readchar
from rich.console import Console
from rich.prompt import Prompt
from sqlalchemy import create_engine, select, text
from sqlalchemy.pool import SingletonThreadPool

import piperider_cli.hack.datasource_inquirer_prompt as datasource_prompt
from .field import DataSourceField


def _should_use_fancy_user_input() -> bool:
    env_flag = os.environ.get('PIPERIDER_FANCY_USER_INPUT', 'true').lower() == 'true'
    is_a_tty = sys.stdin.isatty() and sys.stdout.isatty()
    if env_flag is False:
        return False
    if is_a_tty is False:
        return False
    if sys.platform == "darwin" or sys.platform == "linux":
        return True
    else:
        return False


DATASOURCE_NAME_REGEX = r'^[a-zA-Z0-9_-]+$'
FANCY_USER_INPUT = _should_use_fancy_user_input()


class DataSource(metaclass=ABCMeta):
    def __init__(self, name, type_name: str, credential=None, **kwargs):
        self.name = name
        self.type_name = type_name
        self.args = kwargs
        self.fields: List[DataSourceField] = []
        self.credential: Dict = credential or {}
        self.credential_source = 'credentials'
        self._cached_engine = {}
        self._cached_lock = threading.Lock()

    def _validate_required_fields(self):
        reasons = []
        # check required fields
        for f in self.fields:
            if isinstance(f.ignore, Callable) and f.ignore(self.credential):
                continue
            if f.name not in self.credential and f.optional is False and not f.name.startswith("_"):
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
    def to_database_url(self, database):
        """
        build a database url for sqlalchemy create_engine method
        :return:
        """
        raise NotImplementedError

    @abstractmethod
    def verify_connector(self):
        raise NotImplementedError

    def verify_connection(self):
        engine = self.get_engine_by_database()
        with engine.connect() as conn:
            stmt = select(text('1 as id'))
            conn.execute(stmt)
        return

    def create_engine(self, database=None):
        return create_engine(self.to_database_url(database=database), **self.engine_args())

    def get_engine_by_database(self, database=None):
        engine = self._cached_engine.get(database)
        if engine is None:
            with self._cached_lock:
                engine = self._cached_engine.get(database)
                if engine is None:
                    engine = self.create_engine(database)
                    self._cached_engine[database] = engine

        return engine

    @property
    def threads(self):
        try:
            engine = self.get_engine_by_database()
        except Exception:
            engine = None
        if self.credential.get('threads'):
            try:
                return int(self.credential.get('threads'))
            except BaseException:
                console = Console()
                message = 'failed to parse the "threads" field, so we will use 1 thread to execute profiling.'
                console.print(f'[bold yellow]Warning: [/bold yellow]:\n  {message}')
                return 1
        elif engine and not isinstance(engine.pool, SingletonThreadPool):
            return 5
        else:
            return 1

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
        if FANCY_USER_INPUT:
            return self.ask_credential_by_inquirer()
        else:
            return self.ask_credential_by_rich()

    def ask_credential_by_inquirer(self):
        if sys.platform == "darwin" or sys.platform == "linux":
            # change readchar key backspace
            readchar.key.BACKSPACE = '\x7F'

        def next_question(fields):
            for f in self.fields:
                yield f.question()

        answers = datasource_prompt.prompt(next_question(self.fields), raise_keyboard_interrupt=True)
        if answers:
            for f in self.fields:
                if answers[f.name]:
                    self.credential[f.name] = answers[f.name].strip()
            self.credential = {k: v for (k, v) in self.credential.items() if not k.startswith('_')}
        return self.credential

    def ask_credential_by_rich(self):
        for f in self.fields:
            if hasattr(f, 'callback') and getattr(f, 'callback') is not None:
                answer = f.callback(self.credential)
            else:
                answer = f.question_by_rich(self.credential)
            if answer:
                self.credential[f.name] = answer.strip()

        self.credential = {k: v for (k, v) in self.credential.items() if not k.startswith('_')}
        return self.credential

    @staticmethod
    def ask(exist_datasource: List[str] = None):
        if FANCY_USER_INPUT:
            return DataSource.ask_by_inquirer(exist_datasource=exist_datasource)
        else:
            return DataSource.ask_by_rich(exist_datasource=exist_datasource)

    @staticmethod
    def ask_by_rich(exist_datasource: List[str] = None):
        if exist_datasource is None:
            exist_datasource = []
        console = Console()
        source_choices = [(k, v) for k, v in DATASOURCE_PROVIDERS.items()]

        while True:
            datasource_name = Prompt.ask(
                "[[yellow]?[/yellow]] What is your data source name? (alphanumeric and underscore are allowed)")
            if re.match(DATASOURCE_NAME_REGEX, datasource_name) and datasource_name not in exist_datasource:
                break
            else:
                console.print('    [[red]Error[/red]] Input is not a valid datasource name. Please try again.')

        console.print('[[yellow]?[/yellow]] Which data source would you like to connect to?')
        for i, (k, v) in enumerate(source_choices):
            console.print(f'  [green]{i + 1}[/green]: {k}')

        while True:
            try:
                type_idx = Prompt.ask('[[yellow]?[/yellow]] Select a number: ')
                type_idx = int(type_idx)
            except EOFError as e:
                raise e
            except Exception:
                type_idx = 0

            if type_idx > len(source_choices) or type_idx < 1:
                console.print('    [[red]Error[/red]] Input is not a valid index value. Please try again.')
            else:
                cls = source_choices[type_idx - 1][1]
                break

        name = datasource_name
        return cls, name

    @staticmethod
    def ask_by_inquirer(exist_datasource: List[str] = None):
        if exist_datasource is None:
            exist_datasource = []
        source_choices = [(k, v) for k, v in DATASOURCE_PROVIDERS.items()]

        if sys.platform == "darwin" or sys.platform == "linux":
            # change readchar key backspace
            readchar.key.BACKSPACE = '\x7F'

        questions = [
            inquirer.Text('datasource_name',
                          message='What is your data source name? (alphanumeric and underscore are allowed)',
                          validate=lambda ans, x: re.match(DATASOURCE_NAME_REGEX,
                                                           x) is not None and x not in exist_datasource),
            inquirer.List('type',
                          message='Which data source would you like to connect to?',
                          choices=source_choices,
                          ),
        ]
        answers = inquirer.prompt(questions, raise_keyboard_interrupt=True)
        name = answers['datasource_name'].strip()
        cls = answers['type']
        return cls, name

    @abstractmethod
    def _get_display_description(self):
        """
        get the description of the datasource to display.

        Returns description

        :return: str
        """
        raise NotImplementedError

    def get_display_description(self):
        # if dbt
        dbt = self.args.get('dbt')
        if dbt:
            return f"profile={dbt.get('profile')}, target={dbt.get('target')}"
        return self._get_display_description()

    @abstractmethod
    def get_database(self):
        raise NotImplementedError

    @abstractmethod
    def get_schema(self):
        raise NotImplementedError


def _list_datasource_providers():
    from .snowflake import SnowflakeDataSource
    from .postgres import PostgresDataSource
    from .sqlite import SqliteDataSource
    from .bigquery import BigQueryDataSource
    from .redshift import RedshiftDataSource
    from .survey import UserSurveyMockDataSource
    from .duckdb import DuckDBDataSource, CsvDataSource, ParquetDataSource
    from .athena import AthenaDataSource
    from .databricks import DataBricksDataSource
    from .unsupported import UnsupportedDataSource

    return {
        'snowflake': SnowflakeDataSource,
        'bigquery': BigQueryDataSource,
        'redshift': RedshiftDataSource,
        'athena': AthenaDataSource,
        'databricks': DataBricksDataSource,
        'postgres': PostgresDataSource,
        'sqlite': SqliteDataSource,
        'duckdb': DuckDBDataSource,
        'csv': CsvDataSource,
        'parquet': ParquetDataSource,
        'tell us what type of datasource you want': UserSurveyMockDataSource,
    }


class DataSourceProviders(dict):
    def __getitem__(self, key):
        from .unsupported import UnsupportedDataSource
        return super().get(key, UnsupportedDataSource)


DATASOURCE_PROVIDERS = DataSourceProviders(_list_datasource_providers())
