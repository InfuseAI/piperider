import asyncio
import decimal
import math
import time
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime, date, timezone
from typing import Dict, Optional, Union, List, Tuple

import sentry_sdk
from dateutil.relativedelta import relativedelta
from sqlalchemy import MetaData, Table, Column, String, Integer, Numeric, Date, DateTime, Boolean, ARRAY, select, func, \
    distinct, case, text, literal_column, inspect, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.engine import Engine, Connection
from sqlalchemy.sql import FromClause, Selectable
from sqlalchemy.sql.elements import ColumnClause
from sqlalchemy.sql.expression import CTE, false, true, table as table_clause, column as column_clause
from sqlalchemy.types import Float
from sqlalchemy.exc import NoSuchTableError

from .event import ProfilerEventHandler, DefaultProfilerEventHandler
from ..configuration import Configuration
from ..datasource import DataSource
from ..event import capture_exception

HISTOGRAM_NUM_BUCKET = 50


class ProfileSubject:
    def __init__(self, table: str, schema: str = None, database: str = None, name: str = None, ref_id: str = None):
        self.table = table
        self.schema = schema
        self.database = database
        self.name = name if name else table
        self.ref_id = ref_id


def dtof(value: Union[int, float, decimal.Decimal]) -> Union[int, float]:
    """
    dtof is helpler function to transform decimal value to float. Decimal is not json serializable type.

    :param value:
    :return:
    """
    if isinstance(value, decimal.Decimal):
        return float(value)
    return value


def format_float(val: Union[int, float]) -> str:
    """
    from the float to human-readable format.

    :param val:
    :return:
    """

    if val == 0:
        return "0"

    base = math.floor(math.log10(abs(val)))
    if base < -2:
        return f"{val:.2e}"
    elif base < 0:
        return f"{val:.3f}"
    elif base < 3:
        return f"{val:.2f}"
    elif base < 6:
        return f"{val / (10 ** 3):.1f}K"
    elif base < 9:
        return f"{val / (10 ** 6):.1f}M"
    elif base < 12:
        return f"{val / (10 ** 9):.1f}B"
    elif base < 15:
        return f"{val / (10 ** 12):.1f}T"
    else:
        return f"{val / (10 ** 12):.0f}T"


def percentage(number, total):
    if number is None:
        return None
    if not total:
        return None
    return number / total


async def _run_in_executor(executor, func, *args):
    if executor:
        return await asyncio.get_running_loop().run_in_executor(executor, func, *args)
    else:
        return func(*args)


@dataclass
class CollectedMetadata:
    map_name_tables: dict
    profiled_tables: dict
    result: dict
    subjects: List[ProfileSubject]


def transform_as_run(profiled_tables) -> Dict:
    from collections import Counter

    def _t(k):
        if k is None:
            return "__no_such_table__"
        return k.split(".")[-1]

    c = Counter([_t(ref_id) for ref_id in profiled_tables.keys()])
    conflicts = [k for k, v in c.items() if v > 1]

    if not conflicts:
        return {_t(k): v for k, v in profiled_tables.items()}

    rebuilt_profiled_tables = {}
    for ref_id, tresult in profiled_tables.items():
        table_name = _t(ref_id)
        if table_name not in conflicts:
            rebuilt_profiled_tables[table_name] = tresult
            continue

        rebuilt_profiled_tables[ref_id] = tresult
        if tresult:
            rebuilt_profiled_tables[table_name] = tresult

    return rebuilt_profiled_tables


class Profiler:
    """
    Profiler profile tables and columns by a sqlalchemy engine.
    """

    def __init__(
        self,
        data_source: DataSource,
        event_handler: ProfilerEventHandler = DefaultProfilerEventHandler(),
        config: Configuration = None
    ):
        self.data_source = data_source
        self.event_handler = event_handler
        self.config = config
        self.collected_metadata: Optional[CollectedMetadata] = None
        if self.data_source.threads > 1:
            self.executor = ThreadPoolExecutor(max_workers=self.data_source.threads)
        else:
            self.executor = None

    async def _fetch_metadata(self, subjects):
        futures = []
        map_name_tables = dict()
        total = len(subjects)
        completed = 0

        self.event_handler.handle_metadata_start()
        self.event_handler.handle_metadata_progress(total, completed)
        for subject in subjects:
            def _fetch_table_task(subject: ProfileSubject):
                engine = self.data_source.get_engine_by_database(subject.database)
                schema = subject.schema.lower() if subject.schema is not None else None
                table = None
                try:
                    table = Table(subject.table, MetaData(), autoload_with=engine, schema=schema)
                except NoSuchTableError:
                    # ignore the table metadata fetch error
                    pass
                except Exception as e:
                    capture_exception(e)
                return subject, table

            future = _run_in_executor(self.executor, _fetch_table_task, subject)
            futures.append(future)

        for future in asyncio.as_completed(futures):
            subject, table = await future
            map_name_tables[subject.ref_id] = table
            completed += 1
            self.event_handler.handle_metadata_progress(total, completed)
        self.event_handler.handle_metadata_end()

        return map_name_tables

    async def _profile(self, subjects: List[ProfileSubject] = None, *,
                       metadata_subjects: List[ProfileSubject] = None) -> dict:
        """
        profile all tables or specific table. With different column types, it would profile different metrics.

        The column can be categorized as these types
        - integer
        - numeric
        - string
        - datetime
        - boolean
        - Other

        :param subjects: optional, the tables to profile
        :return: the profile results
        """

        if self.collected_metadata is None:
            await self._collect_metadata(subjects, metadata_subjects)

        map_name_tables = self.collected_metadata.map_name_tables
        profiled_tables = self.collected_metadata.profiled_tables
        result = self.collected_metadata.result
        subjects = self.collected_metadata.subjects

        table_count = len(subjects)
        table_index = 0

        # Profiling
        if len(subjects) > 0:
            self.event_handler.handle_run_start(result)
            self.event_handler.handle_run_progress(result, table_count, table_index)

            for subject in subjects:
                name = subject.name
                table = map_name_tables.get(subject.ref_id)
                if table is None:
                    continue
                engine = self.data_source.get_engine_by_database(subject.database)
                table_profiler = TableProfiler(engine, self.executor, subject, table, self.event_handler, self.config)
                tresult = await table_profiler.profile()
                profiled_tables[name] = tresult
                table_index = table_index + 1
                self.event_handler.handle_run_progress(result, table_count, table_index)
            self.event_handler.handle_run_end(result)
        else:
            print("No models, seeds, sources to profile")

        return result

    async def _collect_metadata(self, subjects: List[ProfileSubject], metadata_subjects: List[ProfileSubject]):
        profiled_tables = {}
        if subjects is None:
            subjects = []
            table_names = inspect(self.data_source.get_engine_by_database()).get_table_names()
            for table_name in table_names:
                subject = ProfileSubject(table_name)
                subjects.append(subject)

        # Fetch schema data
        map_name_tables = await self._fetch_metadata(metadata_subjects if metadata_subjects else subjects)

        if metadata_subjects is None:
            # for compatible with non-dbt cases, we use subjects as the metadata_subjects
            metadata_subjects = subjects

        for subject in metadata_subjects:
            engine = self.data_source.get_engine_by_database(subject.database)
            table = map_name_tables.get(subject.ref_id)

            if table is not None:
                table_profiler = TableProfiler(engine, self.executor, subject, table, self.event_handler, self.config)
                tresult = await table_profiler.fetch_schema()
                profiled_tables[subject.ref_id] = tresult
            else:
                profiled_tables[subject.ref_id] = dict(name=subject.name, columns={}, ref_id=subject.ref_id)

        profiled_tables = transform_as_run(profiled_tables)
        self.collected_metadata = CollectedMetadata(map_name_tables=map_name_tables,
                                                    profiled_tables=profiled_tables,
                                                    result=dict(tables=profiled_tables),
                                                    subjects=subjects)
        return self.collected_metadata

    def collect_metadata(self, metadata_subjects: List[ProfileSubject], subjects: List[ProfileSubject]):
        return asyncio.run(self._collect_metadata(subjects, metadata_subjects))

    async def _collect_metadata_from_dbt_manifest(self, dbt_manifest, metadata_subjects, subjects):
        profiled_tables = {}
        if subjects is None:
            subjects = []
            # table_nodes = filter(
            #     lambda node: node.startswith('model.') or node.startswith('seed.') or node.startswith('source.'),
            #     dbt_manifest['nodes'].keys())
            # print(table_nodes)

        if metadata_subjects is None:
            metadata_subjects = subjects

        self.event_handler.handle_manifest_start()
        total = len(metadata_subjects)
        completed = 0
        for subject in metadata_subjects:
            table_name = subject.name
            ref_id = subject.ref_id
            dbt_node = dbt_manifest.get('nodes', {}).get(ref_id, {})
            dbt_source = dbt_manifest.get('sources', {}).get(ref_id, {})
            dbt_columns = {}
            columns = {}
            if dbt_node:
                # Read columns from dbt manifest `columns` field
                dbt_columns = dbt_node.get('columns', {})
            elif dbt_source:
                # Read columns from dbt manifest `sources` field
                dbt_columns = dbt_source.get('columns', {})

            # Fill the columns with name and description
            for key, val in dbt_columns.items():
                name = val.get('name')
                description = val.get('description')
                columns[key] = dict(
                    name=name,
                    type='other',
                    schema_type='',
                    description=description)
            profiled_tables[ref_id] = dict(name=table_name, columns=columns, ref_id=ref_id)
            completed += 1
            self.event_handler.handle_manifest_progress(total, completed)

        self.event_handler.handle_manifest_end()
        return dict(tables=profiled_tables)

    def collect_metadata_from_dbt_manifest(self, dbt_manifest, metadata_subjects: List[ProfileSubject],
                                           subjects: List[ProfileSubject]):
        return asyncio.run(self._collect_metadata_from_dbt_manifest(dbt_manifest, metadata_subjects, subjects))

    def profile(self, subjects: List[ProfileSubject] = None, *, metadata_subjects: List[ProfileSubject] = None) -> dict:
        def job():
            return asyncio.run(self._profile(subjects, metadata_subjects=metadata_subjects))

        if not self.executor:
            return job()
        with self.executor:
            return job()


