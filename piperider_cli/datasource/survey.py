from piperider_cli.error import PipeRiderError
from piperider_cli.feedback import Feedback
from . import DataSource
from .field import ListField, TextField


class UserSurveyMockDataSource(DataSource):
    def __init__(self, name, **kwargs):
        super().__init__(name, 'datasource survey', **kwargs)
        self.fields = [
        ]

    # Always return None to prevent it generate the configue files
    def ask_credential(self):
        super().ask_credential()
        return None

    def validate(self):
        return False, []

    def to_database_url(self):
        return ''

    def verify_connector(self):
        return PipeRiderError('',
                              hint="Thanks for your feedback. We will improve Piperider in the future.\nPlease execute command 'piperider init' with supported data source.")

    def _get_display_description(self):
        return ''

    def get_database(self):
        return ''

    def get_schema(self):
        return ''

    def send_survey(self):
        datasource = self.credential.get('datasource_candidates')
        if datasource == 'Other':
            datasource = self.credential.get('other')
        Feedback.suggest_datasource(datasource)
        pass
