import collections
import json
import os
import shutil
import sys
import time
from glob import glob
from typing import Tuple

import click
import pandas as pd

from piperider_cli import StageFile, Stage
from piperider_cli.data import execute_ge_checkpoint
from piperider_cli.data.convert_to_exp import get_scheduled_tests


class ReportAggregator(object):

    def __init__(self, metadata: tuple):
        self._reports = collections.OrderedDict()
        self._report_uid = None
        self._report_url = None
        if metadata:
            self.update_metadata(metadata)

    def stage(self, stage):
        stage_name = os.path.basename(stage.stage_file).split('.')[0] + '::' + stage.name
        if stage_name not in self._reports:
            self._reports[stage_name] = {}
        return self._reports[stage_name]

    def add_ge_report_file(self, stage, report_file):
        with open(report_file, 'r') as fh:
            self.stage(stage)['ge'] = json.loads(fh.read())

    def add_ydata_report(self, stage, outputs):
        self.stage(stage)['ydata'] = outputs

    def set_report_uid(self, uid):
        piperider_app_url = os.environ.get('PIPERIDER_APP_URL', 'https://app.piperider.io')
        if piperider_app_url is None:
            return None
        self._report_uid = uid
        self._report_url = f'{piperider_app_url}/reports/{uid}'
        return self._report_url

    def report(self):
        return json.dumps(self._reports)

    def report_dict(self):
        return self._reports

    def update_metadata(self, metadata: Tuple[str]):
        import re
        output = dict()
        for data in metadata:
            # get the first '='
            sep = data.index('=')
            k, v = data[:sep].strip(), data[sep + 1:].strip()
            if re.match(r'^[a-zA-Z_0-9]+$', k):
                output[k] = v
            else:
                # check the key naming make it acceptable to the firebase realtime database
                # https://firebase.google.com/docs/database/web/structure-data
                print(f'drop invalid key [{k}] for metadata')
        self._reports['metadata'] = output


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


def _run_stage(aggregator: ReportAggregator, stage: Stage, keep_ge_workspace: bool):
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
            ydata_report = report_file.replace('.json', '_ydata.json')
            aggregator.add_ge_report_file(stage, report_file)

            execute_custom_assertions(ge_context, report_file)

            click.echo(f"Test Report:  {report_file}", err=True)
            click.echo(f"Ydata Report: {ydata_report}", err=True)

            # generate ydata report
            import pandas as pd
            from piperider_cli.ydata.data_expectations import DataExpectationsReporter
            df = pd.DataFrame(columns=all_columns)
            print(f"Data Source: {stage.source_file.split('/')[-1]}")
            print("Data Columns: ", all_columns)
            der = DataExpectationsReporter()
            results = der.evaluate(report_file, df)

            expectations_report, expectations_dense = results['Expectation Level Assessment']
            click.echo(expectations_report)

            # save ydata report
            with open(ydata_report, 'w') as fh:
                outputs = refine_ydata_result(results)
                aggregator.add_ydata_report(stage, outputs)
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


def upload_reports_to_piperider(aggregator: ReportAggregator):
    if 'PIPERIDER_SERVICE_URL' not in os.environ:
        return
    url = os.environ['PIPERIDER_SERVICE_URL']
    if url.endswith('/'):
        url = url[:-1]

    # TODO hardcode it for demo
    project_uid = 'mlp-demo'
    reports_upload_url = f'{url}/projects/{project_uid}/reports'
    import requests

    status_code = 0
    try:
        response = requests.post(reports_upload_url, json=aggregator.report_dict())

        status_code = response.status_code
        if status_code == 200:
            result = response.json()
            # click.echo(f'Upload reports to {reports_upload_url} => {result}')
            return dict(status_code=status_code, result=result)
        return dict(status_code=status_code, text=response.text)
    except BaseException as e:
        return dict(status_code=status_code, text=str(e))


def run_stages(all_stage_files, keep_ge_workspace: bool, one_json: bool, kwargs):
    return_states = []
    stage_files = [StageFile(s) for s in all_stage_files]
    aggregator = ReportAggregator(kwargs.get('metadata', ()))
    for stage_file in stage_files:
        for stage in stage_file.stages():
            has_error = _run_stage(aggregator, stage, keep_ge_workspace)
            return_states.append(has_error)
            click.echo()

    has_error = [x for x in return_states if x is True]
    rc = upload_reports_to_piperider(aggregator)
    if rc and rc.get('status_code') == 200:
        uid = rc.get('result', {}).get('uid')
        url = aggregator.set_report_uid(uid)
        if url:
            click.echo(f'Report URL: {url}')
    if one_json:
        with open('aggregated-reports.json', 'w') as fh:
            fh.write(aggregator.report())

    if has_error:
        sys.exit(1)
    else:
        sys.exit(0)


def copy_report(ge_workspace, stage: Stage):
    for report_json in glob(os.path.join(ge_workspace, 'great_expectations', 'uncommitted', '**', '*.json'),
                            recursive=True):
        filename = os.path.basename(stage.stage_file).split('.')[0]
        report_name = f'{filename}_{stage.name}_{os.path.basename(report_json)}'
        shutil.copy(report_json, os.path.join(os.environ['PIPERIDER_REPORT_DIR'], report_name))
        return report_name