class TableProfiler:

    def __init__(
        self,
        engine: Engine,
        executor: ThreadPoolExecutor,
        subject: ProfileSubject,
        table: Table,
        event_handler: ProfilerEventHandler,
        config: Configuration
    ):
        self.engine = engine
        self.executor = executor
        self.subject = subject
        self.table = table
        self.event_handler = event_handler
        self.config = config

    def _get_candidate_columns(self) -> Tuple[Selectable, ColumnClause]:
        table = self.table
        if self.engine.url.get_backend_name() == 'bigquery':
            yield from self._get_candidate_columns_bigquery()
        else:
            for column in table.columns:
                yield table, column

    def _get_candidate_columns_bigquery(self) -> Tuple[Selectable, ColumnClause]:
        from sqlalchemy_bigquery import STRUCT, ARRAY

        # works around to fix the warning
        # SAWarning: UserDefinedType STRUCT(array=ARRAY(STRUCT(item1=String(), item2=String()))) will not produce a cache key because the ``cache_ok``
        # attribute is not set to True.  This can have significant performance implications including some performance degradations in comparison to prior SQLAlchemy versions.  Set this attribute to True if this type object's state is safe to use
        # in a cache key, or False to disable this warning. (Background on this error at: https://sqlalche.me/e/14/cprf)
        STRUCT.cache_ok = false
        ARRAY.cache_ok = false

        table = self.table
        cte_map = dict()

        cte_map[None] = select(
            text('*')
        ).select_from(
            table
        ).cte('t_')

        for column in table.columns:
            comps = column.name.split('.')
            name = comps[-1]
            prefix = '__'.join(comps[:-1]) if len(comps) > 1 else None
            selectable = cte_map.get(prefix)

            if isinstance(column.type, ARRAY):
                if isinstance(column.type.item_type, JSON) or isinstance(column.type.item_type, STRUCT):
                    # add array cte to cte map
                    cte_name = '__'.join(comps)
                    stmt = select(
                        literal_column(f"`{name}`.*", column.type)
                    ).select_from(
                        selectable
                    ).select_from(
                        text(f"unnest(`{selectable.name}`.`{name}`) as `{name}`")
                    ).cte("t_" + cte_name)
                    cte_map[cte_name] = stmt
                else:
                    # array cte
                    cte_name = '__'.join(comps)
                    selectable = select(
                        literal_column(f"`{name}`", column.type.item_type)
                    ).select_from(
                        selectable
                    ).select_from(
                        text(f"unnest(`{selectable.name}`.`{name}`) as `{name}`")
                    ).cte("t_" + cte_name)
                    yield selectable, literal_column(f"`{selectable.name}`.`{name}`", column.type).label(
                        column.name)
            elif isinstance(column.type, JSON) or isinstance(column.type, STRUCT):

                # add cte to ctep map
                cte_name = '__'.join(comps)
                stmt = select(
                    literal_column(f"`{selectable.name}`.`{name}`.*", column.type)
                ).select_from(
                    selectable
                ).cte("t_" + cte_name)
                cte_map[cte_name] = stmt
            else:
                yield selectable, literal_column(f"`{selectable.name}`.`{name}`", column.type).label(column.name)

    def _profile_table_metadata(self, result: dict):
        table = self.table
        row_count = created = last_altered = size_bytes = None
        with self.engine.connect() as conn:
            try:
                if self.engine.url.get_backend_name() == 'snowflake':
                    inspector = inspect(self.engine) if self.engine else None
                    default_schema = inspector.default_schema_name
                    metadata_table = table_clause('TABLES', column_clause("row_count"), column_clause("created"),
                                                  column_clause("last_altered"), column_clause("bytes"),
                                                  column_clause('table_schema'), column_clause('table_name'),
                                                  schema='INFORMATION_SCHEMA')
                    metadata_columns = {column.name: column for column in metadata_table.columns}
                    stmt = select(
                        metadata_columns['row_count'],
                        func.convert_timezone('UTC', metadata_columns['created']),
                        func.convert_timezone('UTC', metadata_columns['last_altered']),
                        metadata_columns['bytes']
                    ).select_from(metadata_table).where(metadata_columns['table_schema'] == str.upper(default_schema),
                                                        metadata_columns['table_name'] == str.upper(table.name))
                    row_count, created, last_altered, size_bytes = conn.execute(stmt).fetchone()
                    # datetime object transformation
                    created = created.isoformat()
                    last_altered = last_altered.isoformat()
                elif self.engine.url.get_backend_name() == 'bigquery':
                    dataset = self.engine.url.database
                    metadata_table = table_clause(f'{dataset}.__TABLES__', column_clause("row_count"),
                                                  column_clause("creation_time"), column_clause("last_modified_time"),
                                                  column_clause("size_bytes"), column_clause('table_id'))
                    metadata_columns = {column.name: column for column in metadata_table.columns}
                    stmt = select(
                        metadata_columns['row_count'],
                        metadata_columns['creation_time'],
                        metadata_columns['last_modified_time'],
                        metadata_columns['size_bytes']
                    ).select_from(metadata_table).where(metadata_columns['table_id'] == table.name)
                    row_count, created, last_altered, size_bytes = conn.execute(stmt).fetchone()
                    # timestamp transformation
                    created = datetime.fromtimestamp(created / 1000.0, timezone.utc).isoformat()
                    last_altered = datetime.fromtimestamp(last_altered / 1000.0, timezone.utc).isoformat()
                elif self.engine.url.get_backend_name() == 'redshift':
                    metadata_table = table_clause('SVV_TABLE_INFO', column_clause("tbl_rows"),
                                                  column_clause("size"), column_clause("table"))
                    metadata_columns = {column.name: column for column in metadata_table.columns}
                    stmt = select(
                        metadata_columns['tbl_rows'],
                        metadata_columns['size'],
                    ).select_from(metadata_table).where(metadata_columns['table'] == table.name)
                    row_count, size_mbytes = conn.execute(stmt).fetchone()
                    row_count = int(row_count)
                    size_bytes = size_mbytes * 1024
            except Exception:
                # table's metadata is optional except row_count
                pass
            finally:
                if row_count is None:
                    stmt = select(
                        func.count(),
                    ).select_from(table)
                    row_count, = conn.execute(stmt).fetchone()

        result['row_count'] = result['samples'] = row_count
        result['samples_p'] = 1

        if self.config:
            limit = self.config.profiler_config.get('table', {}).get('limit', 0)
            if row_count > limit > 0:
                result['samples'] = limit
                result['samples_p'] = percentage(limit, row_count)

        if created:
            result['created'] = created
        if last_altered:
            result['last_altered'] = last_altered
            freshness = datetime.now(timezone.utc) - datetime.fromisoformat(last_altered)
            result['freshness'] = int(freshness.total_seconds())
        if size_bytes:
            result['bytes'] = size_bytes

    def _profile_table_duplicate_rows(self, result: dict):
        table = self.table
        if not self.config:
            return
        if not self.config.profiler_config.get('table', {}).get('duplicateRows'):
            return

        limit = self.config.profiler_config.get('table', {}).get('limit', 0)
        columns = [column.label(f'_{column.name}') for column in table.columns]

        with self.engine.connect() as conn:
            if self.engine.url.get_backend_name() == 'snowflake':
                if limit <= 0:
                    cte = select(func.hash(*columns).label('h')).select_from(table).cte()
                else:
                    cte = select(func.hash(*columns).label('h')).select_from(table).limit(limit).cte()

                cte = select(
                    cte.c.h,
                    func.count().label('c')
                ).select_from(cte).group_by(cte.c.h).having(func.count() > 1).cte()
                stmt = select(func.sum(cte.c.c)).select_from(cte)
                duplicate_rows, = conn.execute(stmt).fetchone()
            else:
                if limit <= 0:
                    cte = select(
                        *columns,
                        func.count().label('c')
                    ).select_from(table).group_by(*columns).having(func.count() > 1).cte()
                else:
                    cte = select(*columns).select_from(table).limit(limit).cte()
                    columns = [column for column in cte.columns]
                    cte = select(
                        *columns,
                        func.count().label('c')
                    ).select_from(cte).group_by(*columns).having(func.count() > 1).cte()

                stmt = select(func.sum(cte.c.c)).select_from(cte)
                duplicate_rows, = conn.execute(stmt).fetchone()

            samples = result['samples']
            duplicate_rows = duplicate_rows if duplicate_rows is not None else 0

            result['duplicate_rows'] = duplicate_rows
            result['duplicate_rows_p'] = percentage(duplicate_rows, samples)

    async def _profile_table(self, result):
        await _run_in_executor(self.executor, self._profile_table_metadata, result)
        await _run_in_executor(self.executor, self._profile_table_duplicate_rows, result)

    async def _profile_column(self, result, table_name, table: Table, column: Column) -> dict:
        column_name = column.name
        column_result, profiler = await self._create_column_metadata_and_profiler(table, column)

        self.event_handler.handle_column_start(table_name, column_name)

        profile_start = time.perf_counter()
        profile_result = await _run_in_executor(self.executor, profiler.profile)
        profile_end = time.perf_counter()
        duration = profile_end - profile_start

        column_result.update(profile_result)
        column_result["profile_duration"] = f"{duration:.2f}"
        column_result["elapsed_milli"] = int(duration * 1000)

        self.event_handler.handle_column_end(table_name, column_name, column_result)
        result['columns'][column_name] = column_result

    async def _create_column_metadata_and_profiler(self, table, column):
        profiler_config = self.config.profiler_config if self.config else {}
        column_type = column.type
        schema_type = str(column.type)
        if isinstance(column_type, ARRAY) and column_type.item_type is not None:
            column_type = column_type.item_type
            schema_type = f"ARRAY<{column_type}>"
        if isinstance(column_type, String):
            # VARCHAR
            # CHAR
            # TEXT
            # CLOB
            generic_type = "string"
            profiler = StringColumnProfiler(self.engine, profiler_config, table, column)
        elif isinstance(column_type, Integer):
            # INTEGER
            # BIGINT
            # SMALLINT
            generic_type = "integer"
            profiler = NumericColumnProfiler(self.engine, profiler_config, table, column, is_integer=True)
        elif isinstance(column_type, Numeric):
            # NUMERIC
            # DECIMAL
            # FLOAT
            generic_type = "numeric"
            profiler = NumericColumnProfiler(self.engine, profiler_config, table, column, is_integer=False)
        elif isinstance(column_type, Date) or isinstance(column_type, DateTime) or \
            (self.engine.url.get_backend_name() == 'snowflake' and str(column_type).startswith('TIMESTAMP')):
            # DATE
            # DATETIME
            # TIMEZONE_NTZ
            generic_type = "datetime"
            profiler = DatetimeColumnProfiler(self.engine, profiler_config, table, column)
        elif isinstance(column_type, Boolean):
            # BOOLEAN
            generic_type = "boolean"
            profiler = BooleanColumnProfiler(self.engine, profiler_config, table, column)
        elif isinstance(column_type, UUID):
            generic_type = "other"
            profiler = UUIDColumnProfiler(self.engine, profiler_config, table, column)
        else:
            generic_type = "other"
            profiler = BaseColumnProfiler(self.engine, profiler_config, table, column)
        column_result = {
            "name": column.name,
            "type": generic_type,
            "schema_type": schema_type,
        }
        return column_result, profiler

    async def profile(self) -> dict:
        subject = self.subject
        name = subject.name
        self.event_handler.handle_table_start(name)
        candidate_columns = list(self._get_candidate_columns())
        col_index = 0
        col_count = len(candidate_columns)
        columns = {}
        result = {
            "name": name,
            "row_count": 0,
            "samples": 0,
            "samples_p": None,
            "col_count": col_count,
            "duplicate_rows": None,
            "duplicate_rows_p": None,
            "columns": columns,
        }
        if subject.ref_id:
            result['ref_id'] = subject.ref_id
        futures = []
        profile_start = time.perf_counter()

        self.event_handler.handle_table_progress(name, result, col_count, col_index)

        # Profile table
        future = asyncio.create_task(self._profile_table(result))
        futures.append(future)

        # Profile columns
        for selectable, column in candidate_columns:
            columns[column.name] = None
            future = asyncio.create_task(self._profile_column(result, name, selectable, column))
            futures.append(future)

        total = len(futures)
        completed = 0
        self.event_handler.handle_table_progress(name, result, total, completed)

        for future in asyncio.as_completed(futures):
            await future
            completed += 1
            self.event_handler.handle_table_progress(name, result, total, completed)

        for column_result in columns.values():
            column_result['total'] = result['row_count']
            column_result['samples_p'] = result['samples_p']

        profile_end = time.perf_counter()
        duration = profile_end - profile_start
        result["profile_duration"] = f"{duration:.2f}"
        result["elapsed_milli"] = int(duration * 1000)

        self.event_handler.handle_table_end(name, result)
        return result

    async def fetch_schema(self) -> dict:
        subject = self.subject
        name = subject.name
        candidate_columns = list(self._get_candidate_columns())
        col_count = len(candidate_columns)
        columns = {}
        result = {
            "name": name,
            "col_count": col_count,
            "columns": columns,
        }

        if subject.ref_id:
            result['ref_id'] = subject.ref_id

        futures = []

        # Profile columns
        for selectable, column in candidate_columns:
            columns[column.name] = None
            future = asyncio.create_task(self._create_column_metadata_and_profiler(selectable, column))
            futures.append(future)

        for future in asyncio.as_completed(futures):
            column_result, _ = await future
            columns[column_result['name']] = column_result
        return result


