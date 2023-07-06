import io
import json
import os
import shutil
import sys
from datetime import date, datetime
from typing import Dict, List, Optional

import inquirer
import readchar
from rich.console import Console

import piperider_cli.hack.inquirer as inquirer_hack
from piperider_cli import clone_directory, datetime_to_str, open_report_in_browser, \
    raise_exception_when_directory_not_writable, str_to_datetime
from piperider_cli.configuration import Configuration, ReportDirectory
from piperider_cli.generate_report import setup_report_variables
from piperider_cli.dbt.changeset import SummaryChangeSet
from piperider_cli.dbt.utils import ChangeType


class RunOutput(object):
    def __init__(self, path):
        self.path = path
        self.name = None
        self.created_at = None

        self.table_count = 0
        self.pass_count = 0
        self.fail_count = 0
        self.cloud = None

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
                self.cloud = run_result.get('cloud')
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

    def refresh(self):
        self.__init__(self.path)

    def __str__(self):
        created_at_str = datetime_to_str(str_to_datetime(self.created_at),
                                         to_tzlocal=True)

        return f'{self.name:12} ' \
               f'#table={self.table_count:<6} ' \
               f'#pass={self.pass_count:<5} ' \
               f'#fail={self.fail_count:<5} ' \
               f'{created_at_str}'


def _merge_keys(base: List[str], target: List[str]):
    '''
    Merge keys from base, target tables. Unlike default union, it preserves the order for column rename, added, removed.

    :param base: keys for base table
    :param target: keys for base table
    :return: merged keys
    '''

    result = []
    while base and target:
        if base[0] == target[0]:
            result.append(base[0])
            base.pop(0)
            target.pop(0)
        elif base[0] in target:
            idx = target.index(base[0])
            for i in target[0:idx]:
                if i not in result:
                    result.append(i)
            result.append(base[0])
            base.pop(0)
            target = target[idx + 1:]
        else:
            result.append(base[0])
            base.pop(0)

    for c in base:
        if c not in result:
            result.append(c)

    for c in target:
        if c not in result:
            result.append(c)

    return result


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

    keys = _merge_keys(list(base.keys()), list(target.keys()))
    result = dict()
    for key in keys:
        value = dict()
        value['base'] = base.get(key)
        value['target'] = target.get(key)
        result[key] = value
    return result


