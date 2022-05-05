import json
import os
import shutil
from glob import glob
from time import time

import click
import pandas as pd
from rich.console import Console
from rich.markdown import Markdown


class Stage(object):

    def __init__(self, stage_file, name, content):
        self.stage_file_obj = stage_file
        self.stage_file = stage_file.stage_file
        self.name = name
        self.content = content
        self.source_file = None
        self.console = Console()

        self._load_source()

    def _show_progress(self):
        self.console.rule(f'[bold green][Process stage] {os.path.basename(self.stage_file).split(".")[0]}:{self.name}',
                          align='left')

    def _show_result(self, error=None):
        stage_name = f'{os.path.basename(self.stage_file).split(".")[0]}:{self.name}'

        if error is not None:
            click.echo(f'Skipped stage [{stage_name}] Error: {error}')
            self.console.rule(f'[bold red][Failed] {stage_name}', align='left')
        else:
            self.console.rule(f'[bold green][Pass] {stage_name}', align='left')

    def _load_source(self):
        if 'data' not in self.content:
            raise ValueError('data is required field')

        source_name = self.content['data']
        self.source_file = os.path.abspath(
            os.path.join(os.path.dirname(self.stage_file), '../sources', f'{source_name}.yaml'))

    def tests(self):
        return self.content['tests']

    def run(self, keep_ge_workspace=False):
        from piperider_cli.data import execute_ge_checkpoint

        from piperider_cli.ydata.data_expectations import DataExpectationsReporter
        from tempfile import TemporaryDirectory
        with TemporaryDirectory() as tmp_dir:
            ge_workspace = tmp_dir
            if keep_ge_workspace:
                ge_workspace = os.path.join(os.getcwd(), f'ge_dir_{int(time())}')
                click.echo(f'Keep ge workspace at {ge_workspace}')

        try:
            self._show_progress()
            all_columns, ge_context = execute_ge_checkpoint(ge_workspace, self)
            ge_report_file = self.copy_report(ge_workspace)
            ydata_report_file = ge_report_file.replace('.json', '_ydata.json')

            self.execute_custom_assertions(ge_context, ge_report_file)

            # generate ydata report
            df = pd.DataFrame(columns=all_columns)
            datasource_name = self.source_file.split('/')[-1]
            der = DataExpectationsReporter()
            results = der.evaluate(ge_report_file, df)
            expectations_report, expectations_dense = results['Expectation Level Assessment']

            markdown_template = f'''
# Status
* Data Source : {datasource_name}
* Data Columns : {all_columns}
* Output Reports
  * Test report: {ge_report_file}
  * Ydata report: {ydata_report_file}

# Output
``` text
{expectations_report}
```
'''
            self.console.print(Markdown(markdown_template))

            # save ydata report
            with open(ydata_report_file, 'w') as fh:
                outputs = self.refine_ydata_result(results)
                fh.write(json.dumps(outputs))

            self._show_result()
            return outputs['has_error'], {'ge': ge_report_file, 'ydata': ydata_report_file}
        except Exception as e:
            # mark as error
            self.console.print_exception(show_locals=True)
            self._show_result(e)
            return True, None

    def copy_report(self, ge_workspace):
        for report_json in glob(os.path.join(ge_workspace, 'great_expectations', 'uncommitted', '**', '*.json'),
                                recursive=True):
            filename = os.path.basename(self.stage_file).split('.')[0]
            report_name = f'{filename}_{self.name}_{os.path.basename(report_json)}'
            shutil.copy(report_json, os.path.join(os.environ['PIPERIDER_REPORT_DIR'], report_name))
            return report_name

    def execute_custom_assertions(self, ge_context, report_file):
        from piperider_cli.data.convert_to_exp import get_scheduled_tests
        scheduled_tests = get_scheduled_tests()
        if not scheduled_tests:
            return

        print(f"executing {len(scheduled_tests)} scheduled tests", )
        for k, v in scheduled_tests.items():
            try:
                # execute the scheduled test
                action_result = v.execute_and_remove_from_queue(ge_context)
                if isinstance(action_result, bool):
                    self.update_report(report_file, v, action_result)
                elif isinstance(action_result, pd.DataFrame):
                    values = action_result.all().values
                    if len(values) == 1 and values[0]:
                        self.update_report(report_file, v, True if values[0] else False)
                    else:
                        self.update_report(report_file, v, False)
            except Exception as e:
                click.echo(f'Error: {e}')
                raise
            finally:
                # TODO update the report to ge's output
                pass

    def update_report(self, report_file, custom_assertion, action_result):
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
            with open(report_file, 'w') as fd:
                fd.write(json.dumps(report_data, indent=2))
        pass

    def refine_ydata_result(self, results: dict):
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


class StageFile(object):

    def __init__(self, stage_file):
        self.stage_file = stage_file
        from piperider_cli.config import load_stages
        self.stage_content: dict = load_stages(stage_file)
        self.filename = stage_file

    def stages(self):
        for k in self.stage_content.keys():
            yield Stage(self, k, self.stage_content[k])

    def get(self, name):
        if name in self.stage_content:
            return Stage(self, name, self.stage_content[name])
