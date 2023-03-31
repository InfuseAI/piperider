from sqlalchemy.engine import URL

from piperider_cli.error import PipeRiderConnectorError
from . import DataSource
from .field import TextField


class AthenaDataSource(DataSource):
    def __init__(self, name, **kwargs):
        super().__init__(name, 'athena', **kwargs)
        self.fields = [
            TextField('s3_staging_dir',
                      description='S3 location to store Athena query results and metadata, e.g. s3://athena_query_result/prefix/'),
            TextField('region_name', description='AWS region name of your Athena instance'),
            TextField('database', description='Athena data catalog', default='awsdatacatalog'),
            TextField('schema', description='Athena database'),

        ]

    def validate(self):
        if self.type_name != 'athena':
            raise ValueError('type name should be athena')
        return self._validate_required_fields()

    def to_database_url(self, database):
        credential = self.credential
        catalog_name = credential.get('database')
        schema = credential.get('schema')
        region_name = credential.get('region_name')
        s3_staging_dir = credential.get('s3_staging_dir')

        return f"awsathena+rest://athena.{region_name}.amazonaws.com:443/{schema}?s3_staging_dir={s3_staging_dir}&catalog_name={catalog_name}"

    def verify_connector(self):
        try:
            import pyathena
            # do nothing when everything is ok
            return None
        except Exception as e:
            return PipeRiderConnectorError(str(e), 'athena')

    def _get_display_description(self):
        cred = self.credential
        return f"type={self.type_name}, database={cred.get('database')}, schema={cred.get('schema')}"

    def get_database(self):
        return self.credential.get('database')

    def get_schema(self):
        return self.credential.get('schema')
