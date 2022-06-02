import json
import os
import sys

import inquirer
import readchar
from rich.console import Console


class ProfilerOutput(object):
    def __init__(self, path):
        self.path = path
        self.name = None
        self.datasource = None
        self.created_at = None

        self.pass_count = 0
        self.fail_count = 0
        self.row_count = 0
        self.col_count = 0

        try:
            with open(path, 'r') as f:
                profile = json.load(f)
                self.name = profile['name']
                self.datasource = profile['datasource']['name']
                self.row_count = profile['row_count']
                self.col_count = profile['col_count']
                self.created_at = profile['created_at']
                if profile.get('assertion_results'):
                    for t in profile['assertion_results'].get('tests', []):
                        if t.get('status') == 'passed':
                            self.pass_count += 1
                        else:
                            self.fail_count += 1
                    for col in profile['assertion_results'].get('columns', {}).keys():
                        for t in profile['assertion_results']['columns'][col]:
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
        return f'{self.datasource}->{self.name:20} #pass={self.pass_count:3} #fail={self.fail_count:<3} #row={self.row_count:<8} #column={self.col_count:<3} {self.created_at}'


class CompareReport(object):
    def __init__(self, profiler_output_path, a=None, b=None):
        self.profiler_output_path = profiler_output_path
        self.console = Console()
        self.a: ProfilerOutput = ProfilerOutput(a) if a else None
        self.b: ProfilerOutput = ProfilerOutput(b) if b else None

    def list_existing_outputs(self, output_search_path=None):
        """
        List existing profiler outputs.
        """

        def _walk_throw_tables(path):
            tables = []
            for root, dirs, files in os.walk(path):
                for file in files:
                    if file.endswith(".json") and not file.startswith("."):
                        try:
                            tables.append(ProfilerOutput(os.path.join(root, file)))
                        except:
                            pass
            return tables

        def _walk_throw_data_sources(path):
            outputs = []
            for root, dirs, files in os.walk(path):
                for dir in dirs:
                    if dir != 'latest':
                        tables = _walk_throw_tables(os.path.join(root, dir))
                        outputs.extend(tables)
            outputs.sort(key=lambda x: x.created_at, reverse=True)
            return outputs

        if output_search_path is None:
            output_search_path = self.profiler_output_path

        return _walk_throw_data_sources(output_search_path)

    def select_reports(self):
        if self.a is None and self.b is None:
            self.a, self.b = self.select_two_reports()
        elif self.a and self.b is None:
            self.b = self.select_one_report()
            pass
        elif self.a is None and self.b:
            self.a = self.select_one_report()

        if self.a and self.b:
            self.console.print(f'Selected reports:')
            self.console.print(f'  Base:  {self.a.path}')
            self.console.print(f'  Input: {self.b.path}')
            return True
        return False

    def select_one_report(self) -> ProfilerOutput:
        def _report_validater(answers, current) -> bool:
            return len(current) == 1

        profiler_outputs = self.list_existing_outputs()

        if len(profiler_outputs) < 1:
            raise Exception("Not enough reports to compare. Please run 'piperider-cli run' first.")

        questions = [
            inquirer.Checkbox('profiler_output',
                              message="Please select a report to compare",
                              choices=profiler_outputs,
                              carousel=True,
                              validate=_report_validater,
                              limited=1,
                              )
        ]
        answers = inquirer.prompt(questions)

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

        if sys.platform == "darwin":
            # change readchar key backspace
            readchar.key.BACKSPACE = '\x7F'

        if len(profiler_outputs) < 2:
            raise Exception("Not enough reports to compare. Please run 'piperider-cli run' first.")

        questions = [
            inquirer.Checkbox('profiler_outputs',
                              message="Please select the 2 reports to compare",
                              choices=profiler_outputs,
                              carousel=True,
                              validate=_report_validater,
                              limited=2,
                              ),
        ]
        answers = inquirer.prompt(questions)
        if answers:
            return answers['profiler_outputs'][0], answers['profiler_outputs'][1]
        return None, None
