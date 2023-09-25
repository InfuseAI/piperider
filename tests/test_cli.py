import os
from unittest import TestCase, mock

from click.testing import CliRunner

from piperider_cli.cli import init, version, diagnose, run
from piperider_cli.cli_utils import verify_upload_related_options


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

    @mock.patch('piperider_cli.runner.Runner.exec', return_value=3)
    @mock.patch('piperider_cli.generate_report.GenerateReport.exec', return_value=0)
    @mock.patch('piperider_cli.cli_utils.cloud.CloudConnectorHelper.is_login', return_value=True)
    @mock.patch('piperider_cli.cli_utils.cloud.CloudConnectorHelper.upload_latest_report', return_value=0)
    @mock.patch('piperider_cli.runner.RunEventPayload')
    def test_run_command(self, *args):
        # Manually config dbt project and profiles dir
        result = self.cli_runner.invoke(run, [
            "--dbt-project-dir", self.unit_test_dir,
            "--dbt-profiles-dir", self.unit_test_dir,
            "--select", "test",
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

        # Upload the latest report
        result = self.cli_runner.invoke(run, [
            "--dbt-project-dir", self.unit_test_dir,
            "--upload",
        ])
        assert result.exit_code == 0

        mock_runner_exec = args[-1]
        mock_runner_exec.return_value = 666
        mock_run_event_payload = args[0]
        result = self.cli_runner.invoke(run, [
            "--dbt-project-dir", self.unit_test_dir,
        ])
        assert result.exit_code == 0
        assert mock_run_event_payload.return_value.reason == 'error'

    @mock.patch('piperider_cli.cloud_connector.CloudConnector.is_login', return_value=False)
    @mock.patch('piperider_cli.cloud_connector.CloudConnector.is_auto_upload', return_value=False)
    def test_verify_upload_related_options_without_login(self, *args):
        enable_upload, enable_share = verify_upload_related_options(**{
            'upload': False,
            'share': False,
        })
        assert enable_upload is False and enable_share is False

        enable_upload, enable_share = verify_upload_related_options(**{
            'upload': False,
            'share': True,
        })
        assert enable_upload is False and enable_share is False

        enable_upload, enable_share = verify_upload_related_options(**{
            'upload': True,
            'share': False,
        })
        assert enable_upload is False and enable_share is False

        enable_upload, enable_share = verify_upload_related_options(**{
            'upload': True,
            'share': True,
        })
        assert enable_upload is False and enable_share is False

        enable_upload, enable_share = verify_upload_related_options(**{
            'upload': False,
            'share': True,
            'enable_quick_look_share': True,
        })
        assert enable_upload is True and enable_share is True

    @mock.patch('piperider_cli.cloud_connector.CloudConnector.is_login', return_value=True)
    @mock.patch('piperider_cli.cloud_connector.CloudConnector.is_auto_upload', return_value=False)
    def test_verify_upload_related_options_with_login(self, *args):
        mock_is_auto_upload = args[0]

        enable_upload, enable_share = verify_upload_related_options(**{
            'upload': False,
            'share': False,
        })
        assert enable_upload is False and enable_share is False

        enable_upload, enable_share = verify_upload_related_options(**{
            'upload': False,
            'share': True,
        })
        assert enable_upload is True and enable_share is True

        enable_upload, enable_share = verify_upload_related_options(**{
            'upload': True,
            'share': False,
        })
        assert enable_upload is True and enable_share is False

        mock_is_auto_upload.return_value = True
        enable_upload, enable_share = verify_upload_related_options(**{
            'upload': False,
            'share': False,
        })
        assert enable_upload is True and enable_share is False

        enable_upload, enable_share = verify_upload_related_options(**{
            'upload': False,
            'share': True,
        })
        assert enable_upload is True and enable_share is True
