from datetime import date, datetime

from piperider_cli.profiler import Profiler
from sqlalchemy import *
from typing import List


def almost_equal(x, y, threshold=0.01):
    return abs(x - y) < threshold


class TestProfiler:
    engine = None

    def create_table(self, table_name: str, data: List[tuple], columns=None, metadata=None):
        header = data[0]
        data = data[1:]

        if not metadata:
            metadata = MetaData()

        if not columns:
            columns = []
            if len(data) == 0:
                raise Exception("columns is not specified and data is empty")
            first = data[0]
            for i in range(len(header)):
                col_name = header[i]
                value = first[i]
                col = None
                if isinstance(value, str):
                    col = Column(col_name, String)
                elif isinstance(value, float):
                    col = Column(col_name, Float)
                elif isinstance(value, int):
                    col = Column(col_name, Integer)
                elif isinstance(value, datetime):
                    col = Column(col_name, DateTime)
                elif isinstance(value, date):
                    col = Column(col_name, Date)
                else:
                    raise Exception(f"not support type: {type(value)}")
                columns.append(col)
        table = Table(table_name, metadata, *columns)
        table.create(bind=self.engine)

        with self.engine.connect() as conn:
            for row in data:
                row_data = dict(zip(header, row))
                stmt = (
                    insert(table).
                        values(**row_data)
                )
                conn.execute(stmt)

        return table

    def test_basic_profile(self):
        engine = self.engine = create_engine('sqlite://')

        data = [
            ("user_id", "user_name", "age"),
            (1, "bob", 23),
            (2, "alice", 25),
        ]
        self.create_table("test1", data)
        self.create_table("test2", data)
        profiler = Profiler(engine)
        result = profiler.profile()
        assert "test1" in result["tables"]
        assert "test2" in result["tables"]

        profiler = Profiler(engine)
        result = profiler.profile(tables=["test1"])
        assert "test1" in result["tables"]
        assert "test2" not in result["tables"]

    def test_integer_metrics(self):
        engine = self.engine = create_engine('sqlite://')
        data = [
            ("col",),
            (0,),
            (20,),
            (None,),
        ]
        self.create_table("test", data)
        profiler = Profiler(engine)
        result = profiler.profile()["tables"]["test"]['columns']["col"]
        assert result["total"] == 3
        assert result["nulls"] == 1
        assert result["non_nulls"] == 2
        assert result["valids"] == 2
        assert result["invalids"] == 0
        assert result["zeros"] == 1
        assert result["negatives"] == 0
        assert result["positives"] == 1

        histogram = result["histogram"]
        assert histogram["labels"][0] == '0'
        assert histogram["counts"][0] == 1
        assert histogram["labels"][20] == '20'
        assert histogram["counts"][20] == 1
        assert histogram["counts"][5] == 0
        assert histogram["bin_edges"][0] == 0
        assert histogram["bin_edges"][21] == 21

        #
        engine = self.engine = create_engine('sqlite://')
        data = [
            ("col",),
            (0,),
            (50,),
        ]
        self.create_table("test", data)
        profiler = Profiler(engine)

        result = profiler.profile()["tables"]["test"]['columns']["col"]["distribution"]
        assert result["labels"][0] == '0'
        assert result["counts"][0] == 1
        assert result["labels"][50] == '50'
        assert result["counts"][50] == 1
        assert result["counts"][5] == 0
        assert result["bin_edges"][0] == 0
        assert result["bin_edges"][51] == 51

        #
        engine = self.engine = create_engine('sqlite://')
        data = [
            ("col",),
            (0,),
        ]
        self.create_table("test", data)
        profiler = Profiler(engine)

        result = profiler.profile()["tables"]["test"]['columns']["col"]["histogram"]
        assert result["labels"][0] == '0'
        assert result["counts"][0] == 1
        assert result["bin_edges"][0] == 0
        assert result["bin_edges"][1] == 1
        assert len(result["labels"]) == 1

        #
        engine = self.engine = create_engine('sqlite://')
        data = [
            ("col",),
            (10,),
            (100,),
            (1000,),
            (500,),
            (750,),
        ]
        self.create_table("test", data)
        profiler = Profiler(engine)

        result = profiler.profile()["tables"]["test"]['columns']["col"]
        assert result['avg'] == 472.0
        assert almost_equal(result['stddev'], 376.47)
        assert result['sum'] == 2360
        assert result['min'] == 10
        assert result['p5'] == 10
        assert result['p25'] == 100
        assert result['p50'] == 500
        assert result['p75'] == 750
        assert result['p95'] == 1000
        assert result['max'] == 1000

        result = result["histogram"]
        assert result["labels"][0] == '10 _ 30'
        assert result["counts"][0] == 1
        assert result["labels"][49] == '990 _ 1010'
        assert result["counts"][49] == 1
        assert result["bin_edges"][0] == 10
        assert result["bin_edges"][50] == 1010

        # no data
        engine = self.engine = create_engine('sqlite://')
        data = [
            ("num", "col"),
        ]
        self.create_table("test", data, columns=[Column("col", Integer)])
        profiler = Profiler(engine)
        result = profiler.profile()["tables"]["test"]['columns']["col"]
        assert result['sum'] is None
        assert result['min'] is None
        assert result['p5'] is None
        assert result['p25'] is None
        assert result['p50'] is None
        assert result['p75'] is None
        assert result['p95'] is None
        assert result['max'] is None
        assert result['distribution'] is None

    def test_numeric_metrics(self):
        engine = self.engine = create_engine('sqlite://')

        data = [
            ("col",),
            (-20.0,),
            (0.0,),
            (20.0,),
            (None,),
        ]
        self.create_table("test", data)
        profiler = Profiler(engine)

        result = profiler.profile()["tables"]["test"]['columns']["col"]

        assert result["total"] == 4
        assert result["nulls"] == 1
        assert result["non_nulls"] == 3
        assert result["valids"] == 3
        assert result["invalids"] == 0
        assert result["zeros"] == 1
        assert result["negatives"] == 1
        assert result["positives"] == 1

        assert result['avg'] == 0
        assert almost_equal(result['stddev'], 16.33)
        assert result['sum'] == 0
        assert result['min'] == -20
        assert result['p5'] == -20
        assert result['p25'] == -20
        assert result['p50'] == 0
        assert result['p75'] == 20
        assert result['p95'] == 20
        assert result['max'] == 20

        result = result["histogram"]
        assert result["counts"][0] == 1
        assert result["counts"][49] == 1
        assert result["counts"][25] == 1

        #
        engine = self.engine = create_engine('sqlite://')
        data = [
            ("col",),
            (10.0,),
            (100.0,),
            (1000.0,),
            (500.0,),
            (750.0,),
        ]
        self.create_table("test", data)
        profiler = Profiler(engine)
        result = profiler.profile()["tables"]["test"]['columns']["col"]["histogram"]
        assert result["labels"][0] == '10.00 _ 29.80'
        assert result["counts"][0] == 1
        assert result["labels"][49] == '980.20 _ 1.0K'
        assert result["counts"][49] == 1
        assert result["bin_edges"][0] == 10.0
        assert result["bin_edges"][50] == 1000.0

        # negative
        engine = self.engine = create_engine('sqlite://')
        data = [
            ("col",),
            (-110.0,),
            (100.0,),
            (1000.0,),
            (500.0,),
            (750.0,),
        ]
        self.create_table("test", data)
        profiler = Profiler(engine)

        result = profiler.profile()["tables"]["test"]['columns']["col"]
        assert result['avg'] == 448
        assert almost_equal(result['stddev'], 407.69)
        assert result['sum'] == 2240
        assert result['min'] == -110
        assert result['p5'] == -110
        assert result['p25'] == 100
        assert result['p50'] == 500
        assert result['p75'] == 750
        assert result['p95'] == 1000
        assert result['max'] == 1000

        result = result["histogram"]
        assert result["labels"][0] == '-110.00 _ -87.80'
        assert result["counts"][0] == 1
        assert result["labels"][27] == '489.40 _ 511.60'
        assert result["counts"][27] == 1
        assert result["labels"][49] == '977.80 _ 1.0K'
        assert result["counts"][49] == 1

        # no data
        engine = self.engine = create_engine('sqlite://')
        data = [
            ("num", "col"),
        ]
        self.create_table("test", data, columns=[Column("col", Numeric)])
        profiler = Profiler(engine)
        result = profiler.profile()["tables"]["test"]['columns']["col"]
        assert result['sum'] is None
        assert result['min'] is None
        assert result['p5'] is None
        assert result['p25'] is None
        assert result['p50'] is None
        assert result['p75'] is None
        assert result['p95'] is None
        assert result['max'] is None
        assert result['distribution'] is None

    def test_numeric_invalid(self):
        engine = self.engine = create_engine('sqlite://')

        data = [
            ("col",),
            (0,),
            (0.0,),
            ("abc",),
            (b"abc",),
            (None,),
        ]
        self.create_table("test", data, columns=[Column("col", Integer)])
        profiler = Profiler(engine)
        result = profiler.profile()["tables"]["test"]['columns']["col"]
        assert result["total"] == 5
        assert result["non_nulls"] == 4
        assert result["invalids"] == 2

    def test_string_metrics(self):
        engine = self.engine = create_engine('sqlite://')

        data = [
            ("str",),
            ("hello",),
            ("hello",),
            ("hello world",),
            ("world",),
            ("",),
            ("123",),
            ("2022-07-18",),
            (None,),
        ]
        self.create_table("test", data, columns=[
            Column("str", String)
        ])
        profiler = Profiler(engine)
        result = profiler.profile()["tables"]["test"]['columns']["str"]

        assert result["total"] == 8
        assert result["nulls"] == 1
        assert result["non_nulls"] == 7
        assert result["valids"] == 7
        assert result["invalids"] == 0
        assert result["zero_length"] == 1
        assert result["non_zero_length"] == 6

        assert result["min"] == 0
        assert result["max"] == 11
        assert almost_equal(result["avg"], 5.57)
        assert almost_equal(result["stddev"], 3.54)
        assert result["histogram"]["counts"][0] == 1
        assert result["histogram"]["counts"][-1] == 1
        assert result["topk"]["counts"][0] == 2
        assert result["topk"]["counts"][-1] == 1
        assert len(result["topk"]["counts"]) == 6

    def test_string_invalid(self):
        engine = self.engine = create_engine('sqlite://')

        data = [
            ("str",),
            ("hello",),
            ("hello",),
            ("hello world",),
            (123,),
            ("2022-07-18",),
            (None,),
        ]
        self.create_table("test", data, columns=[
            Column("str", String)
        ])
        with engine.connect() as conn:
            conn.execute("insert into test values (x'A1B2')")
        profiler = Profiler(engine)
        result = profiler.profile()["tables"]["test"]['columns']["str"]
        assert result["total"] == 7
        assert result["non_nulls"] == 6
        assert result["valids"] == 5
        assert result["invalids"] == 1

    def test_datetime_metric(self):
        engine = self.engine = create_engine('sqlite://')

        data = [
            ("col",),
            (date(2021, 1, 1),),
            (datetime(2021, 1, 1),),
            (None,),
        ]

        self.create_table("test", data, columns=[Column("col", DateTime)])
        profiler = Profiler(engine)
        result = profiler.profile()["tables"]["test"]['columns']["col"]
        assert result["total"] == 3
        assert result["non_nulls"] == 2
        assert result["nulls"] == 1
        assert result["invalids"] == 0
        assert result["valids"] == 2

    def test_datetime_invalid(self):
        engine = self.engine = create_engine('sqlite://')

        data = [
            ("col",),
            (date(2021, 1, 1),),
            (datetime(2021, 1, 1),),
            (None,),
        ]

        self.create_table("test", data, columns=[Column("col", DateTime)])
        with engine.connect() as conn:
            conn.execute("insert into test values (0)")
            conn.execute("insert into test values (1.3)")
            conn.execute("insert into test values ('abc')")
            conn.execute("insert into test values ('2021-02-13')")
            conn.execute("insert into test values (x'A1B2')")
        profiler = Profiler(engine)
        result = profiler.profile()["tables"]["test"]['columns']["col"]
        assert result["total"] == 8
        assert result["non_nulls"] == 7
        assert result["invalids"] == 2

    def test_boolean_metric(self):
        engine = self.engine = create_engine('sqlite://')

        data = [
            ("col",),
            (True,),
            (True,),
            (False,),
            (None,),
        ]

        self.create_table("test", data, columns=[Column("col", Boolean)])
        profiler = Profiler(engine)
        result = profiler.profile()["tables"]["test"]['columns']["col"]
        assert result["total"] == 4
        assert result["nulls"] == 1
        assert result["non_nulls"] == 3
        assert result["valids"] == 3
        assert result["invalids"] == 0
        assert result["trues"] == 2
        assert result["falses"] == 1

    def test_boolean_invalid(self):
        engine = self.engine = create_engine('sqlite://')

        data = [
            ("col",),
        ]

        self.create_table("test", data, columns=[Column("col", Boolean)])
        with engine.connect() as conn:
            conn.execute("PRAGMA ignore_check_constraints = 1")
            conn.execute("insert into test values (0)")
            conn.execute("insert into test values (1)")
            conn.execute("insert into test values (2.3)")  # invalid
            conn.execute("insert into test values ('1')")
            conn.execute("insert into test values ('123')")  # invalid
            conn.execute("insert into test values (x'A1B2')")  # invalid
            conn.execute("insert into test values (NULL)")
        profiler = Profiler(engine)
        result = profiler.profile()["tables"]["test"]['columns']["col"]
        assert result["total"] == 7
        assert result["non_nulls"] == 6
        assert result["invalids"] == 3

    def test_date_boundary(self):
        # yearly
        engine = self.engine = create_engine('sqlite://')
        data = [
            ("date",),
            (date(1900, 5, 26),),
            (date(2022, 6, 26),),
            (date(2022, 7, 26),),
        ]
        self.create_table("test", data)
        profiler = Profiler(engine)
        result = profiler.profile()
        cresult = result["tables"]["test"]['columns']["date"]
        histogram = cresult["histogram"]
        assert cresult["min"] == '1900-05-26'
        assert cresult["max"] == '2022-07-26'
        assert histogram["counts"][0] == 1
        assert histogram["counts"][-1] == 2
        assert histogram["bin_edges"][0] == "1900-01-01"
        assert histogram["bin_edges"][-1] == "2023-01-01"

        # monthly
        engine = self.engine = create_engine('sqlite://')
        data = [
            ("date",),
            (date(2021, 12, 25),),
            (date(2022, 2, 24),),
            (date(2022, 2, 26),),
        ]
        self.create_table("test", data)
        profiler = Profiler(engine)
        result = profiler.profile()
        cresult = result["tables"]["test"]['columns']["date"]
        histogram = cresult["histogram"]
        assert cresult["min"] == '2021-12-25'
        assert cresult["max"] == '2022-02-26'
        assert histogram["counts"][0] == 1
        assert histogram["counts"][-1] == 2
        assert histogram["bin_edges"][0] == "2021-12-01"
        assert histogram["bin_edges"][-1] == "2022-03-01"

        # daily
        engine = self.engine = create_engine('sqlite://')
        data = [
            ("date",),
            (datetime(2022, 7, 26, 1, 2, 3),),
            (date(2022, 6, 24),),
            (date(2022, 7, 26),),
        ]
        self.create_table("test", data)
        profiler = Profiler(engine)
        result = profiler.profile()
        cresult = result["tables"]["test"]['columns']["date"]
        histogram = cresult["histogram"]
        assert cresult["min"] == '2022-06-24T00:00:00'
        assert cresult["max"] == '2022-07-26T01:02:03'
        assert histogram["counts"][0] == 1
        assert histogram["counts"][-1] == 2
        assert histogram["bin_edges"][0] == "2022-06-24"
        assert histogram["bin_edges"][-1] == "2022-07-27"

        # one record or min=max
        engine = self.engine = create_engine('sqlite://')
        data = [
            ("date",),
            (date(2022, 1, 1),),
            (datetime(2022, 1, 1, 1, 2, 3),),
        ]
        self.create_table("test", data)
        profiler = Profiler(engine)
        result = profiler.profile()
        cresult = result["tables"]["test"]['columns']["date"]
        histogram = cresult["histogram"]
        assert cresult["min"] == '2022-01-01'
        assert cresult["max"] == '2022-01-01'
        assert histogram["counts"][0] == 2
        assert histogram["counts"][-1] == 2
        assert histogram["bin_edges"][0] == "2022-01-01"
        assert histogram["bin_edges"][-1] == "2022-01-02"

    def test_empty_table(self):
        engine = self.engine = create_engine('sqlite://')

        data = [
            ("num", "str"),
        ]
        self.create_table("test", data, columns=[Column("num", Integer), Column("str", String)])
        profiler = Profiler(engine)
        result = profiler.profile()
        assert result["tables"]["test"]['columns']["num"]["histogram"] == None
        assert result["tables"]["test"]['columns']["str"]["topk"] == None

    def test_one_row_table(self):
        engine = self.engine = create_engine('sqlite://')

        data = [
            ("num", "str", "num_empty"),
            (1.0, "hello", None),
        ]
        self.create_table("test", data, columns=[
            Column("num", Float),
            Column("str", String),
            Column("num_empty", Integer)
        ])
        profiler = Profiler(engine)
        result = profiler.profile()
        assert result["tables"]["test"]['columns']["num"]["histogram"]["counts"][0] == 1
        assert result["tables"]["test"]['columns']["str"]["topk"]["counts"][0] == 1
        assert result["tables"]["test"]['columns']["num_empty"]["histogram"] == None
        assert result["tables"]["test"]['columns']["num_empty"]["topk"] == None
