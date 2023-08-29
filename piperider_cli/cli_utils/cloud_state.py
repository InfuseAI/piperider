class CloudState:
    @staticmethod
    def is_auto_upload():
        from piperider_cli.cloud_connector import CloudConnector

        return CloudConnector.is_auto_upload()

    @staticmethod
    def is_login():
        from piperider_cli.cloud_connector import CloudConnector

        return CloudConnector.is_login()

    @staticmethod
    def config_auto_upload(flag: bool):
        from piperider_cli.cloud_connector import CloudConnector

        return CloudConnector.config_auto_upload(flag)

    @staticmethod
    def login(api_token=None, options: dict = None, debug=False):
        from piperider_cli.cloud_connector import CloudConnector

        return CloudConnector.login(api_token, options=options, debug=debug)

    @staticmethod
    def logout():
        from piperider_cli.cloud_connector import CloudConnector

        return CloudConnector.logout()

    @staticmethod
    def list_projects(cdebug=False) -> int:
        from piperider_cli.cloud_connector import CloudConnector

        return CloudConnector.list_projects()

    @staticmethod
    def select_project(
        project_name: str = None,
        datasource: str = None,
        no_interaction: bool = False,
        debug: bool = False,
    ) -> int:
        from piperider_cli.cloud_connector import CloudConnector

        return CloudConnector.select_project(
            project_name, datasource, no_interaction, debug
        )

    @staticmethod
    def upload_latest_report(
        report_dir=None,
        debug=False,
        open_report=False,
        enable_share=False,
        project_name: str = None,
    ) -> int:
        from piperider_cli.cloud_connector import CloudConnector

        return CloudConnector.upload_latest_report(
            report_dir, debug, open_report, enable_share, project_name
        )

    @staticmethod
    def upload_report(
        report_path=None,
        report_dir=None,
        datasource=None,
        debug=False,
        open_report=False,
        enable_share=False,
        project_name=None,
        show_progress=True,
    ) -> int:
        from piperider_cli.cloud_connector import CloudConnector

        return CloudConnector.upload_report(
            report_path,
            report_dir,
            datasource,
            debug,
            open_report,
            enable_share,
            project_name,
            show_progress,
        )

    @staticmethod
    def signup(debug=False):
        from piperider_cli.cloud_connector import CloudConnector

        return CloudConnector.signup(debug)

    @staticmethod
    def compare_reports(
        base=None,
        target=None,
        tables_from="all",
        summary_file=None,
        debug=False,
        project_name=None,
    ) -> int:
        from piperider_cli.cloud_connector import CloudConnector

        return CloudConnector.compare_reports(
            base, target, tables_from, summary_file, debug, project_name
        )
