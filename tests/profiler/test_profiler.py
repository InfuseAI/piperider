from piperider_cli.profiler import Profiler
from sqlalchemy import *


class TestProfiler:
    engine = None

    def create_table(self, table_name: str, data: list[tuple], columns=None, metadata=None):
        header = data[0]
        data = data[1:]

        if not metadata:
            metadata = MetaData()

        if not columns:
            columns=[]
            if len(data) == 0:
                raise Exception("columns is not specified and data is empty")            
            first=data[0]
            for i in range(len(header)):
                col_name=header[i]
                value = first[i]
                col = None
                if isinstance(value, str):
                    col=Column(col_name, String)
                elif isinstance(value, int):
                    col=Column(col_name, Integer)                
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
            ("user_id", "user_name","age"),
            (1, "bob", 23),
            (2, "alice",25),
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

    def test_numeric_boundary(self):
        engine = self.engine = create_engine('sqlite://')        

        data = [
            ("num",),
            (0,),
            (20,),
        ]
        self.create_table("test", data)
        profiler = Profiler(engine)
        result = profiler.profile()
        assert result["tables"]["test"]['columns']["num"]["distribution"]["counts"][0] == 1
        assert result["tables"]["test"]['columns']["num"]["distribution"]["counts"][19] == 1
        assert result["tables"]["test"]['columns']["num"]["distribution"]["counts"][5] == 0

    def test_empty_table(self):
        engine = self.engine = create_engine('sqlite://')        

        data = [
            ("num", "str"),
        ]
        self.create_table("test", data, columns=[Column("num", Integer), Column("str", String)])
        profiler = Profiler(engine)
        result = profiler.profile()
        assert result["tables"]["test"]['columns']["num"]["distribution"] == None
        assert result["tables"]["test"]['columns']["str"]["distribution"] == None

    def test_one_row_table(self):
        engine = self.engine = create_engine('sqlite://')        

        data = [
            ("num", "str", "num_empty"),
            (1, "hello", None),
        ]
        self.create_table("test", data, columns=[
            Column("num", Integer), 
            Column("str", String),
            Column("num_empty", Integer)
        ])
        profiler = Profiler(engine)
        result = profiler.profile()
        assert result["tables"]["test"]['columns']["num"]["distribution"]["counts"][0] == 1
        assert result["tables"]["test"]['columns']["str"]["distribution"]["counts"][0] == 1
        assert result["tables"]["test"]['columns']["num_empty"]["distribution"] == None

        
    def test_range(self):
        tests=[
            (0.1, 200, 0, 10),
            (150, 250, 150, 5),    
            (8700, 15000, 8500, 500),
            (235, 753, 0, 50),
            (20, 250, 0, 20),        
            (50, 700, 0, 50),            
            (5000, 70000, 0, 5000), 
            (0.05, 0.0788, 0.05, 0.002),
            (1, 21, 0, 2),
            (-1, 100, -10, 10),
            (-134, 543, -150, 50),
            (-0.134, 0.543, -0.15, 0.05),
            (0.151, 0.16, 0.151, 0.0005),
            (-20, -10, -20, 0.5),
            (-18, -2, -18, 1),
        ]

        for test in tests:
            low,high, emin, einterval =test
            min, max, interval = Profiler._calc_numeric_range(low,high)
            assert emin==min
            assert einterval==interval

