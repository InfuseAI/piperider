from unittest import TestCase, mock

from piperider_cli.datasource import DataSource, _should_use_fancy_user_input


class TestAbstractDataSource(TestCase):
    def test_abstract_datasource(self):
        with self.assertRaises(TypeError):
            DataSource('fake data source', 'fake type')


class TestUseFancyUserInput(TestCase):
    @mock.patch.dict('os.environ', {'PIPERIDER_FANCY_USER_INPUT': 'FALSE'}, clear=True)
    def test_env_set_to_false(self, *args):
        self.assertFalse(_should_use_fancy_user_input())

    @mock.patch('sys.stdin.isatty', return_value=False)
    @mock.patch('sys.stdout.isatty', return_value=False)
    def test_not_running_by_terminal(self, *args):
        self.assertFalse(_should_use_fancy_user_input())

    @mock.patch('sys.platform', 'darwin')
    @mock.patch('sys.stdin.isatty', return_value=True)
    @mock.patch('sys.stdout.isatty', return_value=True)
    def test_running_on_windows(self, *args):
        with mock.patch('sys.platform', 'win32'):
            self.assertFalse(_should_use_fancy_user_input())

    @mock.patch('sys.platform', 'darwin')
    @mock.patch('sys.stdin.isatty', return_value=True)
    @mock.patch('sys.stdout.isatty', return_value=True)
    @mock.patch.dict('os.environ', {}, clear=True)
    def test_default_behavior(self, *args):
        self.assertTrue(_should_use_fancy_user_input())
