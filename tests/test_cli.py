import os
from unittest import TestCase, mock

from click.testing import CliRunner

from piperider_cli.cli import init, version, diagnose, run


class TestPipeRiderCli(TestCase):
    def setUp(self) -> None:
        self.cli_runner = CliRunner()
        self.unit_test_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mock_dbt_project')
        pass

    def test_version_command(self):
        result = self.cli_runner.invoke(version)
        assert result.exit_code == 0

    def test_init_command(self):
        result = self.cli_runner.invoke(init, ["--dbt-project-dir", self.unit_test_dir])
        assert result.exit_code == 0

    @mock.patch('piperider_cli.validator.Validator.diagnose', return_value=True)
    def test_diagnose_command(self, *args):
        result = self.cli_runner.invoke(diagnose, ["--dbt-project-dir", self.unit_test_dir])
        assert result.exit_code == 0

    @mock.patch('piperider_cli.runner.Runner.exec', return_value=0)
    @mock.patch('piperider_cli.generate_report.GenerateReport.exec', return_value=0)
    @mock.patch('piperider_cli.cloud_connector.CloudConnector.is_login', return_value=False)
    @mock.patch('piperider_cli.cloud_connector.CloudConnector.upload_latest_report', return_value=0)
    def test_run_command(self, *args):
        # Manually config dbt project and profiles dir
        result = self.cli_runner.invoke(run, [
            "--dbt-project-dir", self.unit_test_dir,
            "--dbt-profiles-dir", self.unit_test_dir,
        ])
        assert result.exit_code == 0

        # Table and dbt-list cannot be used together
        result = self.cli_runner.invoke(run, [
            "--dbt-project-dir", self.unit_test_dir,
            "--table", "test",
            "--dbt-list",
        ])
        assert result.exit_code == 1

        # Select and dbt-list cannot be used together
        result = self.cli_runner.invoke(run, [
            "--dbt-project-dir", self.unit_test_dir,
            "--select", "test",
            "--dbt-list",
        ])
        assert result.exit_code == 1
