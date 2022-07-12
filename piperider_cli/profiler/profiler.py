import decimal
import math
import time
from datetime import datetime, date

from dateutil.relativedelta import relativedelta
from sqlalchemy import MetaData, Table, Column, String, Integer, Numeric, Date, DateTime, Boolean, select, func, \
    distinct, case, or_
from sqlalchemy.types import Float
from sqlalchemy.engine import Engine
from .event import ProfilerEventHandler, DefaultProfilerEventHandler

HISTOGRAM_NUM_BUCKET = 50


# dtof is helpler function to transform decimal value to float. Decimal is not json serializable type.
def dtof(value):
    if isinstance(value, decimal.Decimal):
        return float(value)
    return value


def format_float(val):
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
        return f"{val / (10 ** 9):.1f}T"
    elif base < 15:
        return f"{val / (10 ** 12):.1f}B"
    else:
        return f"{val / (10 ** 12):.0f}B"


class Profiler:
    engine: Engine = None
    metadata = None
    event_handler: ProfilerEventHandler

    def __init__(self, engine: Engine, event_handler: ProfilerEventHandler = DefaultProfilerEventHandler()):
        self.engine = engine
        self.event_handler = event_handler

    def profile(self, tables=None):
        profiled_tables = {}
        result = {
            "tables": profiled_tables,
        }
        self.event_handler.handle_run_start(result)

        metadata = self.metadata
        if not metadata:
            self.metadata = metadata = MetaData()
            if not tables:
                self.event_handler.handle_fetch_metadata_all_start()
                metadata.reflect(bind=self.engine)
                tables = self.metadata.tables.keys()
            else:
                for table in tables:
                    self.event_handler.handle_fetch_metadata_table_start(table)
                    if len(table.split('.')) == 2:
                        schema, table = table.split('.')
                        metadata.schema = schema
                    Table(table, metadata, autoload_with=self.engine)

        table_count = len(tables)
        table_index = 0
        self.event_handler.handle_run_progress(result, table_count, table_index)
        for table_name in tables:
            t = self.metadata.tables[table_name]
            tresult = self._profile_table(t)
            profiled_tables[table_name] = tresult
            table_index = table_index + 1
            self.event_handler.handle_run_progress(result, table_count, table_index)

        self.event_handler.handle_run_end(result)

        return result

    def _profile_table(self, table):
        col_index = 0
        col_count = len(table.columns)
        columns = {}
        result = {
            "name": table.name,
            "row_count": 0,
            "col_count": col_count,
            "columns": columns
        }

        if not self.engine:
            # unittest case
            return result

        self.event_handler.handle_table_start(result)

        # Profile table metrics
        with self.engine.connect() as conn:
            stmt = select([
                func.count(),
            ]).select_from(table)
            row_count, = conn.execute(stmt).fetchone()
            result["row_count"] = row_count
        self.event_handler.handle_table_progress(result, col_count, col_index)

        # Profile columns
        for column in table.columns:
            columns[column.name] = self._profile_column(table, column)
            col_index = col_index + 1
            self.event_handler.handle_table_progress(result, col_count, col_index)

        self.event_handler.handle_table_end(result)

        return result

    def _profile_column(self, table: Table, column: Column):
        if isinstance(column.type, String):
            # VARCHAR
            # CHAR
            # TEXT
            # CLOB
            generic_type = "string"
            profiler = StringColumnProfiler(self.engine, table, column)
        elif isinstance(column.type, Integer):
            # INTEGER
            # BIGINT
            # SMALLINT
            generic_type = "integer"
            profiler = NumericColumnProfiler(self.engine, table, column, is_integer=True)
        elif isinstance(column.type, Numeric):
            # NUMERIC
            # DECIMAL
            # FLOAT
            generic_type = "numeric"
            profiler = NumericColumnProfiler(self.engine, table, column, is_integer=False)
        elif isinstance(column.type, Date) or isinstance(column.type, DateTime):
            # DATE
            # DATETIME
            generic_type = "datetime"
            profiler = DatetimeColumnProfiler(self.engine, table, column)
        elif isinstance(column.type, Boolean):
            # BOOLEAN
            generic_type = "boolean"
            profiler = BooleanColumnProfiler(self.engine, table, column)
        else:
            generic_type = "other"
            profiler = BaseColumnProfiler(self.engine, table, column)

        result = {
            "name": column.name,
            "type": generic_type,
            "schema_type": str(column.type)
        }

        self.event_handler.handle_column_start(table.name, result)

        profile_start = time.perf_counter()
        profile_result = profiler.profile()
        profile_end = time.perf_counter()
        duration = profile_end - profile_start

        result.update(profile_result)
        result["profile_duration"] = f"{duration:.2f}"
        result["elapsed_milli"] = int(duration * 1000)

        self.event_handler.handle_column_end(table.name, result)

        return result


