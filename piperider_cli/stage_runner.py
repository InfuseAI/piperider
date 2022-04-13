import json
import os
import shutil
import sys
import time

import click
import pandas as pd

from piperider_cli.config import load_stages
from piperider_cli.data import execute_ge_checkpoint


def refine_ydata_result(results: dict):
    outputs = {'has_error': True}
    for k, v in results.items():
        if 'Expectation Level Assessment' == k:
            refined_assessment = list(v)
            for idx, elem in enumerate(refined_assessment):
                if isinstance(elem, pd.DataFrame):
                    refined_assessment[idx] = elem.to_json(orient='table')
                    outputs['has_error'] = False if elem['Successful?'].all() else True
            outputs[k] = refined_assessment
        else:
            outputs[k] = v
    return outputs


def run_stages(all_stage_files, keep_ge_workspace: bool):
    has_error = False
    for stage_file in all_stage_files:
        try:
            stage_content: dict = load_stages(stage_file)
        except Exception as e:
            click.echo(f'Error: file {stage_file}: {e}')
            sys.exit(1)

        for stage_name in stage_content.keys():
            click.echo(f'Process stage [{os.path.basename(stage_file).split(".")[0]}:{stage_name}]')
            current_stage = stage_content[stage_name]
            source_name = current_stage['data']
            source_file = os.path.abspath(
                os.path.join(os.path.dirname(stage_file), '../sources', f'{source_name}.yaml'))

            from tempfile import TemporaryDirectory
            with TemporaryDirectory() as tmpdir:
                ge_workspace = tmpdir

                if keep_ge_workspace:
                    ge_workspace = os.path.join(os.getcwd(), f'ge_dir_{int(time.time())}')
                    print(f"keep ge workspace at {ge_workspace}")

                try:
                    all_columns = execute_ge_checkpoint(ge_workspace, source_file, stage_file, stage_name)
                    report_file = copy_report(ge_workspace, stage_file, stage_name)
                    print(f"create report at {report_file}")

                    # generate ydata report
                    import pandas as pd
                    from piperider_cli.ydata.data_expectations import DataExpectationsReporter
                    df = pd.DataFrame(columns=all_columns)
                    print("columns: ", all_columns)
                    der = DataExpectationsReporter()
                    results = der.evaluate(report_file, df)

                    expectations_report, expectations_dense = results['Expectation Level Assessment']
                    print(expectations_report)

                    ydata_report = report_file.replace('.json', '_ydata.json')
                    print(f"create ydata report at {ydata_report}")
                    with open(ydata_report, 'w') as fh:
                        outputs = refine_ydata_result(results)
                        fh.write(json.dumps(outputs))

                    has_error = outputs['has_error']

                except Exception as e:
                    click.echo(f'Skipped: Stage [{stage_file}::{stage_name}]: Error: {e}')
                    has_error = True
                    continue

    if has_error:
        sys.exit(1)
    else:
        sys.exit(0)


def copy_report(ge_workspace, stage_file, stage_name):
    for root, dirs, files in os.walk(ge_workspace):
        for f in files:
            if f.endswith('.json') and 'uncommitted' in root:
                report_json = os.path.join(root, f)
                filename = os.path.basename(stage_file).split('.')[0]
                report_name = f'{filename}_{stage_name}_{os.path.basename(report_json)}'
                shutil.copy(report_json, os.path.join('.', report_name))
                return report_name
