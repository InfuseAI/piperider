import json
import os
import re

from rich.console import Console
from rich.table import Table

from piperider_cli import clone_directory
from piperider_cli.assertion_engine import AssertionEngine
from piperider_cli.compare_report import CompareReport
from piperider_cli.error import PipeRiderNoProfilingResultError
from piperider_cli.profiler import Profiler
from piperider_cli.configuration import PIPERIDER_OUTPUT_PATH, PIPERIDER_COMPARISON_PATH


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


def _validate_input_result(result):
    for f in ['tables', 'id', 'created_at', 'datasource']:
        if f not in result:
            return False
    return True


def generate_recommended_assertions(input=None, interaction=True):
    console = Console()

    run_json_path = _get_run_json_path(input)
    if not os.path.isfile(run_json_path):
        raise PipeRiderNoProfilingResultError(run_json_path)

    with open(run_json_path) as f:
        profiling_result = json.loads(f.read())
    if not _validate_input_result(profiling_result):
        console.print(f'[bold red]Error: {run_json_path} is invalid[/bold red]')
        return
    console.print(f'[bold dark_orange]Generating recommended assertions from:[/bold dark_orange] {run_json_path}')

    # Generate recommended assertions
    assertion_engine = AssertionEngine(None)
    assertion_engine.load_assertions(profiling_result=profiling_result)
    assertion_exist = True if assertion_engine.assertions_content else False
    console.rule('Generating Recommended Assertions')
    recommended_assertions = assertion_engine.generate_recommended_assertions(profiling_result,
                                                                              assertion_exist=assertion_exist)
    # Show the generated recommended assertions
    ascii_table = Table(show_header=True, header_style="bold magenta")
    ascii_table.add_column('Table Name', style="bold yellow")
    ascii_table.add_column('Column Name', style="bold blue")
    ascii_table.add_column('Test Function', style="bold green")
    ascii_table.add_column('Asserts', style="bold")

    for assertion in assertion_engine.recommender.generated_assertions:
        assert_values = str(assertion.asserts) if assertion.asserts else ''
        ascii_table.add_row(
            assertion.table,
            assertion.column,
            assertion.name,
            assert_values,
        )

    console.print(ascii_table)

    # Show the recommended assertions files
    console.rule('Generated Recommended Assertions')
    for f in recommended_assertions:
        console.print(f'[bold green]Recommended Assertion[/bold green]: {f}')


def compare_report(a=None, b=None):
    console = Console()

    report = CompareReport(PIPERIDER_OUTPUT_PATH, a, b)
    if not report.select_reports():
        raise Exception('No valid reports found')
    comparison_data = report.generate_data()

    from piperider_cli import data
    report_template_dir = os.path.join(os.path.dirname(data.__file__), 'report', 'comparison-report')
    with open(os.path.join(report_template_dir, 'index.html')) as f:
        report_template_html = f.read()

    data_id = comparison_data.id()
    dir = os.path.join(PIPERIDER_COMPARISON_PATH, data_id)
    clone_directory(report_template_dir, dir)

    filename = os.path.join(dir, 'index.html')
    with open(filename, 'w') as f:
        html = setup_report_variables(report_template_html, False, comparison_data.to_json())
        f.write(html)

    console.print()
    console.print(f"Comparison report: {filename}")

    # TODO for debugging intermediate data, remove this
    with open(os.path.join(dir, 'comparison_data.json'), 'w') as f:
        f.write(comparison_data.to_json())
