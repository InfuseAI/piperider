import json
import os

from rich.console import Console

from piperider_cli import raise_exception_when_directory_not_writable, get_run_json_path
from piperider_cli.assertion_engine import AssertionEngine
from piperider_cli.configuration import Configuration
from piperider_cli.error import PipeRiderNoProfilingResultError

console = Console()


def _validate_input_result(result):
    for f in ['tables', 'id', 'created_at', 'datasource']:
        if f not in result:
            return False
    return True


class AssertionGenerator():
    @staticmethod
    def exec(input_path=None, report_dir: str = None, no_recommend: bool = False, table: str = None):
        console.rule('Deprecated', style='bold red')
        console.print(
            'Assertions Generator is deprecated and will be removed in the future. If you have a strong need for assertions, please contact us by "piperider feedback".\n')
        filesystem = Configuration.instance().activate_report_directory(report_dir=report_dir)
        raise_exception_when_directory_not_writable(report_dir)

        run_json_path = get_run_json_path(filesystem.get_output_dir(), input_path)
        if not os.path.isfile(run_json_path):
            raise PipeRiderNoProfilingResultError(run_json_path)

        with open(run_json_path) as f:
            profiling_result = json.loads(f.read())
        if not _validate_input_result(profiling_result):
            console.print(f'[bold red]Error: {run_json_path} is invalid[/bold red]')
            return 1
        console.print(f'[bold dark_orange]Generating recommended assertions from:[/bold dark_orange] {run_json_path}')

        if table:
            # only keep the profiling result of the specified table
            profiling_result['tables'] = {k: v for k, v in profiling_result['tables'].items() if k == table}
            if not profiling_result['tables']:
                console.print(f'[bold red]Error: {table} is not found from {run_json_path}[/bold red]')
                return 1

        assertion_engine = AssertionEngine(None)
        if no_recommend:
            template_assertions = assertion_engine.generate_template_assertions(profiling_result)

            # Show the assertion template files
            console.rule('Generated Assertions Templates')
            for f in template_assertions:
                console.print(f'[bold green]Assertion Templates[/bold green]: {f}')
        else:
            # Generate recommended assertions
            assertion_engine.load_assertions(profiler_result=profiling_result)
            recommended_assertions = assertion_engine.generate_recommended_assertions(profiling_result)

            # Show the recommended assertions files
            console.rule('Generated Recommended Assertions')
            for f in recommended_assertions:
                console.print(f'[bold green]Recommended Assertion[/bold green]: {f}')
