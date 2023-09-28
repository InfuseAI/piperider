import json
import os
import shutil
from unittest import TestCase

from piperider_cli.configuration import FileSystem, Configuration
from piperider_cli.error import PipeRiderConnectorUnsupportedError
from piperider_cli.profiler import ProfileSubject
from piperider_cli.runner import _filter_subject, get_dbt_profile_subjects, Runner
from piperider_cli.statistics import Statistics


class TestRunnerSubjectFilter(TestCase):

    def setUp(self):
        self.dbt_state_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mock_dbt_data")
        self.statistics = Statistics()
        self.statistics.reset()

    def test_filter_subject(self):
        self.assertTrue(_filter_subject('a', None, None))
        self.assertTrue(_filter_subject('a', ['a', 'b'], None))
        self.assertFalse(_filter_subject('a', [], None))
        self.assertFalse(_filter_subject('a', None, ['a', 'b']))
        self.assertTrue(_filter_subject('a', None, []))
        self.assertFalse(_filter_subject('a', ['a'], ['a']))
        self.assertTrue(_filter_subject('a', ['a'], ['b']))
        self.assertTrue(_filter_subject('a', ['A'], ['B']))

    def test_dbt_profile_subjects_tags_and_config(self):
        options = dict(
            view_profile=False,
            dbt_resources=None,
            tag='test'
        )

        def filter_fn(subject: ProfileSubject):
            return _filter_subject(subject.name, ['project'], None)

        subjects = get_dbt_profile_subjects(self.dbt_state_dir, options, filter_fn)

        self.assertEqual(2, len(subjects))
        self.assertEqual('stg_event', subjects[0].name)
        self.assertEqual('session', subjects[1].name)

        self.assertEqual(10, self.statistics.statistic['total'])
        self.assertEqual(11, self.statistics.statistic['notag'])

    def test_dbt_profile_subjects_dbt_resources_and_config(self):
        options = dict(
            view_profile=None,
            dbt_resources=dict(
                models=['model.infusetude.project'],
                metrics=[]
            ),
            tag=None
        )

        def filter_fn(subject: ProfileSubject):
            return _filter_subject(subject.name, None, ['project'])

        subjects = get_dbt_profile_subjects(self.dbt_state_dir, options, filter_fn)

        self.assertEqual(1, len(subjects))
        self.assertEqual('project', subjects[0].name)

        self.assertEqual(10, self.statistics.statistic['total'])
        self.assertEqual(12, self.statistics.statistic['filter'])

    def test_dbt_profile_subjects_config_excludes(self):
        options = dict(
            view_profile=None,
            dbt_resources=None,
            tag=None
        )

        def filter_fn(subject: ProfileSubject):
            return _filter_subject(subject.name, None, ['session'])

        subjects = get_dbt_profile_subjects(self.dbt_state_dir, options, filter_fn)

        self.assertEqual(8, len(subjects))
        self.assertNotIn('session', [s.name for s in subjects])

        self.assertEqual(10, self.statistics.statistic['total'])
        self.assertEqual(1, self.statistics.statistic['filter'])
        self.assertEqual(1, self.statistics.statistic['view'])

    def test_dbt_profile_subjects_config_includes(self):
        options = dict(
            view_profile=None,
            dbt_resources=None,
            tag=None
        )

        def filter_fn(subject: ProfileSubject):
            return _filter_subject(subject.name, ['user'], None)

        subjects = get_dbt_profile_subjects(self.dbt_state_dir, options, filter_fn)

        self.assertEqual(1, len(subjects))
        self.assertEqual('user', subjects[0].name)

        self.assertEqual(10, self.statistics.statistic['total'])
        self.assertEqual(8, self.statistics.statistic['filter'])
        self.assertEqual(1, self.statistics.statistic['view'])

    def test_dbt_profile_subjects_config_view_includes(self):
        options = dict(
            view_profile=True,
            dbt_resources=None,
            tag=None
        )

        def filter_fn(subject: ProfileSubject):
            return _filter_subject(subject.name, ['stg_event'], None)

        subjects = get_dbt_profile_subjects(self.dbt_state_dir, options, filter_fn)

        self.assertEqual(1, len(subjects))
        self.assertEqual('stg_event', subjects[0].name)

        self.assertEqual(10, self.statistics.statistic['total'])
        self.assertEqual(9, self.statistics.statistic['filter'])

    def test_dbt_profile_subjects_config_no_view_includes(self):
        options = dict(
            view_profile=False,
            dbt_resources=None,
            tag=None
        )

        def filter_fn(subject: ProfileSubject):
            return _filter_subject(subject.name, ['stg_event', 'user'], None)

        subjects = get_dbt_profile_subjects(self.dbt_state_dir, options, filter_fn)

        self.assertEqual(1, len(subjects))
        self.assertEqual('user', subjects[0].name)

        self.assertEqual(10, self.statistics.statistic['total'])
        self.assertEqual(8, self.statistics.statistic['filter'])
        self.assertEqual(1, self.statistics.statistic['view'])


class TestExecuteRunnerWithoutDataSourceConnection(TestCase):
    def setUp(self) -> None:
        self.original_working_directory = FileSystem.WORKING_DIRECTORY
        self.original_profiles_dir = FileSystem.dbt_profiles_dir
        self.dbt_project_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mock_dbt_project',
                                            'skip_datasource_connection')

        FileSystem.set_working_directory(self.dbt_project_dir)
        FileSystem.set_dbt_profiles_dir(self.dbt_project_dir)
        Configuration.cleanup()
        pass

    def read_skip_datasource_value(self):
        with open(os.path.join(self.dbt_project_dir, "run.json"), "r") as fh:
            ds = json.loads(fh.read()).get('datasource')
            result = ds['skip_datasource']
        return result

    def test_skip_datasource(self):
        rc = Runner.exec(skip_datasource_connection=True, output=self.dbt_project_dir)
        self.assertTrue(self.read_skip_datasource_value())
        assert rc == 0

    def test_non_skip_datasource(self):
        # PipeRider has not supported 'hive' datasource yet
        with self.assertRaises(PipeRiderConnectorUnsupportedError):
            Runner.exec(skip_datasource_connection=False)

    def tearDown(self) -> None:
        FileSystem.set_working_directory(self.original_working_directory)
        FileSystem.dbt_profiles_dir = self.original_profiles_dir

        # Clean up piperider output files
        piperider_output_dir = os.path.join(self.dbt_project_dir, '.piperider', 'outputs')
        try:
            shutil.rmtree(piperider_output_dir)
            os.unlink(os.path.join(self.dbt_project_dir, 'run.json'))
        except FileNotFoundError:
            pass
        Configuration.cleanup()
        pass
