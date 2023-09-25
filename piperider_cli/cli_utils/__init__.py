import io
from typing import Union

from rich.console import Console

from piperider_cli.cli_utils.cloud import CloudConnectorHelper


class DbtUtil:

    @staticmethod
    def get_dbt_project_path(dbt_project_dir: str = None, no_auto_search: bool = False,
                             recursive: bool = True) -> str:
        import piperider_cli.dbtutil as u
        return u.get_dbt_project_path(dbt_project_dir=dbt_project_dir, no_auto_search=no_auto_search,
                                      recursive=recursive)

    @staticmethod
    def read_dbt_resources(source: Union[str, io.TextIOWrapper, list]):
        import piperider_cli.dbtutil as u
        return u.read_dbt_resources(source=source)

    @staticmethod
    def load_dbt_project(path: str):
        import piperider_cli.dbtutil as u
        return u.load_dbt_project(path)

    @staticmethod
    def load_dbt_profile(path: str):
        import piperider_cli.dbtutil as u
        return u.load_dbt_profile(path)

    @staticmethod
    def load_credential_from_dbt_profile(dbt_profile, profile_name, target_name):
        import piperider_cli.dbtutil as u
        return u.load_credential_from_dbt_profile(dbt_profile=dbt_profile, profile_name=profile_name,
                                                  target_name=target_name)


def verify_upload_related_options(**kwargs):
    console = Console()
    upload = kwargs.get('upload', False)
    upload_with_share = kwargs.get('share', False)
    enable_quick_look_share = kwargs.get('enable_quick_look_share', False)
    enable_auto_upload = CloudConnectorHelper.is_auto_upload()
    is_cloud_login = CloudConnectorHelper.is_login()

    if is_cloud_login is True:
        if enable_auto_upload is True:
            console.print('[[bold green]Enable Auto Upload[/bold green]]')
            upload = True
        if upload_with_share is True:
            upload = True
        return upload, upload_with_share
    else:
        if upload is False and upload_with_share is True and enable_quick_look_share is True:
            # Upload to Cloud Quick Look without login
            console.print(
                '[[bold green]Enable Quick Look Share[/bold green]] '
                'Reports will be uploaded as a temporary quick look.')
            return True, True
        if upload is True or upload_with_share is True:
            console.print(
                '[[bold yellow]Warning[/bold yellow]] '
                'The report won\'t be uploaded due to not logged in.')

        return False, False
