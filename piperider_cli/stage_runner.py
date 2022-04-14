import json
import os
import shutil
import sys
import time

import click
import pandas as pd
from glob import glob

from piperider_cli import StageFile, Stage
from piperider_cli.data import execute_ge_checkpoint
from piperider_cli.data.convert_to_exp import get_scheduled_tests


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


def _run_stage(stage: Stage, keep_ge_workspace: bool):
    from tempfile import TemporaryDirectory
    with TemporaryDirectory() as tmpdir:
        ge_workspace = tmpdir

        if keep_ge_workspace:
            ge_workspace = os.path.join(os.getcwd(), f'ge_dir_{int(time.time())}')
            print(f"keep ge workspace at {ge_workspace}")

        try:
            stage.show_progress()
            all_columns, ge_context = execute_ge_checkpoint(ge_workspace, stage)
            report_file = copy_report(ge_workspace, stage)

            execute_custom_assertions(ge_context, report_file)

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

            return outputs['has_error']

        except Exception as e:
            click.echo(f'Skipped: Stage [{stage.stage_file}::{stage.name}]: Error: {e}')
            # mark as error
            return True

        # mark as error when the result does not come from ydata
        return True


def update_report(report_file, custom_assertion, action_result):
    with open(report_file) as fh:
        report_data = json.loads(fh.read())
        results = report_data['results']
        kwargs = {
            "batch_id": "68826d1fc4627a6685f0291acd9c54bb",
        }
        if 'column' in custom_assertion.test_definition:
            kwargs['column'] = custom_assertion.test_definition['column']

        results.append(
            {
                "exception_info": {
                    "exception_message": None,
                    "exception_traceback": None,
                    "raised_exception": False
                },
                "expectation_config": {
                    "expectation_type": f"custom-assertion::{custom_assertion.function_name}",
                    "kwargs": kwargs,
                    "meta": {
                        "test_definition": custom_assertion.test_definition,
                        "function_name": custom_assertion.function_name
                    }
                },
                "meta": {},
                "result": {},
                "success": action_result
            }
        )

        if not action_result:
            report_data['success'] = False

        all_count = len(results)
        success_count = len([r for r in results if r['success']])

        report_data['statistics'] = {
            'evaluated_expectations': all_count,
            'success_percent': 100 * (success_count / all_count),
            'successful_expectations': success_count,
            'unsuccessful_expectations': all_count - success_count}

        # write back to file
        with open(report_file, 'w') as fh:
            fh.write(json.dumps(report_data, indent=2))
    pass


def execute_custom_assertions(ge_context, report_file):
    scheduled_tests = get_scheduled_tests()
    if not scheduled_tests:
        return

    print(f"executing {len(scheduled_tests)} scheduled tests", )
    for k, v in scheduled_tests.items():
        try:
            # execute the scheduled test
            action_result = v.execute_and_remove_from_queue(ge_context)
            if isinstance(action_result, bool):
                update_report(report_file, v, action_result)
            elif isinstance(action_result, pd.DataFrame):
                values = action_result.all().values
                if len(values) == 1 and values[0]:
                    update_report(report_file, v, True if values[0] else False)
                else:
                    update_report(report_file, v, False)
        except:
            raise
        finally:
            # TODO update the report to ge's output
            pass


def run_stages(all_stage_files, keep_ge_workspace: bool):
    return_states = []
    stage_files = [StageFile(s) for s in all_stage_files]
    for stage_file in stage_files:
        for stage in stage_file.stages():
            has_error = _run_stage(stage, keep_ge_workspace)
            return_states.append(has_error)

    has_error = [x for x in return_states if x is True]
    if has_error:
        sys.exit(1)
    else:
        sys.exit(0)


def copy_report(ge_workspace, stage: Stage):
    for report_json in glob(os.path.join(ge_workspace, 'great_expectations', 'uncommitted', '**', '*.json'), recursive=True):
        filename = os.path.basename(stage.stage_file).split('.')[0]
        report_name = f'{filename}_{stage.name}_{os.path.basename(report_json)}'
        shutil.copy(report_json, os.path.join(os.environ['PIPERIDER_REPORT_DIR'], report_name))
        return report_name
