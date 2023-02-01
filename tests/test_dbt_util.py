import os
from unittest import TestCase

import piperider_cli.dbtutil as dbtutil
from piperider_cli.datasource.sqlite import SqliteDataSource
from piperider_cli.profiler import Profiler
from tests.common import create_table


class TestRunner(TestCase):

    def setUp(self):
        self.dbt_state_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mock_dbt_data")

    def test_get_dbt_state_candidate(self):
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir)
        self.assertEqual(tables[0].table, 'PRICE_PRESENT')
        self.assertEqual(tables[0].schema, 'PUBLIC')
        self.assertEqual(tables[0].name, 'PRICE_PRESENT')

    def test_get_dbt_state_tests_result(self):
        results = dbtutil.get_dbt_state_tests_result(self.dbt_state_dir)

        table_names = [r.get('table') for r in results]
        column_names = [r.get('column') for r in results]

        self.assertIn('PRICE_PRESENT', table_names)
        self.assertIn('MA60', column_names)

        status = None
        for r in results:
            if r.get('table') == 'PRICE_PRESENT' and r.get('column') == 'MA60':
                status = r.get('status')
                break
        self.assertEqual('failed', status)

    def test_dbt_append_descriptions(self):
        ds = SqliteDataSource("test")
        engine = ds.get_engine_by_database()
        profiler = Profiler(ds)

        data1 = [
            ("symbol", "open", "ma60", "ma20"),
            ("AAA", 1, 2, 3),
            ("BBB", 4, 5, 6),
        ]
        data2 = [
            ("symbol", "open", "ma60", "ma20"),
            ("CCC", 1, 2, 3),
            ("DDD", 4, 5, 6),
        ]
        create_table(engine, "PRICE", data1)
        create_table(engine, "PRICE_PRESENT", data2)
        profile_results = profiler.profile()
        dbtutil.append_descriptions(profile_results, self.dbt_state_dir)

        self.assertEqual('The price data to today - via DBT',
                         profile_results['tables']['PRICE_PRESENT']['description'])
        self.assertEqual('The symbol name - via DBT',
                         profile_results['tables']['PRICE_PRESENT']['columns']['symbol']['description'])
