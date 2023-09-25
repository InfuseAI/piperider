import json
import os
import shutil
import sys
from datetime import datetime
from typing import Dict, List, Optional

import inquirer
import readchar
from rich.console import Console

import piperider_cli.hack.inquirer as inquirer_hack
from piperider_cli import clone_directory, datetime_to_str, open_report_in_browser, \
    raise_exception_when_directory_not_writable, str_to_datetime
from piperider_cli.configuration import Configuration, ReportDirectory
from piperider_cli.dbt.changeset import SummaryChangeSet
from piperider_cli.dbt.utils import ChangeType
from piperider_cli.generate_report import setup_report_variables
from piperider_cli.githubutil import fetch_pr_metadata
from piperider_cli.utils import create_link, remove_link


class RunOutput(object):
    def __init__(self, path):
        self.path = path
        self.name = None
        self.created_at = None

        self.table_count = 0
        self.pass_count = 0
        self.fail_count = 0
        self.cloud = None
        self.file_size = os.path.getsize(path)

        try:
            with open(path, 'r') as f:
                run_result = json.load(f)
                self.report_id = run_result['id']
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

        def human_readable_size(size, decimal_places=2):
            for unit in ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']:
                if size < 1024.0 or unit == 'PiB':
                    break
                size /= 1024.0
            return f"{size:.{decimal_places}f} {unit}"

        return f'{self.name:12} ' \
               f'#table={self.table_count:<6} ' \
               f'#pass={self.pass_count:<5} ' \
               f'#fail={self.fail_count:<5} ' \
               f'size={human_readable_size(self.file_size):<12}' \
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
        self.metadata = {}

        self.summary_change_set: Optional[SummaryChangeSet] = None
        self._update_implicit_and_explicit_changeset()
        self._update_github_pr_info()

    def _update_implicit_and_explicit_changeset(self):
        try:
            from piperider_cli.dbt.changeset import GraphDataChangeSet
            c = GraphDataChangeSet(self._base, self._target)
            self.explicit = c.list_explicit_changes()
            self.implicit = c.list_implicit_changes()

            self.summary_change_set = SummaryChangeSet(self._base, self._target)
        except BaseException as e:
            self.warning_for_legacy_metrics(e)

            console = Console()
            console.print('[bold yellow]Warning:[/bold yellow]')
            if isinstance(e, ValueError) and e.args:
                for line in e.args[0]:
                    console.print(f'  {line}', end='\n')
            else:
                console.print(e)
            console.print('\nGot problem to generate changeset.')

    def warning_for_legacy_metrics(self, e):
        if not hasattr(e, 'MESSAGE') or getattr(e, 'MESSAGE') != 'Compilation Error':
            return

        """"
        Example for "msg":
        'model.git_repo_analytics.commit_weekly' depends on 'metric.git_repo_analytics.total_commits' which is not in the graph!
        """
        if not hasattr(e, 'msg') or "depends on" not in getattr(e, 'msg'):
            return

        from piperider_cli.error import PipeRiderError
        raise PipeRiderError("Found legacy metrics",
                             hint="The dbt_metrics package has been deprecated and replaced with MetricFlow.")

    def _update_github_pr_info(self):
        metadata = fetch_pr_metadata()
        if metadata:
            self.metadata = metadata

    def id(self):
        return self._id

    def to_json(self):
        output = dict(
            created_at=datetime_to_str(datetime.utcnow()),
            base=self._base,
            # TODO: rename input -> target in schema and result json
            input=self._target,
            implicit=self.implicit,
            explicit=self.explicit,
            metadata=self.metadata,
        )
        return json.dumps(output, separators=(',', ':'))

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

    def to_cli_stats(self, console):
        console.print()

        if self.summary_change_set is None:
            return

        console.print("Impact Summary:")

        change_set = self.summary_change_set.models.explicit_changeset
        change_set += self.summary_change_set.metrics.explicit_changeset
        change_set += self.summary_change_set.seeds.explicit_changeset
        added = [x for x in change_set if x.change_type == ChangeType.ADDED]
        removed = [x for x in change_set if x.change_type == ChangeType.REMOVED]
        modified = [x for x in change_set if x.change_type == ChangeType.MODIFIED]
        code_change = [
            f"added={len(added)}",
            f"removed={len(removed)}",
            f"modified={len(modified)}",
        ]

        potentially_impacted = [x.unique_id for x in
                                (self.summary_change_set.models.modified_with_downstream + removed)]
        impacted = [x for x in list(set(
            self.summary_change_set.models.diffs + self.summary_change_set.metrics.diffs + self.summary_change_set.seeds.diffs
        )) if x in potentially_impacted]
        assessed_no_impacted = [x for x in list(set(
            self.summary_change_set.models.no_diffs + self.summary_change_set.metrics.no_diffs + self.summary_change_set.seeds.no_diffs
        )) if x in potentially_impacted]
        impact_summary = [
            f"potentially_impacted={len(potentially_impacted)}",
            f"assessed={len(impacted) + len(assessed_no_impacted)}",
            f"skipped={len(potentially_impacted) - len(impacted) - len(assessed_no_impacted)}",
            f"impacted={len(impacted)}",
        ]

        console.print("  Code Changes: " + ", ".join(code_change))
        console.print("  Resource Impact: " + ", ".join(impact_summary))

        console.print("")


