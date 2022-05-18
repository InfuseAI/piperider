import os
from statistics import median
from sqlalchemy import *

class Profiler:
    engine = None
    metadata = None

    def __init__(self, engine):
        self.engine = engine
        # reflect the metadata
        # self.metadata = metadata = MetaData()
        # metadata.reflect(bind=engine)

    def profile_column(self, table_name, column_name):
        return self.profile_datetime_column(table_name, column_name)

    def profile_string_column(self, table_name, column_name):
        metadata = MetaData()
        t = Table(table_name, metadata, Column(column_name, String))
        # t = self.metadata.tables[table_name]

        with engine.connect() as conn:
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
                func.count(t2.c.c).label("_count")
            ).group_by(
                t2.c.c
            ).order_by(
                func.count(t2.c.c).desc(),

            ).limit(20)
            result = conn.execute(stmt)
            distribution = []
            for row in result:
                distribution += [list(row)]
            return {
                'total': _total,
                'non_nulls': _non_null,
                'distinct': _distinct,
                'distribution': distribution,
            }

    def profile_numeric_column(self, table_name, column_name):
        metadata = MetaData()
        t = Table(table_name, metadata, Column(column_name, Numeric))
        # t = self.metadata.tables[table_name]

        with engine.connect() as conn:
            t2 = select(t.c[column_name].label("c")).cte(name="T")
            stmt = select(
                func.count().label("_total"),
                func.count(t2.c.c).label("_non_nulls"),
                func.count(distinct(t2.c.c)).label("_distinct"),
                func.sum(t2.c.c).label("_sum"),
                func.avg(t2.c.c).label("_avg"),
                func.min(t2.c.c).label("_min"),
                func.max(t2.c.c).label("_max"),
                func.median(t2.c.c).label("_median"),
            )
            result = conn.execute(stmt).fetchone()
            _total, _non_null, _distinct, _sum, _avg, _min, _max, _median = result
            _sum = float(_sum)
            _avg = float(_avg)
            _min = float(_min)
            _max = float(_max)
            _median = float(_median)

            def width_bucket(expr, min_value, max_value, num_buckets):
                interval = (max_value - min_value) / num_buckets
                cases = []
                for i in range(num_buckets):
                    bound = min_value + interval * i
                    cases += [(expr < bound, i)]
                cases += [(expr <= max_value, num_buckets)]
                return case(
                    cases, else_=num_buckets+1
                )

            t2 = select(t.c[column_name].label("c"), width_bucket(t.c[column_name].label("c"), _min, _max, 20).label("bucket")).cte(name="T")
            distribution = []
            stmt = select(
                t2.c.bucket,
                func.count(t2.c.bucket).label("_count")
            ).group_by(
                t2.c.bucket
            ).order_by(
                t2.c.bucket
            )
            print(stmt)
            result = conn.execute(stmt)
            for row in result:
                _bucket, _value_count = row
                distribution += [[_bucket, _value_count]]
            return {
                'total': _total,
                'non_nulls': _non_null,
                'distinct': _distinct,
                'min': float(_min),
                'max': float(_max),
                'sum': float(_sum),
                'avg': float(_avg),
                'median': float(_median),
                'distribution': distribution,
            }

    def profile_datetime_column(self, table_name, column_name):
        metadata = MetaData()
        t = Table(table_name, metadata, Column(column_name, DateTime))
        # t = self.metadata.tables[table_name]

        with engine.connect() as conn:
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
            distribution = []
            stmt = select(
                t2.c.d,
                func.count(t2.c.d).label("_count")
            ).group_by(
                t2.c.d
            ).order_by(
                t2.c.d
            )
            print(stmt)
            result = conn.execute(stmt)
            for row in result:
                _d, _value_count = row
                distribution += [[str(_d), _value_count]]
            return {
                'total': _total,
                'non_nulls': _non_null,
                'distinct': _distinct,
                'min': str(_min),
                'max': str(_max),
                'distribution': distribution,
            }            

if __name__ == '__main__':
    user= os.getenv("SNOWFLAKE_USER")
    password= os.getenv("SNOWFLAKE_PASSWORD")
    account=os.getenv("SNOWFLAKE_ACCOUNT")
    database="INFUSE_FINANCE"
    schema="PUBLIC"
    warehouse="COMPUTE_WH"

    engine = create_engine(f"snowflake://{user}:{password}@{account}/{database}/{schema}?warehouse={warehouse}")
    profiler = Profiler(engine)
    result = profiler.profile_column("price", "date")
    # print(result)
    import json
    print(json.dumps(result, indent=4))