class BaseColumnProfiler:
    """
    The base class of the column profiler. It will automatically profile the metrics according to the schema type
    """

    def __init__(self, engine: Engine, config: dict, table: Table, column: Column):
        self.engine = engine
        self.config = config
        self.table = table
        self.column = column

    def _get_database_backend(self) -> str:
        """
        Helper function to return the sqlalchemy engine backend
        :return:
        """
        return self.engine.url.get_backend_name()

    def _get_limited_table_cte(self):
        t = self.table
        c = self.column
        if not self.config:
            return t, c

        limit = self.config.get('table', {}).get('limit', 0)
        if limit <= 0:
            return t, c
        else:
            cte = select(c.label('c')).select_from(t).limit(limit).cte()
            return cte, cte.c.c

    def _get_table_cte(self) -> CTE:
        """
        Get the CTE to normalize the
        - table name
        - column name as column "c"
        - (Optional) Remove the invalid data.

        Columns
        - "c": the transformed valid to use data
            null: if the column value is null or invalid
            otherwise: orginal column value or transformed value.
        - "orig": the original column

        so that

        valid       = count(c)
        non_nulls   = count(orig)
        invalids    = non_nulls - valid

        :return: CTE
        """
        t, c = self._get_limited_table_cte()

        return select(c.label("c")).select_from(t).cte()

    def profile(self) -> dict:
        """
        Profile a column

        :return: the profiling result. The result dict is json serializable
        """

        with self.engine.connect() as conn:
            cte = self._get_table_cte()
            stmt = select(
                func.count().label("_total"),
                func.count(cte.c.c).label("_non_nulls"),
            )
            result = conn.execute(stmt).fetchone()
            _total, _non_nulls, = result
            _nulls = _total - _non_nulls
            _valid = _non_nulls

            return {
                'total': None,
                'samples': _total,
                'samples_p': None,
                'non_nulls': _non_nulls,
                'non_nulls_p': percentage(_non_nulls, _total),
                'nulls': _nulls,
                'nulls_p': percentage(_nulls, _total),
                'valids': _valid,
                'valids_p': percentage(_valid, _total),
                'invalids': 0,
                'invalids_p': 0
            }


