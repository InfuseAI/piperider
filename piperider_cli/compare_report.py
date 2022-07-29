import json
import os
import re
import sys
from datetime import datetime

import readchar
from rich.console import Console

import piperider_cli.hack.inquirer as inquirer_hack
from piperider_cli import datetime_to_str, str_to_datetime, clone_directory, \
    raise_exception_when_output_directory_not_writable
from piperider_cli.configuration import PIPERIDER_OUTPUT_PATH, PIPERIDER_COMPARISON_PATH


class ProfilerOutput(object):
    def __init__(self, path):
        self.path = path
        self.name = None
        self.created_at = None

        self.table_count = 0
        self.pass_count = 0
        self.fail_count = 0

        try:
            with open(path, 'r') as f:
                profile = json.load(f)
                self.name = profile['datasource']['name']
                self.created_at = profile['created_at']

                tables = profile.get('tables', {})
                self.table_count = len(tables.keys())
                for table in tables.values():
                    if table.get('assertion_results'):
                        for t in table['assertion_results'].get('tests', []):
                            if t.get('status') == 'passed':
                                self.pass_count += 1
                            else:
                                self.fail_count += 1
                        for col in table['assertion_results'].get('columns', {}).keys():
                            for t in table['assertion_results']['columns'][col]:
                                if t.get('status') == 'passed':
                                    self.pass_count += 1
                                else:
                                    self.fail_count += 1
        except Exception as e:
            if isinstance(e, json.decoder.JSONDecodeError):
                raise json.decoder.JSONDecodeError(
                    f'Invalid JSON in file "{path}"', e.doc, e.pos)
            raise e

    def verify(self) -> bool:
        # TODO: add some verification logic
        return True

    def load(self):
        with open(self.path, 'r') as f:
            data = json.load(f)
        return data

    def __str__(self):
        created_at_str = datetime_to_str(str_to_datetime(self.created_at),
                                         to_tzlocal=True)

        return f'{self.name:12} ' \
               f'#table={self.table_count:<6} ' \
               f'#pass={self.pass_count:<5} ' \
               f'#fail={self.fail_count:<5} ' \
               f'{created_at_str}'


class ComparisonData(object):
    def __init__(self, base, target):
        self._id = datetime.now().strftime("%Y%m%d%H%M%S")
        self._base = base
        self._target = target

    def id(self):
        return self._id

    def to_json(self):
        output = dict(
            created_at=datetime_to_str(datetime.utcnow()),
            base=self._base,
            # TODO: rename input -> target in schema and result json
            input=self._target,
        )
        return json.dumps(output)