class BaseColumnProfiler:
    engine: Engine = None
    table: Table = None
    column: Column = None

    def __init__(self, engine, table: Table, column: Column):
        self.engine = engine
        self.table = table
        self.column = column

    def _get_table_cte(self):
        t = self.table
        c = self.column

        return select([c.label("c")]).select_from(t).cte()

    def profile(self):
        with self.engine.connect() as conn:
            cte = self._get_table_cte()
            stmt = select([
                func.count().label("_total"),
                func.count(cte.c.c).label("_non_nulls"),
                func.count(distinct(cte.c.c)).label("_distinct")
            ])
            result = conn.execute(stmt).fetchone()
            _total, _non_null, _distinct = result
            return {
                'total': _total,
                'non_nulls': _non_null,
                'mismatched': 0,
                'distinct': _distinct,
                'distribution': None,
            }


class StringColumnProfiler(BaseColumnProfiler):

    def __init__(self, engine, table: Table, column: Column):
        super().__init__(engine, table, column)

    def profile(self):
        with self.engine.connect() as conn:
            cte = self._get_table_cte()
            stmt = select([
                func.count().label("_total"),
                func.count(cte.c.c).label("_non_nulls"),
                func.count(distinct(cte.c.c)).label("_distinct")
            ])
            result = conn.execute(stmt).fetchone()
            _total, _non_null, _distinct = result
            distribution = None
            if _non_null > 0:
                distribution = profile_topk(conn, cte.c.c)
            return {
                'total': _total,
                'non_nulls': _non_null,
                'distinct': _distinct,
                'distribution': distribution,
            }


