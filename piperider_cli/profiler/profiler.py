import os
import time

from sqlalchemy import *


class Profiler:
    engine = None
    metadata = None

    def __init__(self, engine):
        self.engine = engine
        # reflect the metadata
        print("fetching metadata")
        self.metadata = metadata = MetaData()
        metadata.reflect(bind=engine)

    def profile(self):
        tables = {}
        for t in self.metadata.tables:
            tresult = self.profile_table(t)
            tables[t] = tresult
        return {
            "tables": tables,
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
        elif isinstance(c.type, Date) or isinstance(c.type, DateTime) :
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
            stmt = select(
                t2.c.c,
                func.count().label("_count")
            ).group_by(
                t2.c.c
            ).order_by(
                func.count().desc(),

            ).limit(20)
            result = conn.execute(stmt)
            distribution = {
                "type": "topk", # Top K Items
                "labels": [],
                "counts": [],
            }
            for row in result:
                # distribution += [list(row)]
                k,v = row
                distribution["labels"].append(k)
                distribution["counts"].append(v)
            return {
                'total': _total,
                'non_nulls': _non_null,
                'distinct': _distinct,
                'distribution': distribution,
            }

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
            _sum = float(_sum)
            _avg = float(_avg)
            _min = float(_min)
            _max = float(_max)
            _num_buckets = 20

            def width_bucket(expr, min_value, max_value, num_buckets):
                interval = (max_value - min_value) / num_buckets
                cases = []
                cases += [(expr == None, None)]
                for i in range(num_buckets):
                    bound = min_value + interval * i
                    cases += [(expr < bound, i)]
                cases += [(expr <= max_value, num_buckets)]                
                return case(
                    cases, else_=num_buckets+1
                )

            dmin, _, interval = Profiler._calc_numeric_range(_min, _max)

            t2 = select(
                t.c[column_name].label("c"), 
                width_bucket(t.c[column_name].label("c"), dmin, dmin + interval*_num_buckets, _num_buckets).label("bucket")
            ).where(
                t.c[column_name] != None
            ).cte(name="T")
            distribution = {
                "type": "histogram",
                "labels": [],
                "counts": [],
            }
            stmt = select(
                t2.c.bucket,
                func.count().label("_count")                        
            ).group_by(
                t2.c.bucket
            ).order_by(
                t2.c.bucket
            )
            print(stmt)
            result = conn.execute(stmt)
            for i in range(_num_buckets):
                label = f"{i * interval + dmin} -  {(i + 1) * interval + dmin}"

                distribution["labels"].append(label)
                distribution["counts"].append(0)

            for row in result:
                _bucket, v = row
                distribution["counts"][int(_bucket-1)] = v

            return {
                'total': _total,
                'non_nulls': _non_null,
                'distinct': _distinct,
                'min': float(_min),
                'max': float(_max),
                'sum': float(_sum),
                'avg': float(_avg),
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
            _total, _non_null, _distinct, _min, _max,  = result

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
        print(f"({min}, {max})")
        if min > 0 and max / 2 > min:
            min=0
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
        return min, max, interval            

if __name__ == '__main__':
    user= os.getenv("SNOWFLAKE_USER")
    password= os.getenv("SNOWFLAKE_PASSWORD")
    account=os.getenv("SNOWFLAKE_ACCOUNT")
    database="INFUSE_FINANCE"
    schema="PUBLIC"
    warehouse="COMPUTE_WH"

    engine = create_engine(f"snowflake://{user}:{password}@{account}/{database}/{schema}?warehouse={warehouse}")
    profiler = Profiler(engine)
    result = profiler.profile()
    import json
    print(json.dumps(result, indent=4))
    with open('report.json', 'w') as f:
        f.write(json.dumps(result, indent=4))