def prepare_default_output_path(filesystem: ReportDirectory, created_at):
    latest_symlink_path = os.path.join(filesystem.get_comparison_dir(), 'latest')
    comparison_path = os.path.join(filesystem.get_comparison_dir(), created_at)

    if not os.path.exists(comparison_path):
        os.makedirs(comparison_path, exist_ok=True)

    # Create a symlink pointing to the latest comparison directory
    remove_link(latest_symlink_path)

    console = Console()
    if not os.path.exists(latest_symlink_path):
        create_link(comparison_path, latest_symlink_path)
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
                for dir_name in dirs:
                    if dir_name == 'latest':
                        continue
                    run_json = os.path.join(root, dir_name, 'run.json')
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
            CloudConnector.upload_report(report.a.path, show_progress=show_progress, project_name=project_name,
                                         enable_share=enable_share)
            report.a.refresh()

        if force_upload and (report.b.cloud is None or report.b.cloud.get('project_name') != project_name):
            CloudConnector.upload_report(report.b.path, show_progress=show_progress, project_name=project_name,
                                         enable_share=enable_share)
            report.b.refresh()

        # Generate comparison report URL & summary markdown
        if report.a.cloud and report.b.cloud:
            is_temporary = report.a.cloud.get('is_temporary', False)
            if is_temporary:
                base = str(report.a.report_id)
                target = str(report.b.report_id)
                project_name = None
                pass
            else:
                base = str(report.a.cloud.get('run_id'))
                target = str(report.b.cloud.get('run_id'))
                project_name = report.a.cloud.get('project_name')
            response = CloudConnector.generate_compare_report(base, target, project_name=project_name,
                                                              is_temporary=is_temporary, debug=False)
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
            with open(filename, 'w', encoding='utf-8') as f:
                html = setup_report_variables(report_template_html, False, comparison_data.to_json())
                f.write(html)

        def output_summary(directory, summary_data):
            filename = os.path.join(directory, 'summary.md')
            with open(filename, 'w', encoding='utf-8') as f:
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

                def _is_temporary(cloud_a, cloud_b) -> bool:
                    return cloud_a.get('is_temporary', False) is False and cloud_b.get('is_temporary', False) is False

                if _is_temporary(report.a.cloud, report.b.cloud):
                    base = str(report.a.cloud.get('run_id'))
                    target = str(report.b.cloud.get('run_id'))
                    CloudConnector.share_compare_report(base, target, project_name=project_name)

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
            console.print(f"Comparison report URL: {report_url}?utm_source=cli", soft_wrap=True)

        if open_report:
            if report_url:
                open_report_in_browser(report_url, True)
            else:
                open_report_in_browser(report_path)

        if debug:
            # Write comparison data to file
            with open(os.path.join(default_report_directory, 'comparison_data.json'), 'w', encoding='utf-8') as f:
                f.write(comparison_data.to_json())
