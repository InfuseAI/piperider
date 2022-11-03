import io
import json
import os
import sys
from datetime import datetime

import inquirer
import readchar
from rich.console import Console

import piperider_cli.hack.inquirer as inquirer_hack
from piperider_cli import datetime_to_str, str_to_datetime, clone_directory, \
    raise_exception_when_directory_not_writable
from piperider_cli.filesystem import FileSystem
from piperider_cli.generate_report import setup_report_variables


class RunOutput(object):
    def __init__(self, path):
        self.path = path
        self.name = None
        self.created_at = None

        self.table_count = 0
        self.pass_count = 0
        self.fail_count = 0

        try:
            with open(path, 'r') as f:
                run_result = json.load(f)
                self.name = run_result['datasource']['name']
                self.created_at = run_result['created_at']

                tables = run_result.get('tables', {})
                self.table_count = len(tables.keys())

                for test in run_result.get('tests', []):
                    if test.get('status') == 'passed':
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


def join(base, target):
    '''
    Join base and target to a dict which

    keys = (base keys) +  (target keys)
    result[keys] = {base: {...}, target: {...}

    :param base:
    :param target:
    :return:
    '''
    if not base:
        base = dict()
    if not target:
        target = dict()
    result = dict()

    joined = target.copy()
    joined.update(base)

    for key in joined.keys():
        value = dict()
        value['base'] = base.get(key)
        value['target'] = target.get(key)
        result[key] = value
    return result


def value_with_annotation(key, annotation=None):
    annotation_str = f" ({annotation})" if annotation else ''
    return f"{key}{annotation_str}"


def value_with_change(base, target):
    if target is None:
        return ''
    elif base is None:
        return target
    elif base != target:
        return f"~~{base}~~<br/>{target}"
    else:
        return target


def value_with_delta(base, target, percentage=False):
    if target is None:
        return ''

    delta = ''
    if base is not None and target is not None:
        delta = f" ({'+' if target >= base else ''}{target - base})"
    return f"{target}{delta}"


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
        return json.dumps(output, separators=(',', ':'))

    def to_summary_markdown(self):
        base = self._base.get('tables')
        target = self._target.get('tables')

        out = io.StringIO()

        # Comparison summary
        out.write(self._render_compare_markdown(base, target))

        # Per-table summary
        out.write("<details>\n")
        out.write("<summary>Tables Summary</summary>\n")
        out.write("<blockquote>\n")
        out.write("\n")
        joined = join(base, target)
        for table_name in joined.keys():
            joined_table = joined[table_name]

            columns_b = joined_table.get('base').get('columns') if joined_table.get('base') else None
            columns_t = joined_table.get('target').get('columns') if joined_table.get('target') else None

            out.write(self._render_table_summary_markdown(table_name, columns_b, columns_t))
        out.write("</blockquote></details>")
        return out.getvalue()

    def _render_compare_markdown(self, base, target):
        out = io.StringIO()
        joined = join(base, target)
        print("Table | Rows | Columns ", file=out)
        print("--- | --- | ---", file=out)
        for table_name in joined.keys():
            joined_table = joined[table_name]
            b = joined_table.get('base')
            t = joined_table.get('target')

            annotation = None
            if b is None:
                annotation = '+'
            elif t is None:
                annotation = '-'

            rows_b, cols_b = (b.get('row_count', 0), b.get('col_count', 0)) if b else (None, None)
            rows_t, cols_t = (t.get('row_count', 0), t.get('col_count', 0)) if t else (None, None)

            out.write(f"{value_with_annotation(table_name, annotation)} | ")
            out.write(f"{value_with_delta(rows_b, rows_t)} | ")
            out.write(f"{value_with_delta(cols_b, cols_t)} \n")

        return f"""<details>
<summary>Comparison Summary</summary>

{out.getvalue()}
</details>
"""

    def _render_table_summary_markdown(self, table_name, base, target):
        out = io.StringIO()
        joined = join(base, target)
        print("Column | Type | Count", file=out)
        print("--- | --- | --- ", file=out)
        for column_name in joined.keys():
            joined_column = joined[column_name]
            b = joined_column.get('base')
            t = joined_column.get('target')

            schema_type_b, count_b = (b.get('schema_type', ''), b.get('samples', 0)) if b else (None, None)
            schema_type_t, count_t = (t.get('schema_type', ''), t.get('samples', 0)) if t else (None, None)

            annotation = None
            if b is None:
                annotation = '+'
            elif t is None:
                annotation = '-'
            elif schema_type_b != schema_type_t:
                annotation = '!'

            out.write(f"{value_with_annotation(column_name, annotation)} | ")
            out.write(f"{value_with_change(schema_type_b, schema_type_t)} | ")
            out.write(f"{value_with_delta(count_b, count_t)} \n")

        return f"""<details>
<summary>{table_name}</summary>

{out.getvalue()}
</details>
"""


