from piperider_cli.datasource import DataSource
from piperider_cli.error import PipeRiderConnectorUnsupportedError


class UnsupportedDataSource(DataSource):
    def __init__(self, name, **kwargs):
        super().__init__(name, 'unsupported', **kwargs)
        self.fields = [
        ]

    def validate(self):
        return True, []

    def to_database_url(self):
        return ''

    def verify_connector(self):
        datasource_type = self.credential.get('type', 'Unknown')
        return PipeRiderConnectorUnsupportedError(
            f"Piperider doesn't support data source '{self.name}' of type '{datasource_type}'.",
            datasource_type)

    def _get_display_description(self):
        return ''

    def get_database(self):
        return ''

    def get_schema(self):
        return ''

    def get_engine_by_database(self):
        return None