class ComparisonData(object):
    STATE_ADD = 0
    STATE_DEL = 1
    STATE_MOD = 2

    def __init__(self, base: Dict, target: Dict, tables_from):
        self._id = datetime.now().strftime("%Y%m%d%H%M%S")

        if tables_from == 'target-only':
            target_run_tables = target.get('tables', {}).keys()
            target_run_metrics = {metric.get('name') for metric in target.get('metrics', [])}
            target_run_tests = {test.get('id') for test in target.get('tests', [])}

            base['tables'] = {table_name: base['tables'][table_name] for table_name in base['tables'] if
                              table_name in target_run_tables}
            if 'metrics' in base:
                base['metrics'] = [metric for metric in base['metrics'] if metric.get('name') in target_run_metrics]

            if 'tests' in base:
                base['tests'] = [test for test in base['tests'] if test.get('id') in target_run_tests]
        elif tables_from == 'base-only':
            base_run_tables = base.get('tables', {}).keys()
            base_run_metrics = {metric.get('name') for metric in base.get('metrics', [])}
            base_run_tests = {test.get('id') for test in base.get('tests', [])}

            target['tables'] = {table_name: target['tables'][table_name] for table_name in target['tables'] if
                                table_name in base_run_tables}
            if 'metrics' in target:
                target['metrics'] = [metric for metric in target['metrics'] if metric.get('name') in base_run_metrics]

            if 'tests' in target:
                target['tests'] = [test for test in target['tests'] if test.get('id') in base_run_tests]

        self._base = base
        self._target = target

        self.implicit = []
        self.explicit = []

        self.summary_change_set: Optional[SummaryChangeSet] = None
        self._update_implicit_and_explicit_changeset()

    def _update_implicit_and_explicit_changeset(self):
        try:
            from piperider_cli.dbt.changeset import GraphDataChangeSet
            c = GraphDataChangeSet(self._base, self._target)
            self.explicit = c.list_explicit_changes()
            self.implicit = c.list_implicit_changes()

            self.summary_change_set = SummaryChangeSet(self._base, self._target)
        except BaseException as e:
            console = Console()
            console.print(
                f'[bold yellow]Warning:[/bold yellow] {e}. Got problem to generate changeset.')

    def id(self):
        return self._id

    def to_json(self):
        output = dict(
            created_at=datetime_to_str(datetime.utcnow()),
            base=self._base,
            # TODO: rename input -> target in schema and result json
            input=self._target,
            implicit=self.implicit,
            explicit=self.explicit
        )
        return json.dumps(output, separators=(',', ':'))

    def to_summary_markdown(self):
        out = io.StringIO()

        # Comparison summary
        out.write(self._render_compare_markdown())

        # Per-table Comparison
        base = self._base.get('tables')
        target = self._target.get('tables')

        states = {}
        per_table_out = io.StringIO()
        joined = join(base, target)
        for table_name in joined.keys():
            joined_table = joined[table_name]

            columns_b = joined_table.get('base').get('columns') if joined_table.get('base') else None
            columns_t = joined_table.get('target').get('columns') if joined_table.get('target') else None

            state, result = self._render_table_summary_markdown(table_name, columns_b, columns_t)
            if state == self.STATE_ADD:
                if states.get('added') is None:
                    states['added'] = 0
                states['added'] += 1
            elif state == self.STATE_DEL:
                if states.get('deleted') is None:
                    states['deleted'] = 0
                states['deleted'] += 1
            elif state == self.STATE_MOD:
                if states.get('schema changed') is None:
                    states['schema changed'] = 0
                states['schema changed'] += 1
            per_table_out.write(result)

        # Per-table summary
        states = sorted(states.items())
        table_summary_hint = ', '.join([f'{state}={num}' for state, num in states])
        if table_summary_hint:
            table_summary_hint = f' ({table_summary_hint})'

        out.write("<details>\n")
        out.write(f"<summary>Tables Summary{table_summary_hint}</summary>\n")
        out.write("<blockquote>\n")
        out.write("\n")
        out.write(per_table_out.getvalue())
        out.write("</blockquote></details>")

        base = self._base.get('metrics', [])
        target = self._target.get('metrics', [])
        out.write(self._render_metrics_comparison_markdown(base, target))

        return out.getvalue()

    def to_summary_markdown_ng(self):
        if self._base.get('dbt') is None or self._target.get('dbt') is None:
            console = Console()
            console.print("[bold yellow]Warning: [/bold yellow]'summary.md' report is not generated.")
            console.print("To generate a summary.md file, please run the 'piperider run' command in a dbt project "
                          "and use the latest version of piperider.")
            return ""

        # TODO replace to new generator
        if self.summary_change_set:
            return self.summary_change_set.generate_markdown()

        return ""

    @staticmethod
    def _value_with_annotation(key, annotation=None):
        annotation_str = f" ({annotation})" if annotation else ''
        return f"{key}{annotation_str}"

    @staticmethod
    def _value_with_change(base, target):
        if target is None:
            return f"~~{base}~~"
        elif base is None:
            return target
        elif base != target:
            return f"~~{base}~~<br/>{target}"
        else:
            return target

    @staticmethod
    def _value_with_delta(base, target, percentage=False):
        if target is None:
            return '-'

        annotation = '%' if percentage else ''
        delta = ''
        if base is not None:
            diff = target - base
            if percentage:
                diff *= 100
            delta = f" ({'+' if target >= base else ''}{round(diff, 2)}{annotation})"

        if percentage:
            target = round(target * 100, 2)

        return f"{target}{annotation}{delta}"

    @staticmethod
    def _display_metrics_delta(b_value, t_value):
        if b_value == '' or t_value == '':
            return ''
        elif isinstance(b_value, str) and b_value.startswith('~~'):
            return ''
        elif isinstance(t_value, str) and t_value.startswith('~~'):
            return ''
        elif b_value == t_value:
            return '-'
        b_value = 0 if b_value == '-' else b_value
        t_value = 0 if t_value == '-' else t_value
        delta = t_value - b_value

        return f"{'+' if delta >= 0 else ''}{delta}"

    @staticmethod
    def _get_column_changed(base, target):
        columns_b = base.get('columns') if base else None
        columns_t = target.get('columns') if target else None
        joined = join(columns_b, columns_t)
        added = 0
        deleted = 0
        changed = 0

        for column_name in joined.keys():
            joined_column = joined[column_name]
            b = joined_column.get('base')
            t = joined_column.get('target')

            schema_type_b = b.get('schema_type') if b else None
            schema_type_t = t.get('schema_type') if t else None

            if b is None:
                added += 1
            elif t is None:
                deleted += 1
            elif schema_type_b != schema_type_t:
                changed += 1

        return {
            'added': added,
            'deleted': deleted,
            'changed': changed,
        }

    def _render_compare_markdown(self):
        base = self._base.get('tables')
        target = self._target.get('tables')

        out = io.StringIO()
        joined = join(base, target)
        print("Table | Rows | Columns ", file=out)
        print("--- | --- | ---", file=out)
        for table_name in joined.keys():
            joined_table = joined[table_name]
            b = joined_table.get('base')
            t = joined_table.get('target')

            annotation = None
            change_message_str = ''

            if b is None:
                annotation = '+'
            elif t is None:
                annotation = '-'
            else:
                column_changed = self._get_column_changed(b, t)
                messages = []

                if column_changed['added'] > 0:
                    annotation = '!'
                    messages.append(f"added={column_changed['added']}")
                if column_changed['deleted'] > 0:
                    annotation = '!'
                    messages.append(f"deleted={column_changed['deleted']}")
                if column_changed['changed'] > 0:
                    annotation = '!'
                    messages.append(f"changed={column_changed['changed']}")

                if messages:
                    change_message_str = ', '.join(messages)
                    change_message_str = f"<br/>({change_message_str})"

            rows_b, cols_b = (b.get('row_count'), b.get('col_count')) if b else (None, None)
            rows_t, cols_t = (t.get('row_count'), t.get('col_count')) if t else (None, None)

            out.write(f"{self._value_with_annotation(table_name, annotation)} | ")
            out.write(f"{self._value_with_delta(rows_b, rows_t)} | ")
            out.write(f"{self._value_with_delta(cols_b, cols_t)}{change_message_str} \n")

        base = self._base.get('metrics', [])
        target = self._target.get('metrics', [])
        base_metrics = {base_metric.get('name'): base_metric for base_metric in base}
        target_metrics = {target_metric.get('name'): target_metric for target_metric in target}

        joined = join(base_metrics, target_metrics)
        out_metrics = io.StringIO()
        if joined:
            def _display_period_annotation(period_grain):
                if period_grain == 'day':
                    return '(Yesterday)'
                else:
                    return f'(Last {period_grain})'

            print("Metric | Period | Base | Target | +/- ", file=out_metrics)
            print("--- | --- | :-: | :-: | :-: ", file=out_metrics)
            for metric_name in joined.keys():
                joined_metric = joined[metric_name]
                b = joined_metric.get('base')
                t = joined_metric.get('target')
                b_data = {}
                t_data = {}
                if b:
                    grain = b.get('grain')
                    metric_label = b.get('label')
                    b_data = {row[0]: row[1] for row in b.get('data')}
                if t:
                    grain = t.get('grain')
                    metric_label = t.get('label')
                    t_data = {row[0]: row[1] for row in t.get('data')}

                t_dates = t_data.keys() if t_data.keys() else b_data.keys()
                t_dates = sorted(list(t_dates), key=lambda k: date.fromisoformat(k), reverse=True)
                t_last_date = t_dates[1]

                if t_last_date not in b_data:
                    b_result = ''
                else:
                    b_result = b_data.get(t_last_date) if b_data.get(t_last_date) is not None else '-'

                if t_last_date not in t_data:
                    t_result = ''
                else:
                    t_result = t_data.get(t_last_date) if t_data.get(t_last_date) is not None else '-'

                out_metrics.write(f"{metric_label} | {t_last_date} {_display_period_annotation(grain)} | ")
                out_metrics.write(f"{b_result} | {t_result} | {self._display_metrics_delta(b_result, t_result)} \n ")

        return f"""<details>
<summary>Comparison Summary</summary>

{out.getvalue()}
{out_metrics.getvalue()}
</details>
"""

    def _render_table_summary_markdown(self, table_name, base, target):
        out = io.StringIO()
        joined = join(base, target)
        print("Column | Type | Valid % | Distinct %", file=out)
        print("--- | --- | --- | ---", file=out)
        table_modified = False
        for column_name in joined.keys():
            joined_column = joined[column_name]
            b = joined_column.get('base')
            t = joined_column.get('target')

            schema_type_b = self._get_metric_from_report(b, 'schema_type', None)
            valids_p_b = self._get_metric_from_report(b, 'valids_p', None)
            distinct_p_b = self._get_metric_from_report(b, 'distinct_p', None)

            schema_type_t = self._get_metric_from_report(t, 'schema_type', None)
            valids_p_t = self._get_metric_from_report(t, 'valids_p', None)
            distinct_p_t = self._get_metric_from_report(t, 'distinct_p', None)

            annotation = None
            if b is None:
                annotation = '+'
                table_modified = True
            elif t is None:
                annotation = '-'
                table_modified = True
            elif schema_type_b != schema_type_t:
                annotation = '!'
                table_modified = True

            out.write(f"{self._value_with_annotation(column_name, annotation)} | ")
            out.write(f"{self._value_with_change(schema_type_b, schema_type_t)} | ")
            out.write(f"{self._value_with_delta(valids_p_b, valids_p_t, percentage=True)} | ")
            out.write(f"{self._value_with_delta(distinct_p_b, distinct_p_t, percentage=True)} \n")

        annotation = ''
        state = None
        if base is None:
            annotation = ' (+)'
            state = self.STATE_ADD
        elif target is None:
            annotation = ' (-)'
            state = self.STATE_DEL
        elif table_modified:
            annotation = ' (!)'
            state = self.STATE_MOD

        return state, f"""<details>
<summary>{table_name}{annotation}</summary>

{out.getvalue()}
</details>
"""

    @staticmethod
    def _get_metric_from_report(report, metric, default):
        return report.get(metric, default) if report else default

    def _render_metrics_comparison_markdown(self, base, target):
        out = io.StringIO()

        base_metrics = {base_metric.get('name'): base_metric for base_metric in base}
        target_metrics = {target_metric.get('name'): target_metric for target_metric in target}
        joined = join(base_metrics, target_metrics)
        if joined:
            out_metrics = io.StringIO()
            states = {}
            for metric_name in joined.keys():
                notation = ''
                metric_warn = False
                joined_metric = joined[metric_name]
                b = joined_metric.get('base')
                t = joined_metric.get('target')
                date_grain = 'date'
                b_data = {}
                t_data = {}
                if b:
                    date_grain = b.get('headers')[0]
                    date_grain = date_grain[0].upper() + date_grain[1:]
                    metric_label = b.get('label')
                    b_data = {row[0]: row[1] for row in b.get('data')}
                else:
                    notation = '(+)'
                    if states.get('added') is None:
                        states['added'] = 0
                    states['added'] += 1
                if t:
                    date_grain = t.get('headers')[0]
                    date_grain = date_grain[0].upper() + date_grain[1:]
                    metric_label = t.get('label')
                    t_data = {row[0]: row[1] for row in t.get('data')}
                else:
                    notation = '(-)'
                    if states.get('deleted') is None:
                        states['deleted'] = 0
                    states['deleted'] += 1

                b_dates = b_data.keys() if b_data.keys() else t_data.keys()
                b_dates = sorted(list(b_dates), key=lambda k: date.fromisoformat(k), reverse=True)
                b_latest_date = b_dates[0]
                t_dates = t_data.keys() if t_data.keys() else b_data.keys()
                t_dates = sorted(list(t_dates), key=lambda k: date.fromisoformat(k), reverse=True)
                t_latest_date = t_dates[0]

                out_metric = io.StringIO()
                for d in t_dates:
                    if d not in b_data:
                        b_result = ''
                    else:
                        b_result = b_data.get(d) if b_data.get(d) is not None else '-'
                        if date.fromisoformat(d) == date.fromisoformat(b_latest_date):
                            b_result = f'~~{b_data.get(d)}~~' if b_data.get(d) is not None else '-'

                    if d not in t_data:
                        t_result = ''
                    else:
                        t_result = t_data.get(d) if t_data.get(d) is not None else '-'
                        if date.fromisoformat(d) == date.fromisoformat(t_latest_date):
                            t_result = f'~~{t_data.get(d)}~~' if t_data.get(d) is not None else '-'

                    if date.fromisoformat(t_latest_date) >= date.fromisoformat(d) >= date.fromisoformat(b_latest_date):
                        delta = ''
                    else:
                        delta = self._display_metrics_delta(b_result, t_result)
                        if delta != '-' and delta != '':
                            metric_warn = True
                    out_metric.write(f"{d} | {b_result} | {t_result} | {delta}\n")

                if metric_warn:
                    notation = '(!)'
                    if states.get('metric changed') is None:
                        states['metric changed'] = 0
                    states['metric changed'] += 1

                out_metrics.write("<details>\n")
                out_metrics.write(f"<summary>{metric_label} {notation}</summary>\n\n")
                if not t:
                    out_metrics.write("Metric is not available in target\n")
                else:
                    out_metrics.write(f"{date_grain} | Base | Target | -/+ \n")
                    out_metrics.write(":-: | :-: | :-: | :-: \n")
                    out_metrics.write(out_metric.getvalue())
                out_metrics.write("</details>\n")

            states = sorted(states.items())
            metrics_summary_hint = ', '.join([f'{state}={num}' for state, num in states])
            if metrics_summary_hint:
                metrics_summary_hint = f' ({metrics_summary_hint})'
            out.write("<details>\n")
            out.write(f"<summary>Metrics Summary{metrics_summary_hint}</summary>\n")
            out.write("<blockquote>\n\n")
            out.write(out_metrics.getvalue())
            out.write("</blockquote></details>")

        return out.getvalue()

    def to_cli_stats(self, console):
        console.print()

        if self.summary_change_set is None:
            return

        console.print("Statistics:")

        for d in [self.summary_change_set.models, self.summary_change_set.metrics]:
            output = [f"  {d.resource_type}: total={d.total}, explict={d.explicit_changes}",
                      f"(added={len([x for x in d.explicit_changeset if x.change_type == ChangeType.ADDED])}, "
                      f"removed={len([x for x in d.explicit_changeset if x.change_type == ChangeType.REMOVED])}, "
                      f"modified={len([x for x in d.explicit_changeset if x.change_type == ChangeType.MODIFIED])}), ",
                      f"impacted={d.impacted}, implicit={d.implicit_changes}"]

            console.print("".join(output))

        console.print("")


