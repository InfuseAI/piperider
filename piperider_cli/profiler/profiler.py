import decimal
import math
import time
from datetime import date

from dateutil.relativedelta import relativedelta
from sqlalchemy import MetaData, Table, String, Integer, Numeric, Date, DateTime, Boolean, select, func, distinct, case

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
    engine = None
    metadata = None

    def __init__(self, engine):
        self.engine = engine

    def profile(self, tables=None):
        # reflect the metadata

        metadata = self.metadata
        if not metadata:
            self.metadata = metadata = MetaData()
            if not tables:
                print("fetching metadata")
                metadata.reflect(bind=self.engine)
            else:
                for table in tables:
                    print(f"fetching metadata for table '{table}'")
                    if len(table.split('.')) == 2:
                        schema, table = table.split('.')
                        metadata.schema = schema
                    Table(table, metadata, autoload_with=self.engine)

        profiled_tables = {}
        if not tables:
            tables = self.metadata.tables

        for t in tables:
            tresult = self._profile_table(t)
            profiled_tables[t] = tresult
        return {
            "tables": profiled_tables,
        }

    def _profile_table(self, table_name):
        t = self.metadata.tables[table_name]
        columns = {}
        for c in t.columns:
            tresult = self._profile_column(table_name, c.name)
            columns[c.name] = tresult

        row_count = 0
        for k in columns:
            row_count = columns[k]["total"]
            break

        return {
            "name": table_name,
            "row_count": row_count,
            "col_count": len(columns),
            "columns": columns
        }

    def _profile_column(self, table_name, column_name):
        t = self.metadata.tables[table_name]
        c = t.c[column_name]

        print(f"profiling [{c.table.name}.{c.name}] type={c.type}")
        result = None
        generic_type = None
        profile_start = time.perf_counter()
        if isinstance(c.type, String):
            # VARCHAR
            # CHAR
            # TEXT
            # CLOB
            generic_type = "string"
            result = self._profile_string_column(table_name, c.name)
        elif isinstance(c.type, Integer):
            # INTEGER
            # BIGINT
            # SMALLINT
            generic_type = "integer"
            result = self._profile_numeric_column(table_name, c.name, is_integer=True)
        elif isinstance(c.type, Numeric):
            # NUMERIC
            # DECIMAL
            # FLOAT
            generic_type = "numeric"
            result = self._profile_numeric_column(table_name, c.name, is_integer=False)
        elif isinstance(c.type, Date) or isinstance(c.type, DateTime):
            # DATE
            # DATETIME
            generic_type = "datetime"
            result = self._profile_datetime_column(table_name, c.name)
        elif isinstance(c.type, Boolean):
            # BOOLEAN
            generic_type = "boolean"
            result = self._profile_bool_column(table_name, c.name)
        else:
            generic_type = "other"
            result = self._profile_other_column(table_name, c.name)
        profile_end = time.perf_counter()
        duration = profile_end - profile_start

        result["name"] = column_name
        result["profile_duration"] = f"{duration:.2f}"
        result["type"] = generic_type
        result["schema_type"] = str(c.type)
        return result

    def _profile_string_column(self, table_name, column_name):
        # metadata = MetaData()
        # t = Table(table_name, metadata, Column(column_name, String))
        t = self.metadata.tables[table_name]

        with self.engine.connect() as conn:
            t2 = select([t.c[column_name].label("c")]).cte(name="T")
            stmt = select([
                func.count().label("_total"),
                func.count(t2.c.c).label("_non_nulls"),
                func.count(distinct(t2.c.c)).label("_distinct")
            ])
            result = conn.execute(stmt).fetchone()
            _total, _non_null, _distinct = result
            distribution = None
            if _non_null > 0:
                distribution = self._dist_topk(conn, t2.c.c)
            return {
                'total': _total,
                'non_nulls': _non_null,
                'distinct': _distinct,
                'distribution': distribution,
            }

    def _dist_topk(self, conn, expr, k=20):
        stmt = select([
            expr,
            func.count().label("_count")
        ]).group_by(
            expr
        ).order_by(
            func.count().desc(),
        ).limit(k)
        result = conn.execute(stmt)

        distribution = {
            "type": "topk",  # Top K Items
            "labels": [],
            "counts": [],
        }
        for row in result:
            k, v = row
            if k is not None:
                k = str(k)
            distribution["labels"].append(k)
            distribution["counts"].append(v)
        return distribution

    def _calc_quantile(self, conn, table, column, total) -> dict:
        if not total:
            return {}

        if self.engine.url.get_backend_name() == "sqlite":
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

    def _calc_histogram(self, conn, table, column, min, max, is_integer, num_buckets=HISTOGRAM_NUM_BUCKET):

        if is_integer:
            # min=0, max=50, num_buckets=50  => interval=1, num_buckets=51
            # min=0, max=70, num_buckets=50  => interval=2, num_buckets=36
            # min=0, max=100, num_buckets=50 => interval=2, num_buckets=51
            interval = math.ceil((max - min) / num_buckets) if max > min else 1
            num_buckets = math.ceil((max - min + 1) / interval)
        else:
            interval = (max - min) / num_buckets

        cases = []
        for i in range(num_buckets):
            bound = min + interval * (i + 1)
            if i != num_buckets - 1:
                cases += [(column < bound, i)]
            else:
                cases += [(column <= bound, i)]

        t2 = select([
            column.label("c"),
            case(cases, else_=None).label("bucket")
        ]).select_from(
            table
        ).where(
            column.isnot(None)
        ).cte(name="T_WITH_BUCKET")

        stmt = select([
            t2.c.bucket,
            func.count().label("_count")
        ]).group_by(
            t2.c.bucket
        ).order_by(
            t2.c.bucket
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

    def _profile_numeric_column(self, table_name: str, column_name: str, is_integer: bool):
        # metadata = MetaData()
        # t = Table(table_name, metadata, Column(column_name, Numeric))
        t = self.metadata.tables[table_name]

        with self.engine.connect() as conn:
            if self.engine.url.get_backend_name() != "sqlite":
                t2 = select([
                    t.c[column_name].label("c"),
                    case(
                        [(t.c[column_name].is_(None), None)],
                        else_=0
                    ).label("mismatched")
                ]).cte(name="T")
            else:
                t2 = select([
                    case(
                        [(func.typeof(t.c[column_name]) == 'text', None),
                         (func.typeof(t.c[column_name]) == 'blob', None)],
                        else_=t.c[column_name]
                    ).label("c"),
                    case(
                        [(func.typeof(t.c[column_name]) == 'text', 1),
                         (func.typeof(t.c[column_name]) == 'blob', 1),
                         (func.typeof(t.c[column_name]) == 'null', None)],
                        else_=0
                    ).label("mismatched")
                ]).cte(name="T")

            stmt = select([
                func.count().label("_total"),
                func.count(t2.c.mismatched).label("_non_nulls"),
                func.sum(t2.c.mismatched).label("_mismatched"),
                func.count(distinct(t2.c.c)).label("_distinct"),
                func.sum(t2.c.c).label("_sum"),
                func.avg(t2.c.c).label("_avg"),
                func.min(t2.c.c).label("_min"),
                func.max(t2.c.c).label("_max"),
                func.avg(t2.c.c * t2.c.c).label("_square_avg"),
            ])
            result = conn.execute(stmt).fetchone()
            _total, _non_null, _mismatched, _distinct, _sum, _avg, _min, _max, _square_avg = result

            _sum = dtof(_sum)
            _min = dtof(_min)
            _max = dtof(_max)
            _avg = dtof(_avg)
            _square_avg = dtof(_square_avg)
            _stddev = math.sqrt(_square_avg - _avg * _avg) if _square_avg and _avg else None

            # quantile
            quantile = self._calc_quantile(conn, t2, t2.c.c, _total)

            # histogram

            distribution = self._calc_histogram(conn, t2, t2.c.c, _min, _max, is_integer) if _non_null > 0 else None

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

    def _profile_datetime_column(self, table_name, column_name):
        t = self.metadata.tables[table_name]

        with self.engine.connect() as conn:
            t2 = select([t.c[column_name].label("c")]).cte(name="T")
            stmt = select([
                func.count().label("_total"),
                func.count(t2.c.c).label("_non_nulls"),
                func.count(distinct(t2.c.c)).label("_distinct"),
                func.min(t2.c.c).label("_min"),
                func.max(t2.c.c).label("_max"),
            ])
            result = conn.execute(stmt).fetchone()
            _total, _non_null, _distinct, _min, _max, = result

            distribution = None
            if _non_null == 1 or _distinct == 1:
                distribution = self._dist_topk(conn, t2.c.c)
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

                dmin, dmax, interval = Profiler._calc_date_range(_min, _max)
                if interval.years:
                    distribution["type"] = "yearly"
                    period = relativedelta(dmax, dmin)
                    num_buckets = math.ceil(period.years / interval.years)
                    t2 = select([date_trunc("YEAR", t.c[column_name]).label("d")]).cte(name="T")
                elif interval.months:
                    distribution["type"] = "monthly"
                    period = relativedelta(dmax, dmin)
                    num_buckets = (period.years * 12 + period.months) // interval.months
                    t2 = select([date_trunc("MONTH", t.c[column_name]).label("d")]).cte(name="T")
                else:
                    distribution["type"] = "daily"
                    period = dmax - dmin
                    num_buckets = (period.days + 1) // interval.days
                    t2 = select([date_trunc("DAY", t.c[column_name]).label("d")]).cte(name="T")

                stmt = select([
                    t2.c.d,
                    func.count(t2.c.d).label("_count")
                ]).group_by(
                    t2.c.d
                ).order_by(
                    t2.c.d
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

                    for i in range(num_buckets):
                        d = distribution["labels"][i].split(" - ")
                        if date.fromisoformat(d[0]) <= bucket < date.fromisoformat(d[1]):
                            distribution["counts"][i] += v
                            break

            return {
                'total': _total,
                'non_nulls': _non_null,
                'mismatched': 0,
                'distinct': _distinct,
                'min': str(_min),
                'max': str(_max),
                'distribution': distribution,
            }

    def _profile_bool_column(self, table_name, column_name):
        t = self.metadata.tables[table_name]

        with self.engine.connect() as conn:
            t2 = select([t.c[column_name].label("c")]).cte(name="T")
            stmt = select([
                func.count().label("_total"),
                func.count(t2.c.c).label("_non_nulls"),
            ])
            result = conn.execute(stmt).fetchone()
            _total, _non_null, = result

            distribution = None
            if _non_null > 0:
                distribution = self._dist_topk(conn, t2.c.c, 3)
            return {
                'total': _total,
                'non_nulls': _non_null,
                'mismatched': 0,
                'distribution': distribution,
            }

    def _profile_other_column(self, table_name, column_name):
        # metadata = MetaData()
        # t = Table(table_name, metadata, Column(column_name, String))
        t = self.metadata.tables[table_name]

        with self.engine.connect() as conn:
            t2 = select([t.c[column_name].label("c")]).cte(name="T")
            stmt = select([
                func.count().label("_total"),
                func.count(t2.c.c).label("_non_nulls"),
                func.count(distinct(t2.c.c)).label("_distinct")
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

    @staticmethod
    def _calc_date_range(min_date, max_date):
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
