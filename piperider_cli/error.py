import os
import sys


class PipeRiderError(Exception):
    """ Base class for piperider errors. """

    def __init__(self, *args, **kwargs):
        self.message = args[0] if len(args) else ''
        self.hint = kwargs.get('hint') or ''

    def __str__(self):
        return self.message

    hint = ''
    message = ''


class PipeRiderConfigError(PipeRiderError):
    def __init__(self, config_file):
        self.config_file = config_file
        pass

    message = "Piperider is not initialized."
    hint = "Please execute command 'piperider init' to move forward."


class PipeRiderConfigTypeError(PipeRiderError):
    def __init__(self, msg):
        self.message = msg

    hint = "Please check your input configuration in config.yml"


class PipeRiderCredentialFieldError(PipeRiderError):
    def __init__(self, field, message):
        self.message = message
        self.hint = f"Please check '{field}' in credentials.yml"


class DbtProfileBigQueryAuthWithTokenUnsupportedError(PipeRiderError):
    def __init__(self):
        self.message = "PipeRider haven't supported dbt BigQuery method with 'oauth-secrets' yet."

    hint = "Please reference the document of dbt BigQuery Profile for more details.\n" \
           "    ref: https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#authentication-methods"


class PipeRiderNoProfilingResultError(PipeRiderError):
    def __init__(self, result_file):
        self.result_file = result_file
        pass

    message = "No profiling result is found."
    hint = "Please execute command 'piperider run' to move forward."


class PipeRiderInvalidDataSourceError(PipeRiderError):
    def __init__(self, name, config_file):
        self.name = name
        self.config_file = config_file
        self.message = f"Unsupported data source type '{name}'."
        self.hint = f"Please modify the config file '{config_file}'."


class PipeRiderConnectorError(PipeRiderError):
    def __init__(self, err_msg, datasource_name):
        self.message = err_msg
        self.hint = f'Please run \"pip install \'piperider[{datasource_name}]\'\" to get the {datasource_name} connector'


class PipeRiderTableConnectionError(PipeRiderError):
    def __init__(self, name, type_name):
        self.message = f'No available table found or no access permission found from \'{name}\' data source.'
        self.hint = f'Please verify your {type_name} data source with correct access permission.'


class PipeRiderDataBaseConnectionError(PipeRiderError):
    def __init__(self, name, type_name, db_path=None):
        self.message = f'No available database found from \'{name}\' data source.'
        if db_path:
            self.message += f' Cannot access the database file: \'{db_path}\''
        self.hint = f'Please verify your {type_name} data source with correct access permission.'


class PipeRiderDataBaseEncodingError(PipeRiderError):
    def __init__(self, file_path, type_name, current_encoding, support_encoding):
        if current_encoding is None:
            self.message = f'Unsupported file encoding format. ' \
                           f'Currently we only support \'{support_encoding}\' encoding format in {type_name} data source.'
            self.hint = ''
        else:
            self.message = f'Unsupported file encoding format \'{current_encoding}\'. ' \
                           f'Currently we only support \'{support_encoding}\' encoding format in {type_name} data source.'
            if sys.platform == 'nt':
                self.hint = 'Please use the following URL to convert file encoding.\n' \
                            '    https://www.freeformatter.com/convert-file-encoding.html'
            else:  # Linux or Mac platform
                self.hint = f'Please use the following command to convert file encoding.\n' \
                            f'    \'iconv -f {current_encoding} -t {support_encoding} "{file_path}" > "utf8-{os.path.basename(file_path)}"\''


class DbtError(PipeRiderError):
    type = 'dbt'


class DbtProjectNotFoundError(DbtError):
    def __init__(self, dbt_project_path):
        self.dbt_project_path = dbt_project_path
        self.message = f"Cannot find dbt project at '{dbt_project_path}'."

    hint = "Please make sure the dbt project is in the same directory with the piperider config file."


class DbtProjectInvalidError(DbtError):
    def __init__(self, dbt_project_path, err_msg):
        self.dbt_project_path = dbt_project_path
        self.message = f"Failed to load dbt project '{dbt_project_path}'. \n Reason: {err_msg}"

    hint = "Please use 'dbt debug' to verify the dbt configuration."


class DbtProfileNotFoundError(DbtError):
    def __init__(self, dbt_profile_path):
        self.dbt_project_path = dbt_profile_path
        self.message = f"Cannot find dbt profiles at '{dbt_profile_path}'."

    hint = "Please use 'dbt init' to initiate the dbt profiles."


class DbtProfileInvalidError(DbtError):
    def __init__(self, dbt_profile_path, err_msg):
        self.dbt_profile_path = dbt_profile_path
        self.message = f"Failed to load dbt profile '{dbt_profile_path}'. \nReason: {err_msg}"

    hint = "Please use 'dbt debug' to verify the dbt configuration."


class DbtInvocationError(DbtError):
    def __init__(self, message):
        self.message = message

    hint = "Please reference dbt documentation for more information. ref: https://docs.getdbt.com/reference/exit-codes"


class DbtCommandNotFoundError(PipeRiderError):
    def __init__(self):
        self.message = "dbt command not found."
        self.hint = 'Please run \'pip install dbt-core\' to install dbt Core.'


class DbtAdapterCommandNotFoundError(PipeRiderError):
    def __init__(self, datasource_type):
        self.message = "dbt command not found."
        self.hint = f'Please run \'pip install dbt-{datasource_type}\' to install dbt Core and the adapter.'


class AssertionError(PipeRiderError):
    def __init__(self, error_msg):
        self.message = error_msg
        pass


class IllegalStateAssertionError(PipeRiderError):
    def __init__(self, error_msg):
        self.message = error_msg
        pass


class AwsCredentialsError(PipeRiderError):
    def __init__(self, error_msg, type='redshift'):
        self.type = type
        self.message = error_msg
        self.hint = 'Please configure the AWS credentials by command "aws configure".\n  Or setup the environment variables "AWS_ACCESS_KEY_ID" & "AWS_SECRET_ACCESS_KEY".'
        pass


class AwsUnExistedS3Bucket(PipeRiderError):
    def __init__(self, bucket):
        self.message = f'S3 bucket "{bucket}" does not exist'