class StringColumnProfiler(BaseColumnProfiler):
    def __init__(self, engine: Engine, config: dict, table: Table, column: Column):
        super().__init__(engine, config, table, column)

    def _get_table_cte(self) -> CTE:
        t, c = self._get_limited_table_cte()
        if self._get_database_backend() != 'sqlite':
            cte = select(
                c.label("c"),
                c.label("orig")
            ).select_from(t).cte()
        else:
            cte = select(
                case(
                    (func.typeof(c) == 'blob', None),
                    else_=c
                ).label("c"),
                c.label("orig"),
            ).select_from(t).cte()
        cte = select(
            cte.c.c,
            func.length(cte.c.c).label("len"),
            cte.c.orig
        ).select_from(cte).cte()
        cte = select(
            cte.c.c,
            cte.c.len,
            case((cte.c.len == 0, 1), else_=None).label("zero_length"),
            cte.c.orig
        ).select_from(cte).cte()
        return cte

    def profile(self):
        with self.engine.connect() as conn:
            cte = self._get_table_cte()

            columns = [
                func.count().label("_total"),
                func.count(cte.c.orig).label("_non_nulls"),
                func.count(cte.c.c).label("_valids"),
                func.count(cte.c.zero_length).label("_zero_length"),
                func.count(distinct(cte.c.c)).label("_distinct"),
                func.avg(cte.c.len).label("_avg"),
                func.min(cte.c.len).label("_min"),
                func.max(cte.c.len).label("_max"),
            ]

            if self._get_database_backend() == 'sqlite':
                columns.append((func.count(cte.c.len) * func.sum(
                    func.cast(cte.c.len, Float) * func.cast(cte.c.len, Float)) - func.sum(cte.c.len) * func.sum(
                    cte.c.len)) / ((func.count(cte.c.len) - 1) * func.count(cte.c.len)).label('_variance'))
                stmt = select(*columns)
                result = conn.execute(stmt).fetchone()
                _total, _non_nulls, _valids, _zero_length, _distinct, _avg, _min, _max, _variance = result
                _stddev = None
                if _variance is not None:
                    _stddev = math.sqrt(_variance)
            else:
                columns.append(func.stddev(cte.c.len).label("_stddev"))
                stmt = select(*columns)
                result = conn.execute(stmt).fetchone()
                _total, _non_nulls, _valids, _zero_length, _distinct, _avg, _min, _max, _stddev = result

            _nulls = _total - _non_nulls
            _invalids = _non_nulls - _valids
            _non_zero_length = _valids - _zero_length
            _min = dtof(_min)
            _max = dtof(_max)
            _avg = dtof(_avg)
            _stddev = dtof(_stddev)

            result = {
                'total': None,
                'samples': _total,
                'samples_p': None,
                'non_nulls': _non_nulls,
                'non_nulls_p': percentage(_non_nulls, _total),
                'nulls': _nulls,
                'nulls_p': percentage(_nulls, _total),
                'valids': _valids,
                'valids_p': percentage(_valids, _total),
                'invalids': _invalids,
                'invalids_p': percentage(_invalids, _total),
                'zero_length': _zero_length,
                'zero_length_p': percentage(_zero_length, _total),
                'non_zero_length': _non_zero_length,
                'non_zero_length_p': percentage(_non_zero_length, _total),

                'distinct': _distinct,
                'distinct_p': percentage(_distinct, _valids),
                'min': _min,
                'min_length': _min,
                'max': _max,
                'max_length': _max,
                'avg': _avg,
                'avg_length': _avg,
                'stddev': _stddev,
                'stddev_length': _stddev,
            }

            # uniqueness
            _non_duplicates = profile_non_duplicate(conn, cte, cte.c.c)
            _duplicates = _valids - _non_duplicates
            result.update({
                "duplicates": _duplicates,
                "duplicates_p": percentage(_duplicates, _valids),
                "non_duplicates": _non_duplicates,
                "non_duplicates_p": percentage(_non_duplicates, _valids),
            })

            # top k
            topk = None
            if _valids > 0:
                topk = profile_topk(conn, cte.c.c)
            result['topk'] = topk

            # histogram of string length
            histogram = None
            if _valids > 0:
                histogram = profile_histogram(conn, cte, cte.c.len, _min, _max, True)
            result['histogram'] = histogram
            result['histogram_length'] = histogram

            return result


