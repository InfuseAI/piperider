class PipeRiderError(Exception):
    """ Base class for piperider errors. """

    def __init__(self, *args, **kwargs):
        self.message = args[0] or ''
        pass

    def __str__(self):
        return self.message


class PipeRiderConfigError(PipeRiderError):
    def __init__(self, config_file):
        self.config_file = config_file
        pass

    message = "Piperider is not initialized. Please execute command 'piperider init' to move forward."


class PipeRiderCredentialError(PipeRiderError):
    def __init__(self, name):
        self.name = name
        self.message = f"The credential of '{name}' is not configured. Please execute command 'piperider init' to move forward."


class PipeRiderNoProfilingResultError(PipeRiderError):
    def __init__(self, result_file):
        self.result_file = result_file
        pass

    message = "No profiling result is found. Please execute command 'piperider run' to move forward."


class PipeRiderInvalidDataSourceError(PipeRiderError):
    def __init__(self, name, config_file):
        self.name = name
        self.config_file = config_file
        self.message = f"Unsupported data source type '{name}'. Please modify the config file '{config_file}'"


class PipeRiderDiagnosticError(PipeRiderError):
    def __init__(self, check_name, error_msg):
        self.message = f'{check_name}: {error_msg}'


class DbtProjectNotFoundError(PipeRiderError):
    def __init__(self, dbt_project_path):
        self.dbt_project_path = dbt_project_path
        self.message = f"Cannot find dbt project at {dbt_project_path}"


class DbtProjectInvalidError(PipeRiderError):
    def __init__(self, dbt_project_path):
        self.dbt_project_path = dbt_project_path
        self.message = f"Failed to load dbt project '{dbt_project_path}'. Please use 'dbt debug' to verify the dbt configuration."


class DbtProfileNotFoundError(PipeRiderError):
    def __init__(self, dbt_profile_path):
        self.dbt_project_path = dbt_profile_path
        self.message = f"Cannot find dbt profiles at '{dbt_profile_path}'. Please use 'dbt init' to initiate the dbt profiles."


class DbtProfileInvalidError(PipeRiderError):
    def __init__(self, dbt_profile_path):
        self.dbt_profile_path = dbt_profile_path
        self.message = f"Failed to load dbt profile '{dbt_profile_path}'. Please use 'dbt debug' to verify the dbt configuration."


class DbtInvocationError(PipeRiderError):
    def __init__(self):
        self.message = "The dbt invocation completed with an error."


class AssertionError(PipeRiderError):
    def __init__(self, error_msg):
        self.message = error_msg
        pass


class IllegalStateAssertionError(PipeRiderError):
    def __init__(self, error_msg):
        self.message = error_msg
        pass
