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
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=None,
                                                                          dbt_run_results=None,
                                                                          tag=None))
        self.assertEqual(len(tables), 6)
        self.assertEqual(tables[0].get('name'), 'PRICE_PRESENT')
        self.assertEqual(tables[0].get('schema'), 'PUBLIC')
        self.assertEqual(tables[0].get('alias'), 'PRICE_PRESENT')
        self.assertEqual(tables[1].get('name'), 'event_filtered')
        self.assertEqual(tables[2].get('name'), 'session')
        self.assertEqual(tables[3].get('name'), 'event_enhanced')
        self.assertEqual(tables[4].get('name'), 'user')
        self.assertEqual(tables[5].get('name'), 'project')

    def test_get_dbt_state_candidate_view_profile(self):
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=True,
                                                                          dbt_resources=None,
                                                                          dbt_run_results=None,
                                                                          tag=None))
        self.assertEqual(len(tables), 7)
        self.assertEqual(tables[0].get('name'), 'PRICE_PRESENT')
        self.assertEqual(tables[1].get('name'), 'event_filtered')
        self.assertEqual(tables[2].get('name'), 'stg_event')
        self.assertEqual(tables[3].get('name'), 'session')
        self.assertEqual(tables[4].get('name'), 'event_enhanced')
        self.assertEqual(tables[5].get('name'), 'user')
        self.assertEqual(tables[6].get('name'), 'project')

    def test_get_dbt_state_candidate_run_results(self):
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=None,
                                                                          dbt_run_results=True,
                                                                          tag=None))
        self.assertEqual(len(tables), 1)
        self.assertEqual(tables[0].get('name'), 'PRICE_PRESENT')
        self.assertEqual(tables[0].get('schema'), 'PUBLIC')
        self.assertEqual(tables[0].get('alias'), 'PRICE_PRESENT')

    def test_get_dbt_state_candidate_resources_only_models(self):
        models = ['infusetude.amplitude.session',
                  'infusetude.amplitude.user']
        resources = dict(models=models, metrics=[])
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=resources,
                                                                          dbt_run_results=None,
                                                                          tag=None))
        self.assertEqual(len(tables), 2)
        self.assertEqual(tables[0].get('name'), 'session')
        self.assertEqual(tables[1].get('name'), 'user')

    def test_get_dbt_state_candidate_resources_only_seeds(self):
        models = ['infusetude.project_block',
                  'infusetude.user_block']
        resources = dict(models=models, metrics=[])
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=resources,
                                                                          dbt_run_results=None,
                                                                          tag=None))
        self.assertEqual(len(tables), 0)

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
                                                                          dbt_run_results=None,
                                                                          tag=None))
        self.assertEqual(len(tables), 0)

    def test_get_dbt_state_candidate_resources_not_found_or_empty(self):
        models = ['infusetude.amplitude.notfound']
        resources = dict(models=models, metrics=[])
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=resources,
                                                                          dbt_run_results=None,
                                                                          tag=None))
        self.assertEqual(len(tables), 0)

        resources = dict(models=[], metrics=[])
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=resources,
                                                                          dbt_run_results=None,
                                                                          tag=None))
        self.assertEqual(len(tables), 0)

    def test_get_dbt_state_candidate_resources_without_view_profile(self):
        models = ['infusetude.amplitude.stg_event',
                  'infusetude.amplitude.session',
                  'infusetude.amplitude.user']
        resources = dict(models=models, metrics=[])
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=resources,
                                                                          dbt_run_results=None,
                                                                          tag=None))
        self.assertEqual(len(tables), 3)
        self.assertEqual(tables[0].get('name'), 'stg_event')
        self.assertEqual(tables[1].get('name'), 'session')
        self.assertEqual(tables[2].get('name'), 'user')

    def test_get_dbt_state_candidate_tag(self):
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=None,
                                                                          dbt_run_results=None,
                                                                          tag='test'))
        self.assertEqual(len(tables), 2)
        self.assertEqual(tables[0].get('name'), 'stg_event')
        self.assertEqual(tables[1].get('name'), 'session')

    def test_get_dbt_state_candidate_tag_and_view(self):
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=True,
                                                                          dbt_resources=None,
                                                                          dbt_run_results=None,
                                                                          tag='test'))
        self.assertEqual(len(tables), 2)
        self.assertEqual(tables[0].get('name'), 'stg_event')
        self.assertEqual(tables[1].get('name'), 'session')

    def test_get_dbt_state_candidate_tag_and_run_results(self):
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=None,
                                                                          dbt_run_results=True,
                                                                          tag='piperider'))
        self.assertEqual(len(tables), 1)
        self.assertEqual(tables[0].get('name'), 'PRICE_PRESENT')

    def test_get_dbt_state_candidate_tag_and_run_results_emptyset(self):
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=None,
                                                                          dbt_resources=None,
                                                                          dbt_run_results=True,
                                                                          tag='test'))
        self.assertEqual(len(tables), 0)

    def test_get_dbt_state_candidate_view_profile_tag_and_run_results(self):
        tables = dbtutil.get_dbt_state_candidate(self.dbt_state_dir, dict(view_profile=True,
                                                                          dbt_resources=None,
                                                                          dbt_run_results=True,
                                                                          tag='piperider'))
        self.assertEqual(len(tables), 1)
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

        self.assertEqual('The price data to today - via DBT',
                         profile_results['tables']['PRICE_PRESENT']['description'])
        self.assertEqual('The symbol name - via DBT',
                         profile_results['tables']['PRICE_PRESENT']['columns']['symbol']['description'])

    def test_get_dbt_state_metrics_only_tag(self):
        metrics = dbtutil.get_dbt_state_metrics(self.dbt_state_dir, 'piperider', None)

        self.assertEqual(len(metrics), 3)

        metrics = dbtutil.get_dbt_state_metrics(self.dbt_state_dir, 'abc', None)

        self.assertEqual(len(metrics), 1)
        self.assertEqual(metrics[0].name, 'active_projects_per_user')

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