class NumericColumnProfiler(BaseColumnProfiler):
    is_integer: bool

    def __init__(self, engine, table: Table, column: Column, is_integer: bool):
        super().__init__(engine, table, column)
        self.is_integer = is_integer

    def _get_table_cte(self):
        t = self.table
        c = self.column
        if self.engine.url.get_backend_name() != "sqlite":
            cte = select([
                c.label("c"),
                case(
                    [(c.is_(None), None)],
                    else_=0
                ).label("mismatched")
            ]).select_from(t).cte()
        else:
            cte = select([
                case(
                    [(func.typeof(c) == 'text', None),
                     (func.typeof(c) == 'blob', None)],
                    else_=c
                ).label("c"),
                case(
                    [(func.typeof(c) == 'text', 1),
                     (func.typeof(c) == 'blob', 1),
                     (func.typeof(c) == 'null', None)],
                    else_=0
                ).label("mismatched")
            ]).cte(name="T")
        return cte

    def profile(self):
        with self.engine.connect() as conn:
            cte = self._get_table_cte()

            stmt = select([
                func.count().label("_total"),
                func.count(cte.c.mismatched).label("_non_nulls"),
                func.sum(cte.c.mismatched).label("_mismatched"),
                func.count(distinct(cte.c.c)).label("_distinct"),
                func.sum(cte.c.c).label("_sum"),
                func.avg(cte.c.c).label("_avg"),
                func.min(cte.c.c).label("_min"),
                func.max(cte.c.c).label("_max"),
                func.avg(func.cast(cte.c.c, Float) * func.cast(cte.c.c, Float)).label("_square_avg"),
            ])
            result = conn.execute(stmt).fetchone()
            _total, _non_null, _mismatched, _distinct, _sum, _avg, _min, _max, _square_avg = result
            _mismatched = 0 if _mismatched is None else _mismatched
            _valid = _non_null - _mismatched

            _sum = dtof(_sum)
            _min = dtof(_min)
            _max = dtof(_max)
            _avg = dtof(_avg)
            _square_avg = dtof(_square_avg)
            _stddev = math.sqrt(_square_avg - _avg * _avg) if _square_avg and _avg else None

            if _valid > 0:
                quantile = self._profile_quantile(conn, cte, cte.c.c, _valid, self.engine.url.get_backend_name())
                distribution = self._profile_histogram(conn, cte, cte.c.c, _min, _max, self.is_integer)
            else:
                quantile = {}
                distribution = None

            return {
                'total': _total,
                'non_nulls': _non_null,
                'mismatched': _mismatched,
                'distinct': _distinct,
                'min': _min,
                'max': _max,
                'sum': _sum,
                'avg': _avg,
                'p5': quantile.get('p5'),
                'p25': quantile.get('p25'),
                'stddev': _stddev,
                'p50': quantile.get('p50'),
                'p75': quantile.get('p75'),
                'p95': quantile.get('p95'),
                'distribution': distribution,
            }

    def _profile_quantile(self, conn, table, column, total, backend=None) -> dict:
        if backend == "sqlite":
            # with t as (
            #   select
            #     column as c,
            #     ntile(20) over (order by column) as n
            #   from table
            # )
            # select n, min(c) from t group by n order by n
            n_bucket = total if total < 100 else 100
            t = select([
                column.label("c"),
                func.ntile(n_bucket).over(order_by=column).label("n")
            ]).cte()
            stmt = select([t.c.n, func.min(t.c.c)]).group_by(t.c.n).order_by(t.c.n)
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
            stmt = select(selects).select_from(table)
            result = conn.execute(stmt).fetchone()
            return {
                'p5': dtof(result[0]),
                'p25': dtof(result[1]),
                'p50': dtof(result[2]),
                'p75': dtof(result[3]),
                'p95': dtof(result[4]),
            }

    def _profile_histogram(self, conn, table, column, min, max, is_integer, num_buckets=HISTOGRAM_NUM_BUCKET):
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
                cases += [(column <= bound, i)]

        cte_with_bucket = select([
            column.label("c"),
            case(cases, else_=None).label("bucket")
        ]).select_from(
            table
        ).where(
            column.isnot(None)
        ).cte()

        stmt = select([
            cte_with_bucket.c.bucket,
            func.count().label("_count")
        ]).group_by(
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
    def __init__(self, engine, table: Table, column: Column):
        super().__init__(engine, table, column)

    def _get_table_cte(self):
        t = self.table
        c = self.column
        if self.engine.url.get_backend_name() != "sqlite":
            cte = select([
                c.label("c"),
                case(
                    [(c.is_(None), None)],
                    else_=0
                ).label("mismatched")
            ]).select_from(t).cte()
        else:
            cte = select([
                case(
                    [(func.datetime(c).is_(None), None)],
                    else_=func.datetime(c)
                ).label("c"),
                case(
                    [((func.typeof(c) == 'text') & (func.datetime(c).is_(None)), 1),
                     (func.typeof(c) == 'null', None)],
                    else_=0
                ).label("mismatched")
            ]).cte()
        return cte

    def profile(self):
        with self.engine.connect() as conn:
            cte = self._get_table_cte()

            stmt = select([
                func.count().label("_total"),
                func.count(cte.c.c).label("_non_nulls"),
                func.sum(cte.c.mismatched).label("_mismatched"),
                func.count(distinct(cte.c.c)).label("_distinct"),
                func.min(cte.c.c).label("_min"),
                func.max(cte.c.c).label("_max"),
            ])
            result = conn.execute(stmt).fetchone()
            _total, _non_null, _mismatched, _distinct, _min, _max = result

            if self.engine.url.get_backend_name() == "sqlite":
                _min = datetime.fromisoformat(_min).date() if _min is not None else _min
                _max = datetime.fromisoformat(_max).date() if _max is not None else _max
            else:
                if isinstance(_min, datetime):
                    _min = _min.date()
                if isinstance(_max, datetime):
                    _max = _max.date()

            distribution = None
            if _non_null == 1 or _distinct == 1:
                distribution = profile_topk(conn, cte.c.c)
            elif _non_null > 0:
                distribution = {
                    "type": "",
                    "labels": [],
                    "counts": [],
                }

                def date_trunc(*args):
                    if self.engine.url.get_backend_name() == "sqlite":
                        if args[0] == "YEAR":
                            return func.strftime("%Y-01-01", args[1])
                        elif args[0] == "MONTH":
                            return func.strftime("%Y-%m-01", args[1])
                        else:
                            return func.strftime("%Y-%m-%d", args[1])
                    else:
                        return func.date_trunc(*args)

                dmin, dmax, interval = self._calc_date_range(_min, _max)
                if interval.years:
                    distribution["type"] = "yearly"
                    period = relativedelta(dmax, dmin)
                    num_buckets = math.ceil(period.years / interval.years)
                    cte = select([date_trunc("YEAR", cte.c.c).label("d")]).cte(name="T")
                elif interval.months:
                    distribution["type"] = "monthly"
                    period = relativedelta(dmax, dmin)
                    num_buckets = (period.years * 12 + period.months) // interval.months
                    cte = select([date_trunc("MONTH", cte.c.c).label("d")]).cte(name="T")
                else:
                    distribution["type"] = "daily"
                    period = dmax - dmin
                    num_buckets = (period.days + 1) // interval.days
                    cte = select([date_trunc("DAY", cte.c.c).label("d")]).cte(name="T")

                stmt = select([
                    cte.c.d,
                    func.count(cte.c.d).label("_count")
                ]).group_by(
                    cte.c.d
                ).order_by(
                    cte.c.d
                )

                result = conn.execute(stmt)

                for i in range(num_buckets):
                    label = f"{dmin + i * interval} - {dmin + (i + 1) * interval}"
                    distribution["labels"].append(label)
                    distribution["counts"].append(0)

                for row in result:
                    bucket, v = row
                    if bucket is None:
                        continue
                    elif isinstance(bucket, str):
                        bucket = date.fromisoformat(bucket)
                    elif isinstance(bucket, datetime):
                        bucket = bucket.date()

                    for i in range(num_buckets):
                        d = distribution["labels"][i].split(" - ")
                        if date.fromisoformat(d[0]) <= bucket < date.fromisoformat(d[1]):
                            distribution["counts"][i] += v
                            break

            return {
                'total': _total,
                'non_nulls': _non_null,
                'mismatched': _mismatched,
                'distinct': _distinct,
                'min': str(_min) if _min is not None else _min,
                'max': str(_max) if _max is not None else _max,
                'distribution': distribution,
            }

    def _calc_date_range(self, min_date, max_date):
        period = max_date - min_date
        if math.ceil(period.days / 365) > 2:
            # more than 2 years
            min_date = date(min_date.year, 1, 1)
            max_date = max_date + relativedelta(years=+1)
            n_buckets = 20
            years = relativedelta(max_date, min_date).years
            n = math.ceil(years / n_buckets)
            interval = relativedelta(years=+n)
        elif period.days > 31:
            # more than 1 months
            min_date = date(min_date.year, min_date.month, 1)
            max_date = max_date + relativedelta(months=+1)
            interval = relativedelta(months=+1)
        else:
            min_date = date(min_date.year, min_date.month, min_date.day)
            max_date = date(max_date.year, max_date.month, max_date.day)
            interval = relativedelta(days=+1)
        return min_date, max_date, interval


class BooleanColumnProfiler(BaseColumnProfiler):
    def __init__(self, engine, table: Table, column: Column):
        super().__init__(engine, table, column)

    def _get_table_cte(self):
        t = self.table
        c = self.column
        if self.engine.url.get_backend_name() != "sqlite":
            cte = select([
                c.label("c"),
                case(
                    [(c.is_(None), None)],
                    else_=0
                ).label("mismatched")
            ]).select_from(t).cte()
        else:
            cte = select([
                case(
                    [(c.is_(True), c),
                     (c.is_(False), c)],
                    else_=None
                ).label("c"),
                case(
                    [(c.is_(True), 0),
                     (c.is_(False), 0),
                     (c.is_(None), None)],
                    else_=1
                ).label("mismatched")
            ]).cte()
        return cte

    def profile(self):
        cte = self._get_table_cte()

        with self.engine.connect() as conn:
            stmt = select([
                func.count().label("_total"),
                func.count(cte.c.mismatched).label("_non_nulls"),
                func.sum(cte.c.mismatched).label("_mismatched"),
                func.count(distinct(cte.c.c)).label("_distinct"),
            ]).select_from(cte)
            result = conn.execute(stmt).fetchone()
            _total, _non_null, _mismatched, _distinct = result

            distribution = None
            if _non_null > 0:
                distribution = profile_topk(conn, cte.c.c, 3)
            return {
                'total': _total,
                'non_nulls': _non_null,
                'mismatched': _mismatched,
                'distinct': _distinct,
                'distribution': distribution,
            }


def profile_topk(conn, expr, k=20):
    stmt = select([
        expr,
        func.count().label("_count")
    ]).group_by(
        expr
    ).order_by(
        func.count().desc(),
    ).limit(k)
    result = conn.execute(stmt)

    topk = {
        "type": "topk",  # Top K Items
        "labels": [],
        "counts": [],
    }
    for row in result:
        k, v = row
        if k is not None:
            k = str(k)
        topk["labels"].append(k)
        topk["counts"].append(v)
    return topk
