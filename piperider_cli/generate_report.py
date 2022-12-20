import json
import os
import re
import shutil
from base64 import b64encode

from rich.console import Console

from piperider_cli import __version__, open_report_in_browser, sentry_dns, sentry_env, event
from piperider_cli import clone_directory, raise_exception_when_directory_not_writable
from piperider_cli.configuration import Configuration
from piperider_cli.error import PipeRiderNoProfilingResultError
from piperider_cli.filesystem import FileSystem


def prepare_piperider_metadata():
    configuration = Configuration.load()
    project_id = configuration.get_telemetry_id()
    metadata = {
        'name': 'PipeRider',
        'sentry_env': sentry_env,
        'sentry_dns': sentry_dns,
        'version': __version__,
        'amplitude_api_key': event._get_api_key(),
        'amplitude_user_id': event._collector._user_id,
        'amplitude_project_id': project_id,
    }
    return metadata


def _validate_input_result(result):
    for f in ['tables', 'id', 'created_at', 'datasource']:
        if f not in result:
            return False
    return True


def setup_report_variables(template_html: str, is_single: bool, data):
    if isinstance(data, dict):
        output = json.dumps(data)
    else:
        output = data
    metadata = json.dumps(prepare_piperider_metadata())
    encoded_output = b64encode(bytes(output, "utf-8")).decode("ascii")
    if is_single:
        variables = f'<script id="piperider-report-variables">\n' \
                    f'window.PIPERIDER_METADATA={metadata};' \
                    f'window.PIPERIDER_SINGLE_REPORT_DATA=JSON.parse(atob("{encoded_output}"));' \
                    f'window.PIPERIDER_COMPARISON_REPORT_DATA="";</script>'
    else:
        variables = f'<script id="piperider-report-variables">\n' \
                    f'window.PIPERIDER_METADATA={metadata};' \
                    f'window.PIPERIDER_SINGLE_REPORT_DATA="";' \
                    f'window.PIPERIDER_COMPARISON_REPORT_DATA=JSON.parse(atob("{encoded_output}"));</script>'
    html_parts = re.sub(r'<script id="piperider-report-variables">.+?</script>', '#PLACEHOLDER#', template_html).split(
        '#PLACEHOLDER#')
    html = html_parts[0] + variables + html_parts[1]
    return html


def _generate_static_html(result, html, output_path):
    filename = os.path.join(output_path, "index.html")
    with open(filename, 'w') as f:
        html = setup_report_variables(html, True, result)
        f.write(html)


def _get_run_json_path(filesystem: FileSystem, input=None):
    console = Console()
    run_json = None
    if input:
        if not os.path.exists(input):
            console.print(f'[bold red]Error: {input} not found[/bold red]')
            return
        if os.path.isdir(input):
            run_json = os.path.join(input, 'run.json')
        else:
            run_json = input
    else:
        latest = os.path.join(filesystem.get_output_dir(), 'latest')
        run_json = os.path.join(latest, 'run.json')
    return run_json


class GenerateReport:
    @staticmethod
    def exec(input=None, report_dir=None, output=None, open_report=None, open_in_cloud=None):
        filesystem = FileSystem(report_dir=report_dir)
        raise_exception_when_directory_not_writable(output)

        console = Console()

        from piperider_cli import data
        report_template_dir = os.path.join(os.path.dirname(data.__file__), 'report', 'single-report')
        with open(os.path.join(report_template_dir, 'index.html')) as f:
            report_template_html = f.read()

        run_json_path = _get_run_json_path(filesystem, input)
        if not os.path.isfile(run_json_path):
            print(os.path.abspath(run_json_path))
            raise PipeRiderNoProfilingResultError(run_json_path)

        with open(run_json_path) as f:
            result = json.loads(f.read())
        if not _validate_input_result(result):
            console.print(f'[bold red]Error: {run_json_path} is invalid[/bold red]')
            return

        console.print(f'[bold dark_orange]Generating reports from:[/bold dark_orange] {run_json_path}')

        def output_report(target_directory):
            clone_directory(report_template_dir, target_directory)
            _generate_static_html(result, report_template_html, target_directory)

        # output the report to the default directory (same with the run.json)
        default_output_directory = os.path.dirname(run_json_path)
        output_report(default_output_directory)

        if output:
            output_report(output)
            shutil.copyfile(run_json_path, os.path.join(output, os.path.basename(run_json_path)))
            console.print(f"Report generated in {output}/index.html")
        else:
            console.print(f"Report generated in {default_output_directory}/index.html")

        # only open the local file report if auto-upload is OFF
        if open_report and not open_in_cloud:
            result_output = f"{os.path.abspath(output) if output else default_output_directory}/index.html"
            open_report_in_browser(result_output)
