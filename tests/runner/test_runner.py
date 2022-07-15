import os
import json

from piperider_cli.profiler import Profiler
from piperider_cli.adapter import DbtAdapter, DbtAdaptee
from tests.common import MockDatabase
from sqlalchemy import *
from unittest import TestCase


class MockDbtAdaptee(DbtAdaptee):

    def __init__(self):
        self.run_results = ''
        self.dir = os.path.dirname(os.path.abspath(__file__))

    def set_root(self, root):
        pass

    def check(self):
        return True

    def list_resources(self, types=[], keys=''):
        filename = 'dbt_desc_output' if 'description' in keys else 'dbt_list_output'
        path = os.path.join(self.dir, "mock_data", filename)
        with open(path) as fh:
            return fh.read()

    def run(self, cmd_arr):
        path = os.path.join(self.dir, "mock_data", "dbt_run_results")
        with open(path) as fh:
            self.run_results = json.load(fh)

    def get_run_results(self):
        return self.run_results


class TestRunner(TestCase):

    def setUp(self):
        self.db = MockDatabase()
        self.profiler = Profiler(self.db.engine)

        data1 = [
            ("open", "ma60", "ma20"),
            (1, 2, 3),
            (4, 5, 6),
        ]
        data2 = [
            ("open", "ma60", "ma20"),
            (1, 2, 3),
            (4, 5, 6),
        ]
        self.db.create_table("PRICE", data1)
        self.db.create_table("PRICE_20210128", data2)
        self.profile_results = self.profiler.profile()

        # dbt related
        self.dbt_config = dict(
            profile='foo1k',
            projectDir='foo1k',
            target='test'
        )
        self.dbt_adapter = DbtAdapter(self.dbt_config, adaptee=MockDbtAdaptee())
        self.dbt_adapter.set_dbt_command('test')

    def test_dbt_list_tables(self):
        tables = self.dbt_adapter.list_dbt_tables('PUBLIC')
        tables.sort()

        self.assertEqual('PRICE,PRICE_20210128,symbol_all', ','.join(tables))

    def test_dbt_run_results(self):
        results = self.dbt_adapter.run_dbt_command(None, 'PUBLIC')

        self.assertIn('PRICE_20210128', results)
        self.assertIn('ma60', results['PRICE_20210128']['columns'])
        self.assertEqual('failed', results['PRICE_20210128']['columns']['ma60'][0]['status'])

    def test_dbt_append_descriptions(self):
        self.dbt_adapter.append_descriptions(self.profile_results, 'PUBLIC')

        self.assertEqual('test - via DBT', self.profile_results['tables']['PRICE_20210128']['description'])
        self.assertEqual('ooopppen - via DBT',
                         self.profile_results['tables']['PRICE_20210128']['columns']['open']['description'])
        self.assertEqual('ma 20 - via DBT', self.profile_results['tables']['PRICE']['columns']['ma20']['description'])
