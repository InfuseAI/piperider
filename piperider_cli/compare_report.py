import os
import sys

import inquirer
import readchar
from rich.console import Console


class CompareReport(object):
    def __init__(self, profiler_output_path, a=None, b=None):
        self.profiler_output_path = profiler_output_path
        self.console = Console()
        self.a = a
        self.b = b

    def list_existing_outputs(self, output_search_path=None):
        """
        List existing profiler outputs.
        """

        def _walk_throw_tables(path):
            tables = []
            for root, dirs, files in os.walk(path):
                for file in files:
                    if file.endswith(".json") and not file.startswith("."):
                        tables.append(file)
            return tables

        def _walk_throw_data_sources(path):
            outputs = []
            for root, dirs, files in os.walk(path):
                for dir in dirs:
                    name = dir
                    if name != 'latest':
                        tables = _walk_throw_tables(os.path.join(root, dir))
                        outputs.extend([f'{name}/{table}' for table in tables])
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
            self.console.print(f'  A: {self.a}')
            self.console.print(f'  B: {self.b}')
            return True
        return False

    def select_one_report(self):
        profiler_outputs = self.list_existing_outputs()

        if len(profiler_outputs) < 1:
            raise Exception("Not enough reports to compare. Please run 'piperider-cli run' first.")

        questions = [
            inquirer.List('profiler_output',
                          message="Please select a report to compare",
                          choices=profiler_outputs,
                          carousel=True,
                          )
        ]
        answers = inquirer.prompt(questions)

        if answers:
            return answers['profiler_output']
        else:
            return None

    def select_two_reports(self):
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
