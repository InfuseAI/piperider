import json
import os
import re

from rich.console import Console

from piperider_cli import clone_directory
from piperider_cli.configuration import PIPERIDER_WORKSPACE_NAME
from piperider_cli.error import PipeRiderNoProfilingResultError

PIPERIDER_OUTPUT_PATH = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'outputs')


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
    if is_single:
        variables = f'<script id="piperider-report-variables">\nwindow.PIPERIDER_SINGLE_REPORT_DATA={output};window.PIPERIDER_COMPARISON_REPORT_DATA="";</script>'
    else:
        variables = f'<script id="piperider-report-variables">\nwindow.PIPERIDER_SINGLE_REPORT_DATA="";window.PIPERIDER_COMPARISON_REPORT_DATA={output};</script>'
    html_parts = re.sub(r'<script id="piperider-report-variables">.+?</script>', '#PLACEHOLDER#', template_html).split(
        '#PLACEHOLDER#')
    html = html_parts[0] + variables + html_parts[1]
    return html


def _generate_static_html(result, html, output_path):
    filename = os.path.join(output_path, "index.html")
    with open(filename, 'w') as f:
        html = setup_report_variables(html, True, result)
        f.write(html)


def _get_run_json_path(input=None):
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
        latest = os.path.join(PIPERIDER_OUTPUT_PATH, 'latest')
        run_json = os.path.join(latest, 'run.json')
    return run_json


class GenerateReport():
    @staticmethod
    def exec(input=None):
        console = Console()

        from piperider_cli import data
        report_template_dir = os.path.join(os.path.dirname(data.__file__), 'report', 'single-report')
        with open(os.path.join(report_template_dir, 'index.html')) as f:
            report_template_html = f.read()

        run_json_path = _get_run_json_path(input)
        if not os.path.isfile(run_json_path):
            raise PipeRiderNoProfilingResultError(run_json_path)

        with open(run_json_path) as f:
            result = json.loads(f.read())
        if not _validate_input_result(result):
            console.print(f'[bold red]Error: {run_json_path} is invalid[/bold red]')
            return

        console.print(f'[bold dark_orange]Generating reports from:[/bold dark_orange] {run_json_path}')

        dir = os.path.dirname(run_json_path)
        clone_directory(report_template_dir, dir)

        _generate_static_html(result, report_template_html, dir)
        console.print(f"Report generated in {dir}/index.html")
