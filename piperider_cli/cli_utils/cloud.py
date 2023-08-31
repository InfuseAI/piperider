
class CloudConnectorHelper:
    @staticmethod
    def is_login() -> bool:
        from piperider_cli.cloud_connector import CloudConnector as c
        return c.is_login()

    @staticmethod
    def is_auto_upload() -> bool:
        pass

    @staticmethod
    def config_auto_upload(flag: bool):
        pass

    @staticmethod
    def signup(debug=False):
        pass

    @staticmethod
    def login(api_token=None, options: dict = None, debug=False):
        pass

    @staticmethod
    def logout():
        pass

    @staticmethod
    def upload_latest_report(report_dir=None, debug=False, open_report=False, enable_share=False,
                             project_name: str = None) -> int:
        pass

    @staticmethod
    def upload_report(report_path=None, report_dir=None, datasource=None, debug=False, open_report=False,
                      enable_share=False, project_name=None, show_progress=True) -> int:
        pass

    @staticmethod
    def generate_compare_report(base_id: str, target_id: str, tables_from='all',
                                project_name: str = None, debug: bool = False):
        pass

    @staticmethod
    def compare_reports(base=None, target=None, tables_from='all', summary_file=None, debug=False,
                        project_name=None) -> int:
        pass

    @staticmethod
    def share_run_report(run_id=None, debug=False, project_name=None):
        pass

    @staticmethod
    def share_compare_report(base_id=None, target_id=None, debug=False, project_name=None):
        pass

    @staticmethod
    def list_projects(debug=False) -> int:
        pass

    @staticmethod
    def select_project(project_name: str = None,
                       datasource: str = None,
                       no_interaction: bool = False,
                       debug: bool = False) -> int:
        pass
