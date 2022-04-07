import os.path
import shutil
import sys

import click

from piperider_cli import workspace
from piperider_cli.config import load_stages
from piperider_cli.data import execute_ge_checkpoint


@click.group()
def cli():
    pass


@cli.command()
def init():
    # TODO show the process and message to users
    click.echo(f'Initialize piperider to path {os.getcwd()}/piperider')
    workspace.init()


@cli.command()
@click.option('--stage', help='stage file')
def run(**kwargs):
    # TODO check the args are "stages" files
    # invoke the stage -> piperider_cli.data.execute_great_expectation
    # generate the report file or directory
    stage_inputs: str = kwargs.get('stage', '')

    if stage_inputs is None:
        click.echo(f'--stage is required')
        sys.exit(1)

    if os.path.isdir(stage_inputs):
        all_stage_files = []
        for yaml_file in os.listdir(stage_inputs):
            if yaml_file.endswith('.yaml') or yaml_file.endswith('.yml'):
                all_stage_files.append(os.path.abspath(os.path.join(stage_inputs, yaml_file)))
    elif not os.path.exists(stage_inputs):
        click.echo(f'Cannot find the stage file: {stage_inputs}')
        sys.exit(1)
    else:
        all_stage_files = [os.path.abspath(stage_inputs)]

    for stage_file in all_stage_files:
        try:
            stage_content: dict = load_stages(stage_file)
        except Exception as e:
            click.echo(f'Error: file {stage_file}: {e}')
            sys.exit(1)

        for stage_name in stage_content.keys():
            click.echo(f'Process stage [{stage_name}]')
            current_stage = stage_content[stage_name]
            datasource = current_stage['data']
            source_file = os.path.abspath(
                os.path.join(os.path.dirname(stage_file), '../sources', f'{datasource}.yaml'))

            from tempfile import TemporaryDirectory
            with TemporaryDirectory() as tmpdir:
                try:
                    # TODO assume only 1 stage in a stage file for now
                    all_columns = execute_ge_checkpoint(tmpdir, source_file, stage_file)
                    report_file = copy_report(tmpdir, stage_name)
                    print(f"create report at {report_file}")

                    # generate ydata report
                    import pandas as pd
                    from piperider_cli.ydata.data_expectations import DataExpectationsReporter
                    df = pd.DataFrame(columns=all_columns)
                    der = DataExpectationsReporter()
                    results = der.evaluate(report_file, df)
                    # TODO more report from results

                except Exception as e:
                    click.echo(f'Skipped: Stage [{stage_name}]: Error: {e}')
                    continue


def copy_report(ge_workspace, stage_name):
    # TODO each stage should have its report file
    for root, dirs, files in os.walk(ge_workspace):
        for f in files:
            if f.endswith('.json') and 'uncommitted' in root:
                report_json = os.path.join(root, f)
                report_name = f'{stage_name}_{os.path.basename(report_json)}'
                shutil.copy(report_json, os.path.join('.', report_name))
                return report_name