class CompareReport(object):
    def __init__(self, profiler_output_path, a=None, b=None, datasource=None):
        self.profiler_output_path = profiler_output_path
        self.console = Console()
        self.a: ProfilerOutput = ProfilerOutput(a) if a else None
        self.b: ProfilerOutput = ProfilerOutput(b) if b else None
        self.datasource = datasource

    def list_existing_outputs(self, output_search_path=None):
        """
        List existing profiler outputs.
        """

        def _walk_throw_runs(path):
            outputs = []
            for root, dirs, _ in os.walk(path):
                for dir in dirs:
                    if dir == 'latest':
                        continue
                    run_json = os.path.join(root, dir, 'run.json')
                    if not os.path.exists(run_json):
                        continue
                    output = ProfilerOutput(run_json)
                    if self.datasource and output.name != self.datasource:
                        continue
                    outputs.append(output)
            outputs.sort(key=lambda x: (x.name, x.created_at), reverse=True)
            return outputs

        if output_search_path is None:
            output_search_path = self.profiler_output_path

        return _walk_throw_runs(output_search_path)

    def get_the_last_two_reports(self):
        outputs = self.list_existing_outputs()
        outputs.sort(key=lambda x: x.created_at)
        outputs = list(filter(lambda x: x.name == outputs[-1].name, outputs))
        if len(outputs) < 2:
            return None, None
        return outputs[-2:]

    def select_reports(self, use_last_two=None):
        if use_last_two:
            self.a, self.b = self.get_the_last_two_reports()
        elif self.a is None and self.b is None:
            self.a, self.b = self.select_two_reports()
        elif self.a and self.b is None:
            self.b = self.select_one_report()
            pass
        elif self.a is None and self.b:
            self.a = self.select_one_report()

        if self.a and self.b:
            self.console.print('Selected reports:')
            self.console.print(f'  Base:   {self.a.path}')
            self.console.print(f'  Target: {self.b.path}')
            return True
        return False

    def select_one_report(self) -> ProfilerOutput:
        def _report_validater(answers, current) -> bool:
            return len(current) == 1

        profiler_outputs = self.list_existing_outputs()
        arrow_alias_msg = ''
        if sys.platform == "win32" or sys.platform == "cygwin":
            # change readchar key UP & DOWN by 'w' and 's'
            readchar.key.UP = 'w'
            readchar.key.DOWN = 's'
            arrow_alias_msg = " 'w' to Up, 's' to Down,"

        if len(profiler_outputs) < 1:
            raise Exception("Not enough reports to compare. Please run 'piperider run' first.")

        questions = [
            inquirer_hack.LimitedCheckboxQuestion('profiler_output',
                                                  message=f"Please select a report to compare ({arrow_alias_msg} SPACE to select, and ENTER to confirm )",
                                                  choices=profiler_outputs,
                                                  carousel=True,
                                                  validate=_report_validater,
                                                  limited=1,
                                                  )
        ]
        answers = inquirer_hack.prompt_ex(questions, raise_keyboard_interrupt=True)

        if answers:
            return answers['profiler_output'][0]
        else:
            return None

    def select_two_reports(self) -> (ProfilerOutput, ProfilerOutput):
        """
        Select multiple files from a list of files.
        """

        # execution.

        def _report_validater(answers, current) -> bool:
            return len(current) == 2

        profiler_outputs = self.list_existing_outputs()
        arrow_alias_msg = ''
        if sys.platform == "win32" or sys.platform == "cygwin":
            # change readchar key UP & DOWN by 'w' and 's'
            readchar.key.UP = 'w'
            readchar.key.DOWN = 's'
            arrow_alias_msg = " 'w' to Up, 's' to Down,"

        if len(profiler_outputs) < 2:
            raise Exception("Not enough reports to compare. Please run 'piperider run' first.")

        questions = [
            inquirer_hack.LimitedCheckboxQuestion(
                'profiler_outputs',
                message=f"Please select the 2 reports to compare ({arrow_alias_msg} SPACE to select, and ENTER to confirm )",
                choices=profiler_outputs,
                carousel=True,
                validate=_report_validater,
                limited=2,
            ),
        ]
        answers = inquirer_hack.prompt_ex(questions, raise_keyboard_interrupt=True)
        if answers:
            return answers['profiler_outputs'][0], answers['profiler_outputs'][1]
        return None, None

    def setup_report_variables(self, template_html: str, is_single: bool, data):
        if isinstance(data, dict):
            output = json.dumps(data)
        else:
            output = data
        if is_single:
            variables = f'<script id="piperider-report-variables">\nwindow.PIPERIDER_SINGLE_REPORT_DATA={output};window.PIPERIDER_COMPARISON_REPORT_DATA="";</script>'
        else:
            variables = f'<script id="piperider-report-variables">\nwindow.PIPERIDER_SINGLE_REPORT_DATA="";window.PIPERIDER_COMPARISON_REPORT_DATA={output};</script>'
        html_parts = re.sub(r'<script id="piperider-report-variables">.+?</script>', '#PLACEHOLDER#',
                            template_html).split(
            '#PLACEHOLDER#')
        html = html_parts[0] + variables + html_parts[1]
        return html

    def generate_data(self) -> ComparisonData:
        if self.a is None or self.b is None:
            raise Exception("Please select reports to compare first.")

        return ComparisonData(self.a.load(), self.b.load())

    @staticmethod
    def exec(*, a=None, b=None, last=None, datasource=None, output=None, debug=False):
        console = Console()
        raise_exception_when_output_directory_not_writable(output)

        report = CompareReport(PIPERIDER_OUTPUT_PATH, a, b, datasource=datasource)
        if not report.select_reports(use_last_two=last):
            raise Exception('No valid reports found')
        comparison_data = report.generate_data()

        from piperider_cli import data
        report_template_dir = os.path.join(os.path.dirname(data.__file__), 'report', 'comparison-report')
        with open(os.path.join(report_template_dir, 'index.html')) as f:
            report_template_html = f.read()

        def output_report(directory):
            clone_directory(report_template_dir, directory)
            filename = os.path.join(directory, 'index.html')
            with open(filename, 'w') as f:
                html = report.setup_report_variables(report_template_html, False, comparison_data.to_json())
                f.write(html)

            return filename

        data_id = comparison_data.id()
        default_report_directory = os.path.join(PIPERIDER_COMPARISON_PATH, data_id)
        filename = output_report(default_report_directory)

        if output:
            clone_directory(default_report_directory, output)
            filename = os.path.join(output, 'index.html')

        console.print()
        console.print(f"Comparison report: {filename}")

        if debug:
            # Write comparison data to file
            with open(os.path.join(default_report_directory, 'comparison_data.json'), 'w') as f:
                f.write(comparison_data.to_json())
