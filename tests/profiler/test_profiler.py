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
        print(table)
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

    def test_answer(self):
        engine = self.engine = create_engine('sqlite://')        

        data = [
            ("user_id", "user_name","age"),
            (1, "bob", 23),
            (2, "alice",25),
            (5, "alice",40),
            (10, "pop",40),
            (6, "andy",None),
            (7, None,None),
            (8, None,None),
        ]
        self.create_table("user", data)        
        profiler = Profiler(engine)
        result = profiler.profile()
        import json
        print(json.dumps(result, indent=4))

        
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
            print(f"low:{low}\thigh:{high}\trange:({min}, {max})\tinterval:{interval}")        
            assert emin==min
            assert einterval==interval

