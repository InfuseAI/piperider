import os.path
import shutil
import sys

import click

from piperider_cli import workspace
from piperider_cli.config import load_stages
from piperider_cli.data import execute_great_expectation


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
    stage_file: str = kwargs.get('stage', '')

    if stage_file is None:
        click.echo(f'--stage is required')
        sys.exit(1)

    if os.path.isdir(stage_file):
        all_stage_files = []
        for yaml_file in os.listdir(stage_file):
            if yaml_file.endswith('.yaml') or yaml_file.endswith('.yml'):
                all_stage_files.append(os.path.abspath(os.path.join(stage_file, yaml_file)))
    elif not os.path.exists(stage_file):
        click.echo(f'Cannot find the stage file: {stage_file}')
        sys.exit(1)
    else:
        all_stage_files = [os.path.abspath(stage_file)]

    for a_stage_file in all_stage_files:
        try:
            stage_content: dict = load_stages(a_stage_file)
        except Exception as e:
            click.echo(f'Error: file {a_stage_file}: {e}')
            sys.exit(1)

        for stage in stage_content.keys():
            click.echo(f'Process stage [{stage}]')

            s = stage_content[stage]

            data = s['data']
            source_file = os.path.abspath(os.path.join(os.path.dirname(a_stage_file), '../sources', f'{data}.yaml'))
            # print(stage_content[stage])
            # """
            # {'data': 'local', 'tests': [{'function': 'shouldNotBeNull', 'column': ['timestamp', 'price', 'process_time', 'result']}, {'function': 'shouldBeConst', 'column': 'result', 'params': [True, False]}, {'function': 'shouldBeInRange', 'column': 'price', 'params': [10, 500000]}]}
            # """
            # print(stage)

            from tempfile import TemporaryDirectory
            with TemporaryDirectory() as tmpdir:
                try:
                    execute_great_expectation(tmpdir, source_file, a_stage_file)
                except Exception as e:
                    click.echo(f'Skipped: Stage [{stage}]: Error: {e}')
                    continue

                for root, dirs, files in os.walk(tmpdir):
                    for f in files:
                        if f.endswith('.json') and 'uncommitted' in root:
                            report_json = os.path.join(root, f)
                            shutil.copy(report_json, '.')
                            print(f'report json is {f}')
