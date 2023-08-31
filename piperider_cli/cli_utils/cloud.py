class CloudConnectorHelper:
    @staticmethod
    def is_login() -> bool:
        from piperider_cli.cloud_connector import CloudConnector as c
        return c.is_login()

    @staticmethod
    def is_auto_upload() -> bool:
        from piperider_cli.cloud_connector import CloudConnector as c
        return c.is_auto_upload()

    @staticmethod
    def config_auto_upload(flag: bool):
        from piperider_cli.cloud_connector import CloudConnector as c
        return c.config_auto_upload(flag)

    @staticmethod
    def signup(debug=False):
        from piperider_cli.cloud_connector import CloudConnector as c
        return c.signup(debug=debug)

    @staticmethod
    def login(api_token=None, options: dict = None, debug=False):
        from piperider_cli.cloud_connector import CloudConnector as c
        return c.login(api_token=api_token, options=options, debug=debug)

    @staticmethod
    def logout():
        from piperider_cli.cloud_connector import CloudConnector as c
        return c.logout()

    @staticmethod
    def upload_latest_report(report_dir=None, debug=False, open_report=False, enable_share=False,
                             project_name: str = None) -> int:
        from piperider_cli.cloud_connector import CloudConnector as c
        return c.upload_latest_report(report_dir=report_dir, debug=debug, open_report=open_report,
                                      enable_share=enable_share, project_name=project_name)

    @staticmethod
    def upload_report(report_path=None, report_dir=None, datasource=None, debug=False, open_report=False,
                      enable_share=False, project_name=None, show_progress=True) -> int:
        from piperider_cli.cloud_connector import CloudConnector as c
        return c.upload_report(report_path=report_path, report_dir=report_dir, datasource=datasource,
                               debug=debug, open_report=open_report, enable_share=enable_share,
                               project_name=project_name, show_progress=show_progress)

    @staticmethod
    def generate_compare_report(base_id: str, target_id: str, tables_from='all',
                                project_name: str = None, debug: bool = False):
        from piperider_cli.cloud_connector import CloudConnector as c
        return c.generate_compare_report(base_id=base_id, target_id=target_id, tables_from=tables_from,
                                         project_name=project_name, debug=debug)

    @staticmethod
    def compare_reports(base=None, target=None, tables_from='all', summary_file=None, debug=False,
                        project_name=None) -> int:
        from piperider_cli.cloud_connector import CloudConnector as c
        return c.compare_reports(base=base, target=target, tables_from=tables_from, summary_file=summary_file,
                                 debug=debug, project_name=project_name)

    @staticmethod
    def share_run_report(run_id=None, debug=False, project_name=None):
        from piperider_cli.cloud_connector import CloudConnector as c
        return c.share_run_report(run_id=run_id, debug=debug, project_name=project_name)

    @staticmethod
    def share_compare_report(base_id=None, target_id=None, debug=False, project_name=None):
        from piperider_cli.cloud_connector import CloudConnector as c
        return c.share_compare_report(base_id=base_id, target_id=target_id, debug=debug, project_name=project_name)

    @staticmethod
    def list_projects(debug=False) -> int:
        from piperider_cli.cloud_connector import CloudConnector as c
        return c.list_projects(debug=debug)

    @staticmethod
    def select_project(project_name: str = None,
                       datasource: str = None,
                       no_interaction: bool = False,
                       debug: bool = False) -> int:
        from piperider_cli.cloud_connector import CloudConnector as c
        return c.select_project(project_name=project_name, datasource=datasource,
                                no_interaction=no_interaction, debug=debug)
