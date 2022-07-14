class PipeRiderError(Exception):
    """ Base class for piperider errors. """

    def __init__(self, *args, **kwargs):
        self.message = args[0] or ''
        self.hint = kwargs.get('hint') or ''
        pass

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


class PipeRiderCredentialError(PipeRiderError):
    def __init__(self, name):
        self.name = name
        self.message = f"The credential of '{name}' is not configured."

    hint = "Please execute command 'piperider init' to move forward."


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
        self.hint = f'Please run \'pip install piperider[{datasource_name}]\' to get the {datasource_name} connector'


class PipeRiderDiagnosticError(PipeRiderError):
    def __init__(self, check_name, error_msg):
        self.message = f'{check_name}: {error_msg}'


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
    def __init__(self, exit_code):
        self.exit_code = exit_code
        self.message = f"The dbt invocation completed with an error. Exit code: {exit_code}"

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
