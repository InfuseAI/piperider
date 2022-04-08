import json
import os
import shutil
import sys
import time

import click

from piperider_cli.config import load_stages
from piperider_cli.data import execute_ge_checkpoint


def run_stages(all_stage_files, keep_ge_workspace: bool):
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
                ge_workspace = tmpdir

                if keep_ge_workspace:
                    ge_workspace = os.path.join(os.getcwd(), f'ge_dir_{int(time.time())}')
                    print(f"keep ge workspace at {ge_workspace}")

                try:
                    # TODO assume only 1 stage in a stage file for now
                    all_columns = execute_ge_checkpoint(ge_workspace, source_file, stage_file)
                    report_file = copy_report(ge_workspace, stage_file, stage_name)
                    print(f"create report at {report_file}")

                    # generate ydata report
                    import pandas as pd
                    from piperider_cli.ydata.data_expectations import DataExpectationsReporter
                    df = pd.DataFrame(columns=all_columns)
                    print("columns: ", all_columns)
                    der = DataExpectationsReporter()
                    results = der.evaluate(report_file, df)
                    # TODO more report from results
                    expectations_report, expectations_dense = results['Expectation Level Assessment']
                    expectations_report
                    print(expectations_report)
                    # print(expectations_dense)

                except Exception as e:
                    click.echo(f'Skipped: Stage [{stage_file}::{stage_name}]: Error: {e}')
                    continue


def copy_report(ge_workspace, stage_file, stage_name):
    # TODO each stage should have its report file
    for root, dirs, files in os.walk(ge_workspace):
        for f in files:
            if f.endswith('.json') and 'uncommitted' in root:
                report_json = os.path.join(root, f)
                filename = os.path.basename(stage_file).split('.')[0]
                report_name = f'{filename}_{stage_name}_{os.path.basename(report_json)}'
                shutil.copy(report_json, os.path.join('.', report_name))
                return report_name