class NumericColumnProfiler(BaseColumnProfiler):
    is_integer: bool

    def __init__(self, engine: Engine, config: dict, table: Table, column: Column, is_integer: bool):
        super().__init__(engine, config, table, column)
        self.is_integer = is_integer

    def _get_table_cte(self) -> CTE:
        t, c = self._get_limited_table_cte()
        if self._get_database_backend() != 'sqlite':
            cte = select(
                c.label("c"),
                c.label("orig")
            ).select_from(t).cte()
        else:
            cte = select(
                case(
                    (func.typeof(c) == 'text', None),
                    (func.typeof(c) == 'blob', None),
                    else_=c
                ).label("c"),
                c.label("orig")
            ).select_from(t).cte(name="T")
        cte = select(
            cte.c.c,
            case((cte.c.c == 0, 1), else_=None).label("zero"),
            case((cte.c.c < 0, 1), else_=None).label("negative"),
            cte.c.orig
        ).select_from(cte).cte()
        return cte

    def profile(self):
        with self.engine.connect() as conn:
            cte = self._get_table_cte()

            columns = [
                func.count().label("_total"),
                func.count(cte.c.orig).label("_non_nulls"),
                func.count(cte.c.c).label("_valids"),
                func.count(cte.c.zero).label("_zeros"),
                func.count(cte.c.negative).label("_negatives"),
                func.count(distinct(cte.c.c)).label("_distinct"),
                func.sum(func.cast(cte.c.c, Float)).label("_sum"),
                func.avg(cte.c.c).label("_avg"),
                func.min(cte.c.c).label("_min"),
                func.max(cte.c.c).label("_max"),
            ]

            if self._get_database_backend() == 'sqlite':
                columns.append((func.count(cte.c.c) * func.sum(
                    func.cast(cte.c.c, Float) * func.cast(cte.c.c, Float)) - func.sum(cte.c.c) * func.sum(cte.c.c)) / (
                                   (func.count(cte.c.c) - 1) * func.count(cte.c.c)).label('_variance'))
                stmt = select(*columns)
                result = conn.execute(stmt).fetchone()
                _total, _non_nulls, _valids, _zeros, _negatives, _distinct, _sum, _avg, _min, _max, _variance = result
                _stddev = None
                if _variance is not None:
                    _stddev = math.sqrt(_variance)
            else:
                columns.append(func.stddev(func.cast(cte.c.c, Float)).label("_stddev"))
                stmt = select(*columns)
                result = conn.execute(stmt).fetchone()
                _total, _non_nulls, _valids, _zeros, _negatives, _distinct, _sum, _avg, _min, _max, _stddev = result

            _nulls = _total - _non_nulls
            _invalids = _non_nulls - _valids
            _positives = _valids - _zeros - _negatives
            _sum = dtof(_sum)
            _min = dtof(_min)
            _max = dtof(_max)
            _avg = dtof(_avg)
            _stddev = dtof(_stddev)

            result = {
                'total': None,
                'samples': _total,
                'samples_p': None,
                'non_nulls': _non_nulls,
                'non_nulls_p': percentage(_non_nulls, _total),
                'nulls': _nulls,
                'nulls_p': percentage(_nulls, _total),
                'valids': _valids,
                'valids_p': percentage(_valids, _total),
                'invalids': _invalids,
                'invalids_p': percentage(_invalids, _total),
                'zeros': _zeros,
                'zeros_p': percentage(_zeros, _total),
                'negatives': _negatives,
                'negatives_p': percentage(_negatives, _total),
                'positives': _positives,
                'positives_p': percentage(_positives, _total),

                'distinct': _distinct,
                'distinct_p': percentage(_distinct, _valids),
                'min': _min,
                'max': _max,
                'sum': _sum,
                'avg': _avg,
                'stddev': _stddev,
            }

            # uniqueness
            _non_duplicates = profile_non_duplicate(conn, cte, cte.c.c)
            _duplicates = _valids - _non_duplicates
            result.update({
                "duplicates": _duplicates,
                "duplicates_p": percentage(_duplicates, _valids),
                "non_duplicates": _non_duplicates,
                "non_duplicates_p": percentage(_non_duplicates, _valids),
            })

            # histogram
            histogram = None
            if _valids > 0 and math.isfinite(_min) and math.isfinite(_max):
                histogram = profile_histogram(conn, cte, cte.c.c, _min, _max, self.is_integer)
            result['histogram'] = histogram

            # quantile
            quantile = {}
            if _valids > 0 and math.isfinite(_min) and math.isfinite(_max):
                quantile = self._profile_quantile(conn, cte, cte.c.c, _valids)
            result.update({
                'p5': quantile.get('p5'),
                'p25': quantile.get('p25'),
                'p50': quantile.get('p50'),
                'p75': quantile.get('p75'),
                'p95': quantile.get('p95'),
            })

            # top k (integer only)
            if self.is_integer:
                topk = None
                if _valids > 0:
                    topk = profile_topk(conn, cte.c.c)
                result["topk"] = topk

            return result

    def _profile_quantile_via_window_function(
        self,
        conn: Connection,
        table: FromClause,
        column: ColumnClause,
        total: int
    ):
        # with t as (
        #   select
        #     column as c,
        #     ntile(20) over (order by column) as n
        #   from table
        # )
        # select n, min(c) from t group by n order by n
        n_bucket = total if total < 100 else 100
        t = select(
            column.label("c"),
            func.ntile(n_bucket).over(order_by=column).label("n")
        ).where(column.isnot(None)).select_from(table).cte()
        stmt = select(t.c.n, func.min(t.c.c)).group_by(t.c.n).order_by(t.c.n)
        result = conn.execute(stmt)
        quantile = []
        for row in result:
            n, v = row
            quantile.append(v)
        return {
            'p5': dtof(quantile[5 * n_bucket // 100]),
            'p25': dtof(quantile[25 * n_bucket // 100]),
            'p50': dtof(quantile[50 * n_bucket // 100]),
            'p75': dtof(quantile[75 * n_bucket // 100]),
            'p95': dtof(quantile[95 * n_bucket // 100]),
        }

    def _profile_quantile_via_query_one_by_one(
        self,
        conn: Connection,
        table: FromClause,
        column: ColumnClause,
        total: int
    ):
        # Query for each quantile
        def ntile(n):
            offset = n * total // 100

            stmt = select(
                column
            ).select_from(
                table
            ).where(
                column.isnot(None)
            ).order_by(
                column
            ).offset(
                offset
            ).limit(1)
            result, = conn.execute(stmt).fetchone()
            return dtof(result)

        return {
            'p5': ntile(5),
            'p25': ntile(25),
            'p50': ntile(50),
            'p75': ntile(75),
            'p95': ntile(95),
        }

    def _profile_quantile(
        self,
        conn: Connection,
        table: FromClause,
        column: ColumnClause,
        total: int
    ) -> dict:
        """

        :param conn:
        :param table: a
        :param column:
        :param total:
        :return:
        """
        backend = self._get_database_backend()

        if backend == 'sqlite':
            import sqlite3
            version = sqlite3.sqlite_version.split(".")

            major = int(version[0]) if len(version) >= 2 else 0
            minor = int(version[1]) if len(version) >= 2 else 0

            if major > 3 or (major == 3 and minor >= 25):
                # use window function if sqlite version >= 3.25.0
                # see https://www.sqlite.org/windowfunctions.html

                return self._profile_quantile_via_window_function(conn, table, column, total)
            else:
                return self._profile_quantile_via_query_one_by_one(conn, table, column, total)
        elif backend == 'duckdb':
            selects = [
                func.approx_quantile(column, literal_column(f"{percentile}")) for percentile in
                [0.05, 0.25, 0.5, 0.75, 0.95]
            ]
        elif backend == 'bigquery':
            # BigQuery does not support WITHIN, change to use over
            #   Ref: https://github.com/great-expectations/great_expectations/blob/develop/great_expectations/dataset/sqlalchemy_dataset.py#L1019:9
            selects = [
                func.percentile_disc(column, percentile).over() for percentile in [0.05, 0.25, 0.5, 0.75, 0.95]
            ]
        elif backend == 'redshift':
            # ref: https://docs.aws.amazon.com/redshift/latest/dg/r_APPROXIMATE_PERCENTILE_DISC.html
            selects = [
                func.approximate_percentile_disc(percentile).within_group(column) for percentile in
                [0.05, 0.25, 0.5, 0.75, 0.95]
            ]
        elif backend == 'awsathena':
            selects = [
                func.approx_percentile(column, percentile) for percentile in
                [0.05, 0.25, 0.5, 0.75, 0.95]
            ]
        else:
            # https://docs.sqlalchemy.org/en/14/core/functions.html#sqlalchemy.sql.functions.percentile_disc
            #
            # select
            #     percentile_disc(0.05) within group (order by column),
            #     percentile_disc(0.25) within group (order by column),
            #     percentile_disc(0.5) within group (order by column),
            #     percentile_disc(0.75) within group (order by column),
            #     percentile_disc(0.95) within group (order by column)
            # from table
            selects = [
                func.percentile_disc(percentile).within_group(column) for percentile in [0.05, 0.25, 0.5, 0.75, 0.95]
            ]

        stmt = select(*selects).select_from(table)
        result = conn.execute(stmt).fetchone()
        return {
            'p5': dtof(result[0]),
            'p25': dtof(result[1]),
            'p50': dtof(result[2]),
            'p75': dtof(result[3]),
            'p95': dtof(result[4]),
        }

    def _profile_histogram(
        self,
        conn: Connection,
        table: FromClause,
        column: ColumnClause,
        min: Union[int, float],
        max: Union[int, float],
        is_integer: bool,
        num_buckets: int = HISTOGRAM_NUM_BUCKET
    ) -> dict:
        if is_integer:
            # min=0, max=50, num_buckets=50  => interval=1, num_buckets=51
            # min=0, max=70, num_buckets=50  => interval=2, num_buckets=36
            # min=0, max=100, num_buckets=50 => interval=2, num_buckets=51
            interval = math.ceil((max - min) / num_buckets) if max > min else 1
            num_buckets = math.ceil((max - min + 1) / interval)
        else:
            interval = (max - min) / num_buckets if max > min else 1

        cases = []
        for i in range(num_buckets):
            bound = min + interval * (i + 1)
            if i != num_buckets - 1:
                cases += [(column < bound, i)]
            else:
                cases += [(column < bound + interval / 100, i)]

        cte_with_bucket = select(
            column.label("c"),
            case(*cases, else_=None).label("bucket")
        ).select_from(
            table
        ).where(
            column.isnot(None)
        ).cte()

        stmt = select(
            cte_with_bucket.c.bucket,
            func.count().label("_count")
        ).group_by(
            cte_with_bucket.c.bucket
        ).order_by(
            cte_with_bucket.c.bucket
        )

        result = conn.execute(stmt)

        counts = []
        labels = []
        bin_edges = []
        for i in range(num_buckets):
            if is_integer:
                start = min + i * interval
                end = min + (i + 1) * interval
                if interval == 1:
                    label = f"{start}"
                else:
                    label = f"{start} _ {end}"
            else:
                if interval >= 1:
                    start = min + i * interval
                    end = min + (i + 1) * interval
                else:
                    start = min + i / (1 / interval)
                    end = min + (i + 1) / (1 / interval)

                label = f"{format_float(start)} _ {format_float(end)}"

            labels.append(label)
            counts.append(0)
            bin_edges.append(start)
            if i == num_buckets - 1:
                bin_edges.append(end)

        for row in result:
            _bucket, v = row
            if _bucket is None:
                continue
            counts[int(_bucket)] = v
        return {
            "type": "histogram",
            "labels": labels,
            "counts": counts,
            "bin_edges": bin_edges,
        }


class DatetimeColumnProfiler(BaseColumnProfiler):
    def __init__(self, engine: Engine, config: dict, table: Table, column: Column):
        super().__init__(engine, config, table, column)

    def _get_table_cte(self) -> CTE:
        t, c = self._get_limited_table_cte()
        if self._get_database_backend() != 'sqlite':
            cte = select(
                c.label("c"),
                c.label("orig")
            ).select_from(t).cte()
        else:
            cte = select(
                case(
                    (func.typeof(c) == 'text', func.datetime(c)),
                    (func.typeof(c) == 'integer', func.datetime(c, 'unixepoch')),
                    (func.typeof(c) == 'real', func.datetime(c, 'unixepoch')),
                    else_=None
                ).label("c"),
                c.label("orig"),
            ).select_from(t).cte()
        return cte

    def profile(self):
        with self.engine.connect() as conn:
            cte = self._get_table_cte()

            stmt = select(
                func.count().label("_total"),
                func.count(cte.c.orig).label("_non_nulls"),
                func.count(cte.c.c).label("_valids"),
                func.count(distinct(cte.c.c)).label("_distinct"),
                func.min(cte.c.c).label("_min"),
                func.max(cte.c.c).label("_max"),
            )
            result = conn.execute(stmt).fetchone()
            _total, _non_nulls, _valids, _distinct, _min, _max = result
            _nulls = _total - _non_nulls
            _invalids = _non_nulls - _valids

            if self._get_database_backend() == 'sqlite':
                if isinstance(self.column.type, Date):
                    _min = datetime.fromisoformat(_min).date() if isinstance(_min, str) else _min
                    _max = datetime.fromisoformat(_max).date() if isinstance(_max, str) else _max
                else:
                    _min = datetime.fromisoformat(_min) if isinstance(_min, str) else _min
                    _max = datetime.fromisoformat(_max) if isinstance(_max, str) else _max

            result = {
                'total': None,
                'samples': _total,
                'samples_p': None,
                'non_nulls': _non_nulls,
                'non_nulls_p': percentage(_non_nulls, _total),
                'nulls': _nulls,
                'nulls_p': percentage(_nulls, _total),
                'valids': _valids,
                'valids_p': percentage(_valids, _total),
                'invalids': _invalids,
                'invalids_p': percentage(_invalids, _total),
                'distinct': _distinct,
                'distinct_p': percentage(_distinct, _valids),
                'min': _min.isoformat() if _min is not None else None,
                'max': _max.isoformat() if _max is not None else None,
            }

            # uniqueness
            _non_duplicates = profile_non_duplicate(conn, cte, cte.c.c)
            _duplicates = _valids - _non_duplicates
            result.update({
                "duplicates": _duplicates,
                "duplicates_p": percentage(_duplicates, _valids),
                "non_duplicates": _non_duplicates,
                "non_duplicates_p": percentage(_non_duplicates, _valids),
            })

            # histogram
            histogram = None
            _type = None
            if _min and _max:
                histogram, _type = self._profile_histogram(conn, cte, cte.c.c, _min, _max)
            result['histogram'] = histogram

            return result

    def _profile_histogram(
        self,
        conn: Connection,
        table: FromClause,
        column: ColumnClause,
        min: Union[date, datetime],
        max: Union[date, datetime]
    ) -> Tuple[dict, str]:
        """
        Profile the histogram of a datetime column. There are three way to create bins of the histogram


        :param conn:
        :param table:
        :param column:
        :param min:
        :param max:
        :return:
        """

        # if self._get_database_backend() == 'sqlite':
        #     min = datetime.fromisoformat(min).date() if min is not None else min
        #     max = datetime.fromisoformat(max).date() if max is not None else max
        # else:
        #     if isinstance(min, datetime):
        #         min = min.date()
        #     if isinstance(max, datetime):
        #         max = max.date()

        _type = None
        histogram = {
            "labels": [],
            "counts": [],
            "bin_edges": [],
        }

        def date_trunc(*args):
            if self._get_database_backend() == 'sqlite':
                if args[0] == "YEAR":
                    return func.strftime("%Y-01-01", args[1])
                elif args[0] == "MONTH":
                    return func.strftime("%Y-%m-01", args[1])
                else:
                    return func.strftime("%Y-%m-%d", args[1])
            elif self._get_database_backend() == 'bigquery':
                date_expression = args[1]
                date_part = args[0]
                return func.date_trunc(date_expression, text(date_part))
            else:
                return func.date_trunc(*args)

        days_delta = (max - min).days
        if days_delta > 365 * 4:
            _type = "yearly"
            dmin = date(min.year, 1, 1)
            if max.year < 3000:
                dmax = date(max.year, 1, 1) + relativedelta(years=+1)
            else:
                dmax = date(3000, 1, 1)
            interval_years = math.ceil((dmax.year - dmin.year) / 50)
            interval = relativedelta(years=+interval_years)
            num_buckets = math.ceil((dmax.year - dmin.year) / interval.years)

            cte = select(date_trunc("YEAR", column).label("d")).select_from(table).cte()
        elif days_delta > 60:
            _type = "monthly"
            interval = relativedelta(months=+1)
            dmin = date(min.year, min.month, 1)
            if max.year < 3000:
                dmax = date(max.year, max.month, 1) + interval
            else:
                dmax = date(3000, 1, 1)
            period = relativedelta(dmax, dmin)
            num_buckets = (period.years * 12 + period.months)
            cte = select(date_trunc("MONTH", column).label("d")).select_from(table).cte()
        else:
            _type = "daily"
            interval = relativedelta(days=+1)
            dmin = date(min.year, min.month, min.day)
            if max.year < 3000:
                dmax = date(max.year, max.month, max.day) + interval
            else:
                dmax = date(3000, 1, 1)
            num_buckets = (dmax - dmin).days
            cte = select(date_trunc("DAY", column).label("d")).select_from(table).cte()

        stmt = select(
            cte.c.d,
            func.count(cte.c.d).label("_count")
        ).group_by(
            cte.c.d
        ).order_by(
            cte.c.d
        )

        result = conn.execute(stmt)

        for i in range(num_buckets):
            label = f"{dmin + i * interval} - {dmin + (i + 1) * interval}"
            histogram["labels"].append(label)
            histogram["bin_edges"].append(str(dmin + i * interval))
            histogram["counts"].append(0)
        histogram["bin_edges"].append(str(dmin + num_buckets * interval))

        for row in result:
            date_truncated, v = row
            if date_truncated is None:
                continue
            elif isinstance(date_truncated, str):
                date_truncated = date.fromisoformat(date_truncated)
            elif isinstance(date_truncated, datetime):
                date_truncated = date_truncated.date()

            for i in range(num_buckets):
                date_edge = date.fromisoformat(histogram["bin_edges"][i + 1])
                if date_truncated < date_edge:
                    histogram["counts"][i] += v
                    break

        return histogram, _type


class BooleanColumnProfiler(BaseColumnProfiler):
    def __init__(self, engine: Engine, config: dict, table: Table, column: Column):
        super().__init__(engine, config, table, column)

    def _get_table_cte(self) -> CTE:
        t, c = self._get_limited_table_cte()
        if self._get_database_backend() != 'sqlite':
            cte = select(
                c.label("c"),
                c.label("orig")
            ).select_from(t).cte()
        else:
            cte = select(
                case(
                    (c == true(), c),
                    (c == false(), c),
                    else_=None
                ).label("c"),
                c.label("orig"),
            ).cte()
        cte = select(
            cte.c.c,
            case((cte.c.c == true(), 1), else_=None).label("true_count"),
            cte.c.orig
        ).select_from(cte).cte()
        return cte

    def profile(self):
        cte = self._get_table_cte()

        with self.engine.connect() as conn:
            stmt = select(
                func.count().label("_total"),
                func.count(cte.c.orig).label("_non_nulls"),
                func.count(cte.c.c).label("_valids"),
                func.count(cte.c.true_count).label("_trues"),
                func.count(distinct(cte.c.c)).label("_distinct"),
            ).select_from(cte)
            result = conn.execute(stmt).fetchone()
            _total, _non_nulls, _valids, _trues, _distinct = result
            _nulls = _total - _non_nulls
            _invalids = _non_nulls - _valids
            _falses = _valids - _trues

            result = {
                'total': None,
                'samples': _total,
                'samples_p': None,
                'non_nulls': _non_nulls,
                'non_nulls_p': percentage(_non_nulls, _total),
                'nulls': _nulls,
                'nulls_p': percentage(_nulls, _total),
                'valids': _valids,
                'valids_p': percentage(_valids, _total),
                'invalids': _invalids,
                'invalids_p': percentage(_invalids, _total),
                'trues': _trues,
                'trues_p': percentage(_trues, _total),
                'falses': _falses,
                'falses_p': percentage(_falses, _total),
                'distinct': _distinct,
                'distinct_p': percentage(_distinct, _valids),
            }

            return result


class UUIDColumnProfiler(BaseColumnProfiler):
    def __init__(self, engine: Engine, config: dict, table: Table, column: Column):
        super().__init__(engine, config, table, column)

    def _get_table_cte(self) -> CTE:
        t, c = self._get_limited_table_cte()
        return select(c.label("c")).select_from(t).cte()

    def profile(self):
        with self.engine.connect() as conn:
            cte = self._get_table_cte()

            columns = [
                func.count().label("_total"),
                func.count(cte.c.c).label("_non_nulls"),
                func.count(distinct(cte.c.c)).label("_distinct"),
            ]

            stmt = select(*columns)
            result = conn.execute(stmt).fetchone()
            _total, _non_nulls, _distinct = result

            _nulls = _total - _non_nulls
            _valids = _non_nulls
            _invalids = _non_nulls - _valids

            result = {
                'total': None,
                'samples': _total,
                'samples_p': None,
                'non_nulls': _non_nulls,
                'non_nulls_p': percentage(_non_nulls, _total),
                'nulls': _nulls,
                'nulls_p': percentage(_nulls, _total),
                'valids': _valids,
                'valids_p': percentage(_valids, _total),
                'invalids': _invalids,
                'invalids_p': percentage(_invalids, _total),
                'distinct': _distinct,
                'distinct_p': percentage(_distinct, _valids),
            }

            # uniqueness
            _non_duplicates = profile_non_duplicate(conn, cte, cte.c.c)
            _duplicates = _valids - _non_duplicates
            result.update({
                "duplicates": _duplicates,
                "duplicates_p": percentage(_duplicates, _valids),
                "non_duplicates": _non_duplicates,
                "non_duplicates_p": percentage(_non_duplicates, _valids),
            })

            # top k
            topk = None
            if _valids > 0:
                topk = profile_topk(conn, func.cast(cte.c.c, String))
            result['topk'] = topk

            return result


def profile_topk(conn, expr, k=50) -> dict:
    stmt = select(
        expr,
        func.count().label("_count")
    ).where(
        expr.isnot(None)
    ).group_by(
        expr
    ).order_by(
        func.count().desc(),
    ).limit(k)
    result = conn.execute(stmt)

    topk = {
        "values": [],
        "counts": [],
    }
    for row in result:
        k, v = row
        if k is not None:
            k = str(k)
        topk["values"].append(k)
        topk["counts"].append(v)
    return topk


def profile_histogram(
    conn: Connection,
    table: FromClause,
    column: ColumnClause,
    min: Union[int, float],
    max: Union[int, float],
    is_integer: bool,
    num_buckets: int = HISTOGRAM_NUM_BUCKET
) -> dict:
    if is_integer:
        # min=0, max=50, num_buckets=50  => interval=1, num_buckets=51
        # min=0, max=70, num_buckets=50  => interval=2, num_buckets=36
        # min=0, max=100, num_buckets=50 => interval=2, num_buckets=51
        interval = math.ceil((max - min) / num_buckets) if max > min else 1
        num_buckets = math.ceil((max - min + 1) / interval)
    else:
        interval = (max - min) / num_buckets if max > min else 1

    cases = []
    for i in range(num_buckets):
        bound = min + interval * (i + 1)
        if i != num_buckets - 1:
            cases += [(column < bound, i)]
        else:
            cases += [(column < bound + interval / 100, i)]

    cte_with_bucket = select(
        column.label("c"),
        case(*cases, else_=None).label("bucket")
    ).select_from(
        table
    ).where(
        column.isnot(None)
    ).cte()

    stmt = select(
        cte_with_bucket.c.bucket,
        func.count().label("_count")
    ).group_by(
        cte_with_bucket.c.bucket
    ).order_by(
        cte_with_bucket.c.bucket
    )

    result = conn.execute(stmt)

    counts = []
    labels = []
    bin_edges = []
    for i in range(num_buckets):
        if is_integer:
            start = min + i * interval
            end = min + (i + 1) * interval
            if interval == 1:
                label = f"{start}"
            else:
                label = f"{start} _ {end}"
        else:
            if interval >= 1:
                start = min + i * interval
                end = min + (i + 1) * interval
            else:
                start = min + i / (1 / interval)
                end = min + (i + 1) / (1 / interval)

            label = f"{format_float(start)} _ {format_float(end)}"

        labels.append(label)
        counts.append(0)
        bin_edges.append(start)
        if i == num_buckets - 1:
            bin_edges.append(end)

    for row in result:
        _bucket, v = row
        if _bucket is None:
            continue
        counts[int(_bucket)] = v
    return {
        "labels": labels,
        "counts": counts,
        "bin_edges": bin_edges,
    }


def profile_non_duplicate(
    conn: Connection,
    table: FromClause,
    column: ColumnClause,
) -> int:
    # with t as (
    #     select count(column) as c
    # from table
    # group by column
    # having c == 1
    # )
    # select
    # count(c) as non_duplicate
    # from t;
    cte = select(
        func.count(column).label("non_duplicates")
    ).select_from(
        table
    ).where(
        column.isnot(None)
    ).group_by(
        column
    ).having(
        func.count(column) == 1
    ).cte()

    stmt = select(func.count(cte.c.non_duplicates)).select_from(cte)
    non_duplicates, = conn.execute(stmt).fetchone()
    return non_duplicates
