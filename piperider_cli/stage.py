import os
import shutil
from glob import glob
from time import time

import click
from rich.console import Console
from rich.markdown import Markdown


class Stage(object):

    def __init__(self, stage_file, name, content):
        self.stage_file_obj = stage_file
        self.stage_file = stage_file.stage_file
        self.name = name
        self.content = content
        self.source_file = None
        self.all_columns = None
        self.reports = {
            'ge': None,
            'ydata': None,
        }
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

    def _show_status(self, expectations_report):
        datasource_name = self.source_file.split('/')[-1]
        markdown_template = f'''
# Status
* Data Source : {datasource_name}
* Data Columns : {self.all_columns}
* Output Reports
  * Test report: {self.reports['ge']}
  * Ydata report: {self.reports['ge']}

# Output
``` text
{expectations_report}
```
'''
        self.console.print(Markdown(markdown_template))

    def _load_source(self):
        if 'data' not in self.content:
            raise ValueError('data is required field')

        source_name = self.content['data']
        self.source_file = os.path.abspath(
            os.path.join(os.path.dirname(self.stage_file), '../sources', f'{source_name}.yaml'))

    def tests(self):
        return self.content['tests']

    def run(self, keep_ge_workspace=False):
        from piperider_cli.data import execute_ge_checkpoint, execute_custom_assertions
        from piperider_cli.ydata import execute_ydata
        from tempfile import TemporaryDirectory
        with TemporaryDirectory() as tmp_dir:
            ge_workspace = tmp_dir
            if keep_ge_workspace:
                ge_workspace = os.path.join(os.getcwd(), f'ge_dir_{int(time())}')
                click.echo(f'Keep ge workspace at {ge_workspace}')

        try:
            self._show_progress()

            # generate great expectations report
            self.all_columns, ge_context = execute_ge_checkpoint(ge_workspace, self)
            self.reports['ge'] = self.copy_report(ge_workspace)
            self.reports['ydata'] = self.reports['ge'].replace('.json', '_ydata.json')

            # execute custom assertions and update ge report
            execute_custom_assertions(ge_context, self.reports['ge'])

            # generate ydata report
            expectations_report, expectations_dense, has_error = execute_ydata(self.all_columns, self.reports['ge'],
                                                                               self.reports['ydata'])
            self._show_status(expectations_report)
            self._show_result()
            return has_error, self.reports

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
