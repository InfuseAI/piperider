from unittest import TestCase, mock

from piperider_cli.datasource import DATASOURCE_PROVIDERS


class TestDuckDBDataSource(TestCase):
    def setUp(self) -> None:
        self.datasource_cls = DATASOURCE_PROVIDERS['duckdb']
        self.mock_dbt = {
            'projectDir': '.',
            'tag': 'piperider',
        }
        self.mock_credentials = {
            'type': 'duckdb',
            'path': '/mock_data/duckdb.db'
        }

    def test_duckdb(self):
        ds = self.datasource_cls('unittest')
        self.assertEqual('unittest', ds.name)
        self.assertEqual('duckdb', ds.type_name)
        self.assertEqual('config', ds.credential_source)
        self.assertTrue(ds.validate())

    def test_duckdb_validate_method(self):
        ds = self.datasource_cls('unittest', dbt=self.mock_dbt, credential=self.mock_credentials)
        rc, reason = ds.validate()
        self.assertTrue(rc)

    @mock.patch('os.path.exists', return_value=True)
    def test_duckdb_to_database_url_method(self, *args):
        ds = self.datasource_cls('unittest', dbt=self.mock_dbt, credential=self.mock_credentials)
        url = ds.to_database_url(None)
        self.assertEqual(url, f'duckdb:///{self.mock_credentials.get("path")}')
