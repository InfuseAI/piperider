from datetime import date, datetime

from sqlalchemy.engine import Engine

from piperider_cli.datasource.sqlite import SqliteDataSource
from piperider_cli.profiler import Profiler, ProfileSubject
from sqlalchemy import *
from typing import List

from tests.common import create_table


def almost_equal(x, y, threshold=0.01):
    return abs(x - y) < threshold


class TestMultiDB:

    def test_basic_profile(self):
        data_source = SqliteDataSource("test")
        engine1 = data_source.get_engine_by_database("db1")
        engine2 = data_source.get_engine_by_database("db2")
        data = [
            ("user_id", "user_name", "age"),
            (1, "bob", 23),
            (2, "alice", 25),
        ]
        create_table(engine1, "test1", data)
        create_table(engine2, "test2", data)

        profiler = Profiler(data_source)
        result = profiler.profile([ProfileSubject('test1', database='db1', ref_id='foo.test1'),
                                   ProfileSubject('test2', database='db2', ref_id='foo.test2')])
        assert "test1" in result["tables"]
        assert "test2" in result["tables"]
