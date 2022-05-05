import collections
import json
import os
import shutil
import sys
import time
from datetime import datetime
from typing import Tuple

import click

from piperider_cli.stage import StageFile


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

    def add_ydata_report_file(self, stage, report_file):
        with open(report_file, 'r') as fh:
            self.stage(stage)['ydata'] = json.loads(fh.read())

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

    def generate_local_report(self):
        from piperider_cli import data
        init_template_dir = os.path.join(os.path.dirname(data.__file__), 'static-report')
        working_dir = os.path.join(os.getcwd(), 'reports')
        report_file_template = os.path.join(os.getcwd(), 'reports/index.html')
        shutil.copytree(init_template_dir, working_dir, dirs_exist_ok=True)
        content = self.convert_to_report_json()
        # patch report_file_template
        with open(report_file_template) as fh:
            s = fh.read()

        with open(report_file_template, "w") as fh:
            s = s.replace(r'window.PIPERIDER_REPORT_DATA={};', f'window.PIPERIDER_REPORT_DATA={json.dumps(content)};')
            fh.write(s)

        filename = datetime.now().strftime('%Y%m%dT%H%M%S')
        report_file = os.path.join(os.getcwd(), f'reports/{filename}.html')
        shutil.move(report_file_template, report_file)

        print(f'Generate report at {report_file}')

    def convert_to_report_json(self):
        payload = self.report_dict()
        stages = list()
        metadata = payload.pop('metadata', {})
        for key in payload:
            ge = payload[key].get('ge', {})
            ydata = payload[key].get('ydata', {})

            ge_metadata = ge.get('meta', {})
            if 'validation_time' in ge_metadata:
                t = datetime.strptime(ge_metadata['validation_time'], '%Y%m%dT%H%M%S.%fZ')
                ge_metadata['validation_time'] = t.strftime('%Y-%m-%dT%H:%M:%S.%fZ')

            stage = dict(
                name=key,
                metadata=ge_metadata,
                cases=ge.get('results', []),
                summary=dict(
                    success=ge.get('statistics', {}).get('successful_expectations', None),
                    failure=ge.get('statistics', {}).get('unsuccessful_expectations', None),
                    success_percent=ge.get('statistics', {}).get('success_percent', None),
                    coverage=ydata.get('Coverage Fraction', None),
                ),
            )
            stages.append(stage)
        content = dict(
            stages=stages,
            metadata=metadata,
            raw=payload,
            created_at=int(time.time() * 1000),
        )
        return content


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


def run_stages(all_stage_files, keep_ge_workspace: bool, generate_local_report: bool, kwargs):
    return_states = []
    stage_files = [StageFile(s) for s in all_stage_files]
    aggregator = ReportAggregator(kwargs.get('metadata', ()))
    for stage_file in stage_files:
        for stage in stage_file.stages():
            has_error, reports = stage.run(keep_ge_workspace)
            return_states.append(has_error)
            if reports is not None:
                aggregator.add_ge_report_file(stage, reports['ge'])
                aggregator.add_ydata_report_file(stage, reports['ydata'])
            click.echo()

    has_error = [x for x in return_states if x is True]
    rc = upload_reports_to_piperider(aggregator)
    if rc and rc.get('status_code') == 200:
        uid = rc.get('result', {}).get('uid')
        url = aggregator.set_report_uid(uid)
        if url:
            click.echo(f'Report URL: {url}')

    if generate_local_report:
        aggregator.generate_local_report()

    if has_error:
        sys.exit(1)
    else:
        sys.exit(0)
