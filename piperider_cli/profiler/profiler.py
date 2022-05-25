import os
import time

from sqlalchemy import *


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
                    Table(table, metadata, autoload_with=self.engine)

        profiled_tables = {}
        if not tables:
            tables = self.metadata.tables

        for t in tables:
            tresult = self.profile_table(t)
            profiled_tables[t] = tresult
        return {
            "tables": profiled_tables,
        }

    def profile_table(self, table_name):
        t = self.metadata.tables[table_name]
        columns = {}
        for c in t.columns:
            tresult = self.profile_column(table_name, c.name)
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

    def profile_column(self, table_name, column_name):
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
            result = self.profile_string_column(table_name, c.name)
        elif isinstance(c.type, Integer):
            # INTEGER
            # BIGINT
            # SMALLINT
            generic_type = "integer"
            result = self.profile_numeric_column(table_name, c.name)
        elif isinstance(c.type, Numeric):
            # NUMERIC
            # DECIMAL
            # FLOAT
            generic_type = "numeric"
            result = self.profile_numeric_column(table_name, c.name)
        elif isinstance(c.type, Date) or isinstance(c.type, DateTime):
            # DATE
            # DATETIME
            generic_type = "datetime"
            result = self.profile_datetime_column(table_name, c.name)
        else:
            generic_type = "other"
            result = self.profile_other_column(table_name, c.name)
        profile_end = time.perf_counter()
        duration = profile_end - profile_start

        result["name"] = column_name
        result["profile_duration"] = f"{duration:.2f}"
        result["type"] = generic_type
        result["schema_type"] = str(c.type)
        return result

    def profile_string_column(self, table_name, column_name):
        metadata = MetaData()
        # t = Table(table_name, metadata, Column(column_name, String))
        t = self.metadata.tables[table_name]

        with self.engine.connect() as conn:
            t2 = select(t.c[column_name].label("c")).cte(name="T")
            stmt = select(
                func.count().label("_total"),
                func.count(t2.c.c).label("_non_nulls"),
                func.count(distinct(t2.c.c)).label("_distinct")
            )
            result = conn.execute(stmt).fetchone()
            _total, _non_null, _distinct = result
            distribution = None
            if _non_null > 0:
                distribution = self._dist_topk(conn, t2.c.c, 20)
            return {
                'total': _total,
                'non_nulls': _non_null,
                'distinct': _distinct,
                'distribution': distribution,
            }

    def _dist_topk(self, conn, expr, k):
        stmt = select(
                expr,
                func.count().label("_count")
            ).group_by(
                expr
            ).order_by(
                func.count().desc(),
            ).limit(k)
        result = conn.execute(stmt)

        distribution = {
                "type": "topk", # Top K Items
                "labels": [],
                "counts": [],
            }
        for row in result:
            k,v = row
            if k is not None:
                k = str(k)
            distribution["labels"].append(k)
            distribution["counts"].append(v)
        return distribution

    def profile_numeric_column(self, table_name, column_name):
        metadata = MetaData()
        # t = Table(table_name, metadata, Column(column_name, Numeric))
        t = self.metadata.tables[table_name]

        with self.engine.connect() as conn:
            t2 = select(t.c[column_name].label("c")).cte(name="T")
            stmt = select(
                func.count().label("_total"),
                func.count(t2.c.c).label("_non_nulls"),
                func.count(distinct(t2.c.c)).label("_distinct"),
                func.sum(t2.c.c).label("_sum"),
                func.avg(t2.c.c).label("_avg"),
                func.min(t2.c.c).label("_min"),
                func.max(t2.c.c).label("_max"),
            )
            result = conn.execute(stmt).fetchone()
            _total, _non_null, _distinct, _sum, _avg, _min, _max = result
            _sum = float(_sum) if _sum is not None else None
            _avg = float(_avg) if _avg is not None else None
            _min = float(_min) if _min is not None else None
            _max = float(_max) if _max is not None else None
            _num_buckets = 20

            def map_bucket(expr, min_value, max_value, num_buckets):
                interval = (max_value - min_value) / num_buckets
                cases = []
                for i in range(num_buckets):
                    bound = min_value + interval * (i+1)
                    if i != num_buckets-1:
                        cases += [(expr < bound, i)]
                    else:
                        cases += [(expr <= bound, i)]
                
                return case(
                    cases, else_=None
                )


            distribution=None
            if _non_null == 1:
                distribution = self._dist_topk(conn, t2.c.c, 20)
            elif _non_null > 0:
                dmin, dmax, interval = Profiler._calc_numeric_range(_min, _max)

                t2 = select(
                    t.c[column_name].label("c"), 
                    map_bucket(t.c[column_name].label("c"), dmin, dmin + interval*_num_buckets, _num_buckets).label("bucket")
                ).where(
                    t.c[column_name] != None
                ).cte(name="T")
                stmt = select(
                    t2.c.bucket,
                    func.count().label("_count")
                ).group_by(
                    t2.c.bucket
                ).order_by(
                    t2.c.bucket
                )
                result = conn.execute(stmt)
                distribution = {
                    "type": "histogram",
                    "labels": [],
                    "counts": [],
                }
                for i in range(_num_buckets):
                    if interval >= 1:                
                        label = f"{i * interval + dmin} -  {(i + 1) * interval + dmin}"
                    else:
                        label = f"{i / (1 / interval) + dmin} -  {(i + 1) / (1 / interval) + dmin}"

                    distribution["labels"].append(label)
                    distribution["counts"].append(0)

                for row in result:                    
                    _bucket, v = row
                    if _bucket is None:
                        continue
                    distribution["counts"][int(_bucket)] = v

            return {
                'total': _total,
                'non_nulls': _non_null,
                'distinct': _distinct,
                'min': _min,
                'max': _max,
                'sum': _sum,
                'avg': _avg,
                'distribution': distribution,
            }

    def profile_datetime_column(self, table_name, column_name):
        metadata = MetaData()
        t = Table(table_name, metadata, Column(column_name, DateTime))
        # t = self.metadata.tables[table_name]

        with self.engine.connect() as conn:
            t2 = select(t.c[column_name].label("c")).cte(name="T")
            stmt = select(
                func.count().label("_total"),
                func.count(t2.c.c).label("_non_nulls"),
                func.count(distinct(t2.c.c)).label("_distinct"),
                func.min(t2.c.c).label("_min"),
                func.max(t2.c.c).label("_max"),
            )
            result = conn.execute(stmt).fetchone()
            _total, _non_null, _distinct, _min, _max, = result

            t2 = select(func.date_trunc("YEAR", t.c[column_name]).label("d")).cte(name="T")
            distribution = {
                "type": "yearly",
                "labels": [],
                "counts": [],
            }
            stmt = select(
                t2.c.d,
                func.count(t2.c.d).label("_count")
            ).group_by(
                t2.c.d
            ).order_by(
                t2.c.d
            )
            result = conn.execute(stmt)
            for row in result:
                k, v = row
                distribution["labels"].append(str(k))
                distribution["counts"].append(v)
            return {
                'total': _total,
                'non_nulls': _non_null,
                'distinct': _distinct,
                'min': str(_min),
                'max': str(_max),
                'distribution': distribution,
            }

    def profile_other_column(self, table_name, column_name):
        metadata = MetaData()
        # t = Table(table_name, metadata, Column(column_name, String))
        t = self.metadata.tables[table_name]

        with self.engine.connect() as conn:
            t2 = select(t.c[column_name].label("c")).cte(name="T")
            stmt = select(
                func.count().label("_total"),
                func.count(t2.c.c).label("_non_nulls"),
                func.count(distinct(t2.c.c)).label("_distinct")
            )
            result = conn.execute(stmt).fetchone()
            _total, _non_null, _distinct = result
            return {
                'total': _total,
                'non_nulls': _non_null,
                'distinct': _distinct,
                'distribution': None,
            }


    @staticmethod
    def _calc_numeric_range(min, max) :
        import math
        if min > 0 and max / 2 > min:
            min=0
        elif min == max:
            if min == 0:
                min = 0
                max = 1
            elif min > 0:
                min = 0
            else:
                max = 0            
        range = max - min

        # find the range
        base = math.pow(10, math.floor(math.log10(range)))
        if range / base == 1:
            range = base
        elif range / base <= 2:
            range = base * 2
        elif range / base <= 4:
            range = base * 4
        else:
            range = base * 10

        interval = range / 20
        if interval >= 1:
            min=math.floor(min/interval)*interval
            max=math.ceil(max/interval)*interval
        else:
            min=math.floor(min/interval) / (1 / interval)
            max=math.ceil(max/interval) / (1 / interval)

        if max - min > interval * 20:
            return Profiler._calc_numeric_range(min, max)            
        else:
            return min, max, interval            

if __name__ == '__main__':
    user= os.getenv("SNOWFLAKE_USER")
    password= os.getenv("SNOWFLAKE_PASSWORD")
    account=os.getenv("SNOWFLAKE_ACCOUNT")
    database="DEMO"
    schema="PUBLIC"
    warehouse="COMPUTE_WH"

    engine = create_engine(f"snowflake://{user}:{password}@{account}/{database}/{schema}?warehouse={warehouse}")
    profiler = Profiler(engine)
    result = profiler.profile()
    import json

    print(json.dumps(result, indent=4))
    with open('report.json', 'w') as f:
        f.write(json.dumps(result, indent=4))
