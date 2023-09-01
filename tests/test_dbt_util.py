import os
from pathlib import Path
from unittest import TestCase, mock, skip

import pytest

import piperider_cli.dbtutil as dbtutil
from piperider_cli.datasource.sqlite import SqliteDataSource
from piperider_cli.dbt import dbt_version
from piperider_cli.profiler import Profiler
from tests.common import create_table
from tests.test_dbt_manifest_compatible import _load_manifest


class TestRunner(TestCase):

    def setUp(self):
        self.dbt_state_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mock_dbt_data")

    def test_get_dbt_state_candidate(self):
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=None,
                                                                          tag=None))

        self.assertEqual(len(tables), 9)
        self.assertEqual(tables[0].get('name'), 'PRICE_PRESENT')
        self.assertEqual(tables[0].get('schema'), 'PUBLIC')
        self.assertEqual(tables[0].get('alias'), 'PRICE_PRESENT')
        self.assertEqual(tables[1].get('name'), 'event_filtered')
        self.assertEqual(tables[2].get('name'), 'session')
        self.assertEqual(tables[3].get('name'), 'event_enhanced')
        self.assertEqual(tables[4].get('name'), 'user')
        self.assertEqual(tables[5].get('name'), 'project_block')  # seed
        self.assertEqual(tables[6].get('name'), 'user_block')  # seed
        self.assertEqual(tables[7].get('name'), 'user_internal')  # seed
        self.assertEqual(tables[8].get('name'), 'project')

    def test_get_dbt_state_candidate_view_profile(self):
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=True,
                                                                          dbt_resources=None,
                                                                          tag=None))

        self.assertEqual(len(tables), 10)
        self.assertEqual(tables[0].get('name'), 'PRICE_PRESENT')
        self.assertEqual(tables[1].get('name'), 'event_filtered')
        self.assertEqual(tables[2].get('name'), 'stg_event')
        self.assertEqual(tables[3].get('name'), 'session')
        self.assertEqual(tables[4].get('name'), 'event_enhanced')
        self.assertEqual(tables[5].get('name'), 'user')
        self.assertEqual(tables[6].get('name'), 'project_block')  # seed
        self.assertEqual(tables[7].get('name'), 'user_block')  # seed
        self.assertEqual(tables[8].get('name'), 'user_internal')  # seed
        self.assertEqual(tables[9].get('name'), 'project')

    def test_get_dbt_state_candidate_run_results(self):
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=None,
                                                                          tag=None))
        self.assertEqual(len(tables), 9)
        self.assertEqual(tables[0].get('name'), 'PRICE_PRESENT')
        self.assertEqual(tables[0].get('schema'), 'PUBLIC')
        self.assertEqual(tables[0].get('alias'), 'PRICE_PRESENT')

    def test_get_dbt_state_candidate_resources_only_models(self):
        models = ['model.infusetude.session',
                  'model.infusetude.user']
        resources = dict(models=models, metrics=[])
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=resources,
                                                                          tag=None))
        self.assertEqual(len(tables), 2)
        self.assertEqual(tables[0].get('name'), 'session')
        self.assertEqual(tables[1].get('name'), 'user')

    def test_get_dbt_state_candidate_resources_only_seeds(self):
        models = ['seed.infusetude.project_block',
                  'seed.infusetude.user_block']
        resources = dict(models=models, metrics=[])
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=resources,
                                                                          tag=None))
        self.assertEqual(len(tables), 2)

    def test_get_dbt_state_candidate_resources_only_metrics(self):
        metrics = ['metric.infusetude.active_projects',
                   'metric.infusetude.active_projects_per_user',
                   'metric.infusetude.active_users',
                   'metric.infusetude.total_events',
                   'metric.infusetude.total_sessions',
                   'metric.infusetude.total_users']
        resources = dict(models=[], metrics=metrics)
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=resources,
                                                                          tag=None))
        self.assertEqual(len(tables), 0)

    def test_get_dbt_state_candidate_resources_not_found_or_empty(self):
        models = ['infusetude.amplitude.notfound']
        resources = dict(models=models, metrics=[])
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=resources,
                                                                          tag=None))
        self.assertEqual(len(tables), 0)

        resources = dict(models=[], metrics=[])
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=resources,
                                                                          tag=None))
        self.assertEqual(len(tables), 0)

    def test_get_dbt_state_candidate_resources_without_view_profile(self):
        models = ['model.infusetude.stg_event',
                  'model.infusetude.session',
                  'model.infusetude.user']
        resources = dict(models=models, metrics=[])
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=resources,
                                                                          tag=None))
        self.assertEqual(len(tables), 3)
        self.assertEqual(tables[0].get('name'), 'stg_event')
        self.assertEqual(tables[1].get('name'), 'session')
        self.assertEqual(tables[2].get('name'), 'user')

    def test_get_dbt_state_candidate_tag(self):
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=None,
                                                                          tag='test'))
        self.assertEqual(len(tables), 2)
        self.assertEqual(tables[0].get('name'), 'stg_event')
        self.assertEqual(tables[1].get('name'), 'session')

    def test_get_dbt_state_candidate_tag_and_view(self):
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=True,
                                                                          dbt_resources=None,
                                                                          tag='test'))
        self.assertEqual(len(tables), 2)
        self.assertEqual(tables[0].get('name'), 'stg_event')
        self.assertEqual(tables[1].get('name'), 'session')

    def test_get_dbt_state_candidate_tag_and_run_results(self):
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=None,
                                                                          tag='piperider'))
        self.assertEqual(len(tables), 4)
        self.assertEqual(tables[0].get('name'), 'PRICE_PRESENT')

    def test_get_dbt_state_candidate_tag_and_run_results_emptyset(self):
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=None,
                                                                          tag='test'))
        self.assertEqual(len(tables), 2)

    def test_get_dbt_state_candidate_view_profile_tag_and_run_results(self):
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=True,
                                                                          dbt_resources=None,
                                                                          tag='piperider'))
        self.assertEqual(len(tables), 4)
        self.assertEqual(tables[0].get('name'), 'PRICE_PRESENT')

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

        self.assertEqual('The price data to today',
                         profile_results['tables']['PRICE_PRESENT']['description'])
        self.assertEqual('The symbol name',
                         profile_results['tables']['PRICE_PRESENT']['columns']['symbol']['description'])

    @skip("deprecated after v0.33.0, skipping")
    def test_get_dbt_state_metrics_only_tag(self):
        metrics = dbtutil.get_dbt_state_metrics(self.dbt_state_dir, 'piperider', None)

        self.assertEqual(len(metrics), 3)

        metrics = dbtutil.get_dbt_state_metrics(self.dbt_state_dir, 'abc', None)

        self.assertEqual(len(metrics), 1)
        self.assertEqual(metrics[0].name, 'active_projects_per_user')

    @skip("deprecated after v0.33.0, skipping")
    def test_get_dbt_state_metrics_only_resources(self):
        metrics = ['metric.infusetude.active_projects',
                   'metric.infusetude.active_projects_per_user',
                   'metric.infusetude.active_users',
                   'metric.infusetude.total_events',
                   'metric.infusetude.total_users']
        resources = dict(models=[], metrics=metrics)
        metrics = dbtutil.get_dbt_state_metrics(self.dbt_state_dir, 'piperider', resources)
        self.assertEqual(len(metrics), 5)

        metrics = dbtutil.get_dbt_state_metrics(self.dbt_state_dir, 'abc', resources)
        self.assertEqual(len(metrics), 5)
        self.assertEqual(metrics[0].name, 'total_events')

    @pytest.mark.skipif(dbt_version < '1.6', reason="only for dbt 1.6")
    @mock.patch('piperider_cli.dbtutil._get_state_manifest')
    def test_get_dbt_state_metrics_16(self, _get_state_manifest):
        _get_state_manifest.return_value = _load_manifest('dbt-duckdb-1.6.0-manifest.json')
        metrics = dbtutil.get_dbt_state_metrics_16(self.dbt_state_dir, dbt_tag=None, dbt_resources=None)

        self.assertEqual(len(metrics), 4)
        # expenses
        self.assertEqual(metrics[0].name, 'expenses')

        # revenue
        self.assertEqual(metrics[1].calculation_method, 'sum')

        # average_order_amount
        self.assertEqual(metrics[2].model.table, 'orders')
        self.assertEqual(metrics[2].model.timestamp, 'order_date')
        self.assertEqual(metrics[2].model.expression, 'amount')

        # profit
        self.assertEqual(metrics[3].model, None)
        self.assertEqual(metrics[3].calculation_method, 'derived')
        self.assertEqual(metrics[3].expression, 'revenue - expenses')

        # skip metric < 1.6
        _get_state_manifest.return_value = _load_manifest('dbt-duckdb-1.5.1-manifest.json')
        metrics = dbtutil.get_dbt_state_metrics_16(self.dbt_state_dir, dbt_tag=None, dbt_resources=None)
        self.assertEqual(len(metrics), 0)

    @mock.patch('pathlib.Path.cwd',
                return_value=Path(os.path.join(os.path.dirname(__file__), 'mock_dbt_project', 'dir_1', 'dir_2')))
    def test_search_dbt_project_path(self, *args):
        path = dbtutil.search_dbt_project_path()
        self.assertEqual(path, os.path.join(os.path.dirname(__file__), 'mock_dbt_project'))

    def test_is_ready(self):
        self.assertFalse(dbtutil.is_ready({
            'profile': None
        }))

        self.assertFalse(dbtutil.is_ready({
            'profile': 'mock_data',
            'target': None
        }))

        self.assertFalse(dbtutil.is_ready({
            'profile': 'mock_data',
            'target': 'mock_data',
            'projectDir': None
        }))

        self.assertTrue(dbtutil.is_ready({
            'profile': 'mock_data',
            'target': 'mock_data',
            'projectDir': '~/',  # this is a valid path
        }))

    @mock.patch('piperider_cli.dbtutil.get_dbt_manifest')
    def test_load_dbt_resources(self, get_dbt_manifest):
        v = dbt_version
        target_path = os.path.join(os.path.dirname(__file__), 'mock_dbt_data')
        if v == '1.6':
            get_dbt_manifest.return_value = _load_manifest('dbt-duckdb-1.6.0-manifest.json')
        elif v == '1.5':
            get_dbt_manifest.return_value = _load_manifest('dbt-duckdb-1.5.1-manifest.json')
        elif v == '1.4':
            get_dbt_manifest.return_value = _load_manifest('dbt-duckdb-1.4.2-manifest.json')
        elif v == '1.3':
            get_dbt_manifest.return_value = _load_manifest('dbt-postgres-1.3.4-manifest.json')
        else:
            raise Exception(f'Unsupported dbt version: {v}')
        resources = dbtutil.load_dbt_resources(target_path)
        self.assertIn('models', resources)
        self.assertIn('metrics', resources)

    def test_get_support_time_grain(self):
        time_grains = dbtutil.get_support_time_grains('day')
        self.assertListEqual(time_grains, ['day', 'month', 'year'])

        time_grains = dbtutil.get_support_time_grains('week')
        self.assertListEqual(time_grains, ['month', 'year'])

        time_grains = dbtutil.get_support_time_grains('month')
        self.assertListEqual(time_grains, ['month', 'year'])

        time_grains = dbtutil.get_support_time_grains('quarter')
        self.assertListEqual(time_grains, ['year'])

        time_grains = dbtutil.get_support_time_grains('year')
        self.assertListEqual(time_grains, ['year'])
