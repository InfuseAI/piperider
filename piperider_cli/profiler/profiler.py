import os
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
        genericType = None
        
        if(isinstance(c.type, String)):
            # VARCHAR
            # CHAR
            # TEXT
            # CLOB
            genericType = "string"
            result = self.profile_string_column(table_name, c.name)
        elif (isinstance(c.type, Integer)):
            # INTEGER
            # BIGINT
            # SMALLINT
            genericType = "integer"
            result = self.profile_numeric_column(table_name, c.name)
        elif (isinstance(c.type, Numeric)):
            # NUMERIC
            # DECIMAL
            # FLOAT
            genericType = "numeric"
            result = self.profile_numeric_column(table_name, c.name)
        elif (isinstance(c.type, Date)) or (isinstance(c.type, DateTime)) :
            # DATE
            # DATETIME
            genericType = "datetime"
            result = self.profile_datetime_column(table_name, c.name)                
        else:
            genericType = "other"
            result = self.profile_other_column(table_name, c.name)
        
        result["name"] = column_name
        result["profile_duration"] = 0
        result["type"] = genericType
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
                func.count(t2.c.c).label("_count")
            ).group_by(
                t2.c.c
            ).order_by(
                func.count(t2.c.c).desc(),

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
                func.median(t2.c.c).label("_median"),
            )
            result = conn.execute(stmt).fetchone()
            _total, _non_null, _distinct, _sum, _avg, _min, _max, _median = result
            _sum = float(_sum)
            _avg = float(_avg)
            _min = float(_min)
            _max = float(_max)
            _median = float(_median)
            _num_buckets = 20

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

            t2 = select(t.c[column_name].label("c"), width_bucket(t.c[column_name].label("c"), _min, _max, _num_buckets).label("bucket")).cte(name="T")
            distribution = {
                "type": "histogram",
                "labels": [],
                "counts": [],
            }
            stmt = select(
                t2.c.bucket,
                func.count(t2.c.bucket).label("_count")
            ).group_by(
                t2.c.bucket
            ).order_by(
                t2.c.bucket
            )
            result = conn.execute(stmt)
            for i in range(_num_buckets+1):
                interval = (_max - _min) / _num_buckets
                label = f"{i * interval + _min} -  {(i + 1) * interval + _min}"

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
                'median': float(_median),
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


