from . import DataSource
from .field import TextField
from ..error import PipeRiderConnectorError


class DataBricksDataSource(DataSource):
    def __init__(self, name, **kwargs):
        super().__init__(name, 'databricks', **kwargs)
        self.fields = [
            TextField('host', description='Databricks host'),
            TextField('token', description='Databricks token'),
            TextField('catalog', description='Databricks catalog name', optional=True),
            TextField('http_path', description='Databricks http path'),
            TextField('schema', description='Databricks schema name'),
        ]

    def validate(self):
        if self.type_name != 'databricks':
            raise ValueError('type name should be databricks')
        return self._validate_required_fields()

    def verify_connector(self):
        try:
            import databricks
        except Exception as e:
            return PipeRiderConnectorError(str(e), 'databricks')

    def to_database_url(self, database):
        credential = self.credential
        host = credential.get('host')
        token = credential.get('token')
        schema = credential.get('schema')
        return f'databricks://token:{token}@{host}:443/{schema}'
        pass

    def engine_args(self):
        credential = self.credential
        http_path = credential.get('http_path')
        args = {'http_path': http_path}

        if credential.get('catalog'):
            args['catalog'] = credential.get('catalog')

        return dict(connect_args=args)

    def _get_display_description(self):
        cred = self.credential
        return f"type={self.type_name}, database={cred.get('catalog')}, schema={cred.get('schema')}"

    def get_database(self):
        return self.credential.get('catalog')

    def get_schema(self):
        return self.credential.get('schema')