def prepare_default_output_path(filesystem: FileSystem, created_at):
    latest_symlink_path = os.path.join(filesystem.get_comparison_dir(), 'latest')
    latest_source = created_at
    comparison_path = os.path.join(filesystem.get_comparison_dir(), created_at)

    if not os.path.exists(comparison_path):
        os.makedirs(comparison_path, exist_ok=True)

    # Create a symlink pointing to the latest comparison directory
    if os.path.islink(latest_symlink_path):
        os.unlink(latest_symlink_path)
    if not os.path.exists(latest_symlink_path):
        os.symlink(latest_source, latest_symlink_path)
    else:
        console = Console()
        console.print(f'[bold yellow]Warning: {latest_symlink_path} already exists[/bold yellow]')

    return comparison_path


class CompareReport(object):
    def __init__(self, profiler_output_path, a=None, b=None, datasource=None):
        self.profiler_output_path = profiler_output_path
        self.console = Console()
        self.a: RunOutput = RunOutput(a) if a else None
        self.b: RunOutput = RunOutput(b) if b else None
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
                    output = RunOutput(run_json)
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

    def select_multiple_reports(self, action='compare', limit=None):
        def _report_validater(answers, current) -> bool:
            if limit is None:
                return len(current) > 0
            else:
                return len(current) == limit

        profiler_outputs = self.list_existing_outputs()
        arrow_alias_msg = ''
        if sys.platform == "win32" or sys.platform == "cygwin":
            # change readchar key UP & DOWN by 'w' and 's'
            readchar.key.UP = 'w'
            readchar.key.DOWN = 's'
            arrow_alias_msg = " 'w' to Up, 's' to Down,"

        if limit is None:
            if len(profiler_outputs) == 0:
                raise Exception("Not enough reports to compare. Please run 'piperider run' first.")
            questions = [
                inquirer.Checkbox('profiler_output',
                                  message=f"Please select the reports to {action} ({arrow_alias_msg} SPACE to select, and ENTER to confirm )",
                                  choices=profiler_outputs,
                                  carousel=True,
                                  validate=_report_validater,
                                  )
            ]
        else:
            if len(profiler_outputs) < limit:
                raise Exception("Not enough reports to compare. Please run 'piperider run' first.")
            report_msg = 'a report' if limit == 1 else f'the {limit} reports'
            questions = [
                inquirer_hack.LimitedCheckboxQuestion('profiler_output',
                                                      message=f"Please select {report_msg} to {action} ({arrow_alias_msg} SPACE to select, and ENTER to confirm )",
                                                      choices=profiler_outputs,
                                                      carousel=True,
                                                      validate=_report_validater,
                                                      limited=limit,
                                                      )
            ]

        answers = inquirer_hack.prompt_ex(questions, raise_keyboard_interrupt=True)
        if answers:
            return answers['profiler_output']
        return None

    def select_one_report(self, action='compare') -> RunOutput:
        answers = self.select_multiple_reports(action=action, limit=1)
        if answers:
            return answers[0]
        else:
            return None

    def select_two_reports(self, action='compare') -> (RunOutput, RunOutput):
        """
        Select multiple files from a list of files.
        """

        answers = self.select_multiple_reports(action=action, limit=2)
        if answers:
            return answers[0], answers[1]
        return None, None

    def generate_data(self) -> ComparisonData:
        if self.a is None or self.b is None:
            raise Exception("Please select reports to compare first.")

        return ComparisonData(self.a.load(), self.b.load())

    @staticmethod
    def exec(*, a=None, b=None, last=None, datasource=None, report_dir=None, output=None, debug=False):
        console = Console()

        filesystem = FileSystem(report_dir=report_dir)
        raise_exception_when_directory_not_writable(output)

        report = CompareReport(filesystem.get_output_dir(), a, b, datasource=datasource)
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
                html = setup_report_variables(report_template_html, False, comparison_data.to_json())
                f.write(html)

        def output_summary(directory):
            filename = os.path.join(directory, 'summary.md')
            with open(filename, 'w') as f:
                f.write(comparison_data.to_summary_markdown())

        data_id = comparison_data.id()
        default_report_directory = prepare_default_output_path(filesystem, data_id)
        output_report(default_report_directory)
        output_summary(default_report_directory)
        report_path = os.path.join(filesystem.get_comparison_dir(), 'latest', 'index.html')

        if output:
            clone_directory(default_report_directory, output)
            report_path = os.path.join(output, 'index.html')

        console.print()
        console.print(f"Comparison report: {report_path}")

        if debug:
            # Write comparison data to file
            with open(os.path.join(default_report_directory, 'comparison_data.json'), 'w') as f:
                f.write(comparison_data.to_json())