def prepare_default_output_path(filesystem: ReportDirectory, created_at):
    latest_symlink_path = os.path.join(filesystem.get_comparison_dir(), 'latest')
    latest_source = created_at
    comparison_path = os.path.join(filesystem.get_comparison_dir(), created_at)

    if not os.path.exists(comparison_path):
        os.makedirs(comparison_path, exist_ok=True)

    # Create a symlink pointing to the latest comparison directory
    if os.path.islink(latest_symlink_path):
        os.unlink(latest_symlink_path)

    console = Console()
    if not os.path.exists(latest_symlink_path):
        try:
            os.symlink(latest_source, latest_symlink_path)
        except OSError as e:
            """
            System Error Codes:
                ERROR_PRIVILEGE_NOT_HELD
                1314 (0x522)
                A required privilege is not held by the client.
                https://learn.microsoft.com/en-us/windows/win32/debug/system-error-codes--1300-1699-
            """
            if e.winerror is not None and e.winerror == 1314:
                console.print(
                    f'[bold yellow]Warning:[/bold yellow] {e}. To solve this, run piperider as an administrator')
            else:
                raise e
    else:
        console.print(f'[bold yellow]Warning: {latest_symlink_path} already exists[/bold yellow]')

    return comparison_path


class CompareReport(object):
    def __init__(self, profiler_output_path, a=None, b=None, datasource=None, profiler_outputs=None):
        self.profiler_output_path = profiler_output_path
        self.profiler_outputs = profiler_outputs
        self.console = Console()
        self.a: RunOutput = RunOutput(a) if a else None
        self.b: RunOutput = RunOutput(b) if b else None
        self.datasource = datasource

    def list_existing_outputs(self, output_search_path=None) -> List[RunOutput]:
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

    def select_reports(self, use_last_two=None, reverse=False):
        if use_last_two:
            first, second = self.get_the_last_two_reports()
            if reverse:
                self.a, self.b = second, first
            else:
                self.a, self.b = first, second
        elif self.a is None and self.b is None:
            self.a, self.b = self.select_two_reports()
        elif self.a and self.b is None:
            self.b = self.select_one_report()
            pass
        elif self.a is None and self.b:
            self.a = self.select_one_report()

        if self.a and self.b:
            self.console.print('Selected reports:')
            self.console.print(f'  Base:   {self.a.path}', soft_wrap=True)
            self.console.print(f'  Target: {self.b.path}', soft_wrap=True)
            return True
        return False

    def select_multiple_reports(self, action='compare', limit=None):
        def _report_validater(answers, current) -> bool:
            if limit is None:
                return len(current) > 0
            else:
                return len(current) == limit

        profiler_outputs = self.profiler_outputs if self.profiler_outputs is not None else self.list_existing_outputs()
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

    def generate_data(self, tables_from: str) -> ComparisonData:
        if self.a is None or self.b is None:
            raise Exception("Please select reports to compare first.")

        return ComparisonData(self.a.load(), self.b.load(), tables_from)

    @staticmethod
    def exec(*, a=None, b=None, last=None, datasource=None, report_dir=None, output=None, tables_from='all',
             summary_file=None, force_upload=False, enable_share=False, open_report=False, project_name: str = None,
             debug=False, show_progress=False, reverse_last=False):
        console = Console()
        console.rule('Comparison report', style='bold blue')

        filesystem = Configuration.instance().activate_report_directory(report_dir=report_dir)
        raise_exception_when_directory_not_writable(output)

        report = CompareReport(filesystem.get_output_dir(), a, b, datasource=datasource)
        if not report.select_reports(use_last_two=last, reverse=reverse_last):
            raise Exception('No valid reports found')

        from piperider_cli.cloud_connector import CloudConnector
        report_url = None
        summary_data = None

        if force_upload and (report.a.cloud is None or report.a.cloud.get('project_name') != project_name):
            CloudConnector.upload_report(report.a.path, show_progress=show_progress, project_name=project_name)
            report.a.refresh()

        if force_upload and (report.b.cloud is None or report.b.cloud.get('project_name') != project_name):
            CloudConnector.upload_report(report.b.path, show_progress=show_progress, project_name=project_name)
            report.b.refresh()

        # Generate comparison report URL & summary markdown
        if report.a.cloud and report.b.cloud:
            base = str(report.a.cloud.get('run_id'))
            target = str(report.b.cloud.get('run_id'))
            project_name = report.a.cloud.get('project_name')
            response = CloudConnector.generate_compare_report(base, target, project_name=project_name, debug=False)
            if response:
                report_url = response.get('url')
                summary_data = response.get('summary')

        comparison_data = report.generate_data(tables_from)

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

        def output_summary(directory, summary_data):
            filename = os.path.join(directory, 'summary.md')
            with open(filename, 'w') as f:
                f.write(summary_data)

        data_id = comparison_data.id()
        summary_data = summary_data if summary_data else comparison_data.to_summary_markdown_ng()

        default_report_directory = prepare_default_output_path(filesystem, data_id)
        output_report(default_report_directory)
        if summary_data:
            output_summary(default_report_directory, summary_data)

        comparison_dir = filesystem.get_comparison_dir()
        report_path = os.path.join(comparison_dir, 'latest', 'index.html')
        summary_md_path = os.path.join(comparison_dir, 'latest', 'summary.md')
        if not os.path.exists(os.path.join(comparison_dir, 'latest')):
            report_path = os.path.join(default_report_directory, 'index.html')
            summary_md_path = os.path.join(default_report_directory, 'summary.md')

        if enable_share:
            if report.a.cloud is None or report.b.cloud is None:
                console.print(
                    '[[bold yellow]Skip[/bold yellow]] Please enable cloud auto upload or use "piperider compare --upload" to upload reports to cloud first.')
            else:
                from piperider_cli.cloud_connector import CloudConnector
                base = str(report.a.cloud.get('run_id'))
                target = str(report.b.cloud.get('run_id'))
                CloudConnector.share_compare_report(base, target)

        if output:
            clone_directory(default_report_directory, output)
            report_path = os.path.abspath(os.path.join(output, 'index.html'))
            summary_md_path = os.path.abspath(os.path.join(output, 'summary.md'))

        if summary_file:
            summary_file = os.path.abspath(summary_file)
            summary_dir = os.path.dirname(summary_file)
            if summary_dir:
                os.makedirs(summary_dir, exist_ok=True)
            shutil.copyfile(summary_md_path, summary_file)
            summary_md_path = summary_file

        comparison_data.to_cli_stats(console)
        console.print()
        console.print(f"Comparison report: {report_path}")
        if summary_data:
            console.print(f"Comparison summary: {summary_md_path}")
        if report_url:
            console.print(f"Comparison report URL: {report_url}", soft_wrap=True)

        if open_report:
            if report_url:
                open_report_in_browser(report_url, True)
            else:
                open_report_in_browser(report_path)

        if debug:
            # Write comparison data to file
            with open(os.path.join(default_report_directory, 'comparison_data.json'), 'w') as f:
                f.write(comparison_data.to_json())
