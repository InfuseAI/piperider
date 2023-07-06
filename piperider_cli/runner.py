import json
import math
import os
import shutil
import sys
import uuid
from datetime import datetime
from typing import List, Optional

from rich import box
from rich.color import Color
from rich.console import Console
from rich.pretty import Pretty
from rich.progress import BarColumn, Column, MofNCompleteColumn, Progress, TextColumn, TimeElapsedColumn
from rich.style import Style
from rich.table import Table
from sqlalchemy import inspect
from sqlalchemy.exc import NoSuchTableError

import piperider_cli.dbtutil as dbtutil
from piperider_cli import clone_directory, convert_to_tzlocal, datetime_to_str, event, \
    raise_exception_when_directory_not_writable
from piperider_cli.assertion_engine import AssertionEngine
from piperider_cli.assertion_engine.recommender import RECOMMENDED_ASSERTION_TAG
from piperider_cli.configuration import Configuration, FileSystem, ReportDirectory
from piperider_cli.datasource import DataSource
from piperider_cli.exitcode import EC_ERR_TEST_FAILED
from piperider_cli.metrics_engine import MetricEngine, MetricEventHandler
from piperider_cli.profiler import ProfileSubject, Profiler, ProfilerEventHandler
from piperider_cli.statistics import Statistics


class RunEventPayload:

    def __init__(self):
        # all fields
        self.tables = 0
        self.columns = []
        self.rows = []
        self.dbt_command = ''
        self.passed_assertions = 0
        self.failed_assertions = 0
        self.passed_dbt_testcases = 0
        self.failed_dbt_testcases = 0
        self.build_in_assertions = 0
        self.custom_assertions = 0
        self.recommended_assertions = 0

    def to_dict(self):
        return self.__dict__


class RichProfilerEventHandler(ProfilerEventHandler):

    def __init__(self, tables):
        table_width, total_width = self._get_width(tables)
        total_column = TextColumn("{task.fields[coft]}", table_column=Column(width=total_width))
        text_column = TextColumn("{task.description}", table_column=Column(width=table_width))
        bar_column = BarColumn(bar_width=80, pulse_style=Style.from_color(Color.from_rgb(244, 164, 96)))
        mofn_column = MofNCompleteColumn(table_column=Column(width=5, justify="right"))
        time_elapsed_column = TimeElapsedColumn()

        self.progress = Progress(total_column, text_column, bar_column, mofn_column, time_elapsed_column)
        self.progress_started = False
        self.tasks = {}
        self.table_total = 0
        self.table_completed = 0

    def _get_width(self, tables):
        names = ['METADATA'] + tables
        return max([len(x) for x in names]), len(str(len(names))) * 2 + 2

    def handle_run_start(self, run_result):
        self.progress.start()

    def handle_run_progress(self, run_result, total, completed):
        self.table_total = total

    def handle_run_end(self, run_result):
        self.progress.stop()

    def handle_metadata_start(self):
        self.progress.start()
        padding = ' ' * (len(str(self.table_total)) - len(str(self.table_completed)))
        coft = f'[{padding}{self.table_completed}/{self.table_total}]'
        task_id = self.progress.add_task('METADATA', total=None, coft=coft)
        self.tasks['__metadata__'] = task_id

    def handle_metadata_progress(self, total, completed):
        task_id = self.tasks['__metadata__']
        self.progress.update(task_id, completed=completed, total=total)

    def handle_metadata_end(self):
        self.progress.stop()
        task_id = self.tasks['__metadata__']
        self.progress.remove_task(task_id)

    def handle_table_start(self, table_name):
        self.progress.start()
        self.table_completed += 1
        padding = ' ' * (len(str(self.table_total)) - len(str(self.table_completed)))
        coft = f'[{padding}{self.table_completed}/{self.table_total}]'
        task_id = self.progress.add_task(table_name, total=None, coft=coft)
        self.tasks[table_name] = task_id

    def handle_table_progress(self, table_name, table_result, total, completed):
        task_id = self.tasks[table_name]
        self.progress.update(task_id, total=total, completed=completed)

    def handle_table_end(self, table_name, table_result):
        self.progress.stop()
        task_id = self.tasks[table_name]
        self.progress.remove_task(task_id)

    def handle_column_start(self, table_name, column_name):
        pass

    def handle_column_end(self, table_name, column_name, column_result):
        pass


class RichMetricEventHandler(MetricEventHandler):

    def __init__(self, metrics):
        max_metric_width, counting_width = self._get_width(metrics)
        total_column = TextColumn("{task.fields[coft]}", table_column=Column(width=counting_width))
        text_column = TextColumn("{task.description}", table_column=Column(width=max_metric_width))
        bar_column = BarColumn(bar_width=80, pulse_style=Style.from_color(Color.from_rgb(244, 164, 96)))
        mofn_column = MofNCompleteColumn(table_column=Column(width=5, justify="right"))
        time_elapsed_column = TimeElapsedColumn()

        self.progress = Progress(total_column, text_column, bar_column, mofn_column, time_elapsed_column)
        self.progress_started = False
        self.tasks = {}
        self.metric_total = 0
        self.metric_completed = 0

    @staticmethod
    def _get_width(metrics):
        return max([len(x) for x in metrics]), len(str(len(metrics))) * 2 + 2

    def handle_run_start(self):
        pass

    def handle_run_progress(self, total: int, completed: int):
        self.metric_total = total

    def handle_run_end(self):
        self.progress.stop()

    def handle_metric_start(self, metric: str):
        self.metric_completed += 1
        padding = ' ' * (len(str(self.metric_total)) - len(str(self.metric_completed)))
        coft = f'[{padding}{self.metric_completed}/{self.metric_total}]'
        task_id = self.progress.add_task(metric, total=None, coft=coft)
        self.tasks[metric] = task_id
        self.progress.start()

    def handle_metric_progress(self, metric: str, total: int, completed: int):
        if completed == 0:
            task_id = self.tasks[metric]
            self.progress.update(task_id, total=total)

    def handle_metric_end(self, metric: str):
        self.progress.stop()
        task_id = self.tasks[metric]
        self.progress.remove_task(task_id)

    def handle_param_query_start(self, metric: str, param: str):
        pass

    def handle_param_query_end(self, metric: str):
        task_id = self.tasks[metric]
        self.progress.update(task_id, advance=1)


def _filter_subject(name: str, includes: List[str], excludes: List[str]) -> bool:
    name = name.upper()
    if includes is not None:
        includes = [include.upper() for include in includes]
        if name not in includes:
            return False

    if excludes is not None:
        excludes = [exclude.upper() for exclude in excludes]
        if name in excludes:
            return False

    return True


def _execute_assertions(console: Console, engine, ds_name: str, output, profiler_result, created_at):
    # TODO: Implement running test cases based on profiling result
    assertion_engine = AssertionEngine(engine)
    assertion_engine.load_assertions(profiler_result)

    results = exceptions = []
    # Execute assertions
    if len(assertion_engine.assertions):
        console.rule('Testing')
        results, exceptions = assertion_engine.evaluate_all()
    return results, exceptions


def _show_dbt_test_result(dbt_test_results, title=None, failed_only=False):
    console = Console()
    ascii_table = Table(show_header=True, show_edge=True, header_style='bold magenta',
                        box=box.SIMPLE, title=title)
    ascii_table.add_column('Status', style='bold white')
    ascii_table.add_column('Test Subject', style='bold')
    ascii_table.add_column('Assertion', style='bold green')
    ascii_table.add_column('Message', style='bold')

    for r in dbt_test_results:
        if failed_only and r.get('status') == 'passed':
            continue
        success = True if r.get('status') == 'passed' else False
        test_name = r.get('display_name')
        table = r.get('table')
        column = r.get('column')
        target = f'[yellow]{table}[/yellow]'
        if column:
            target = f'{target}.[blue]{column}[/blue]'
        message = r.get('message')

        if success:
            ascii_table.add_row(
                '[[bold green]  OK  [/bold green]]',
                target,
                test_name,
                message
            )
        else:
            ascii_table.add_row(
                '[[bold red]FAILED[/bold red]]',
                target,
                test_name,
                message
            )

    if ascii_table.rows:
        console.print(ascii_table)


def _show_assertion_result(results, exceptions, failed_only=False, single_table=None, title=None):
    console = Console()

    def _wrap_pretty(obj):
        if obj is None:
            return '-'
        return obj if isinstance(obj, str) else Pretty(obj)

    if results:
        ascii_table = Table(show_header=True, show_edge=True, header_style='bold magenta',
                            box=box.SIMPLE, title=title)
        ascii_table.add_column('Status', style='bold white')
        ascii_table.add_column('Test Subject', style='bold')
        ascii_table.add_column('Assertion', style='bold green')
        ascii_table.add_column('Expected', style='bold')
        ascii_table.add_column('Actual', style='cyan')

        for assertion in results:
            if single_table and single_table != assertion.table:
                continue
            if failed_only and assertion.result.status():
                continue
            table = assertion.table
            column = assertion.column
            test_function = assertion.result.name
            success = assertion.result.status()
            target = f'[yellow]{table}[/yellow].[blue]{column}[/blue]' if column else f'[yellow]{table}[/yellow]'
            if success:
                ascii_table.add_row(
                    '[[bold green]  OK  [/bold green]]',
                    target,
                    test_function,
                    _wrap_pretty(assertion.result.expected),
                    _wrap_pretty(assertion.result.actual)
                )
            else:
                ascii_table.add_row(
                    '[[bold red]FAILED[/bold red]]',
                    target,
                    test_function,
                    _wrap_pretty(assertion.result.expected),
                    _wrap_pretty(assertion.result.actual)
                )
                if assertion.result.exception:
                    msg = f'[grey11 on white][purple4]{type(assertion.result.exception).__name__}[/purple4](\'{assertion.result.exception}\')[/grey11 on white]'
                    ascii_table.add_row('', '', '', msg)

        if ascii_table.rows:
            console.print(ascii_table)
    # TODO: Handle exceptions
    pass


def _transform_assertion_result(table: str, results):
    tests = []
    columns = {}
    if results is None:
        return dict(tests=tests, columns=columns)

    for r in results:
        if r.table == table:
            entry = r.to_result_entry()
            if r.column:
                if r.column not in columns:
                    columns[r.column] = []
                columns[r.column].append(entry)
            else:
                tests.append(entry)

    return dict(tests=tests, columns=columns)


def _validate_assertions(console: Console):
    assertion_engine = AssertionEngine(None)
    assertion_engine.load_all_assertions_for_validation()
    results = assertion_engine.validate_assertions()
    # if results
    for result in results:
        # result
        console.print(f'  [[bold red]FAILED[/bold red]] {result.as_user_report()}')

    if results:
        # stop runner
        return True

    # continue to run profiling
    return False


def prepare_default_output_path(filesystem: ReportDirectory, created_at, ds):
    latest_symlink_path = os.path.join(filesystem.get_output_dir(), 'latest')
    latest_source = f"{ds.name}-{convert_to_tzlocal(created_at).strftime('%Y%m%d%H%M%S')}"
    output_path = os.path.join(filesystem.get_output_dir(), latest_source)

    if not os.path.exists(output_path):
        os.makedirs(output_path, exist_ok=True)

    # Create a symlink pointing to the latest output directory
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

    return output_path


def _append_descriptions(profile_result):
    for table_v in profile_result['tables'].values():
        table_v['description'] = 'Description: N/A'
        for column_v in table_v['columns'].values():
            column_v['description'] = 'Description: N/A'


def _clean_up_profile_null_properties(table_results):
    removed = []
    for t_metric, t_metric_val in table_results.items():
        if t_metric_val is None:
            removed.append(t_metric)
        elif isinstance(t_metric_val, float) and not math.isfinite(t_metric_val):
            table_results[t_metric] = str(t_metric_val)

    for r in removed:
        del table_results[r]

    removed = []
    for col_name, props in table_results.get('columns', {}).items():
        for k, v in props.items():
            if v is None:
                removed.append(dict(col=col_name, key=k))
            elif isinstance(v, float) and not math.isfinite(v):
                table_results['columns'][col_name][k] = str(v)

    for r in removed:
        del table_results['columns'][r['col']][r['key']]


def _append_descriptions_from_assertion(profile_result):
    engine = AssertionEngine(None)
    engine.load_assertion_content()
    for table_name, table_v in engine.assertions_content.items():
        if table_name not in profile_result['tables'] or table_v is None:
            continue
        table_desc = table_v.get('description', '')
        if table_desc:
            profile_result['tables'][table_name]['description'] = f'{table_desc}'

        columns_content = table_v.get('columns') if table_v.get('columns') else {}
        for column_name, column_v in columns_content.items():
            if column_name not in profile_result['tables'][table_name]['columns'] or column_v is None:
                continue
            column_desc = column_v.get('description', '')
            if column_desc:
                profile_result['tables'][table_name]['columns'][column_name][
                    'description'] = f'{column_desc}'


def _analyse_and_log_run_event(profiled_result, assertion_results, dbt_test_results):
    tables = profiled_result.get('tables', [])
    event_payload = RunEventPayload()
    event_payload.tables = len(tables)

    # Table info
    for t in tables:
        event_payload.columns.append(profiled_result['tables'][t]['col_count'])
        # null row_count when the table is not profiled
        event_payload.rows.append(profiled_result['tables'][t].get('row_count'))

    # Count PipeRider assertions
    for r in assertion_results or []:
        if r.is_builtin:
            event_payload.build_in_assertions += 1
        else:
            event_payload.custom_assertions += 1

        if RECOMMENDED_ASSERTION_TAG in r.tags:
            event_payload.recommended_assertions += 1

        if r.result.status():
            event_payload.passed_assertions += 1
        else:
            event_payload.failed_assertions += 1

    # Count dbt-test cases
    if dbt_test_results:
        for r in dbt_test_results:
            if r.get('status') == 'passed':
                event_payload.passed_dbt_testcases += 1
            else:
                event_payload.failed_dbt_testcases += 1

    event.log_event(event_payload.to_dict(), 'run')


def decorate_with_metadata(profile_result: dict):
    from piperider_cli import __version__
    from piperider_cli.profiler.version import schema_version

    configuration = Configuration.instance()
    project_id = configuration.get_telemetry_id()

    profile_result['version'] = __version__
    profile_result['project_id'] = f'{project_id}'
    profile_result['user_id'] = f'{event._collector._user_id}'
    profile_result['metadata_version'] = schema_version()


def _check_assertion_status(assertion_results, assertion_exceptions):
    if assertion_exceptions and len(assertion_exceptions) > 0:
        return False

    if assertion_results:
        for assertion in assertion_results:
            if not assertion.result.status():
                return False

    return True


def check_dbt_manifest_compatibility(ds: DataSource, dbt_state_dir: str):
    database = ds.get_database()
    schema = ds.get_schema()

    manifest = dbtutil._get_state_manifest(dbt_state_dir)
    models = [x for x in manifest.get('nodes').values() if x.get('resource_type') in ['model']]

    # all model’s schema should be the prefix of target’s schema
    def filter_schema(model):
        model_schema = model.get('schema', '')
        return model_schema == schema or model_schema.startswith(f'{schema}_')

    filtered_models = list(filter(filter_schema, models))

    if len(models) != len(filtered_models):
        return False

    # at least one model uses the target’s database
    return len([x for x in models if x.get('database') == database])


def get_dbt_all_subjects(dbt_state_dir, options, filter_fn):
    def as_subjects(nodes):
        result = []
        for node in nodes:
            if "source" == node.get('resource_type'):
                # NOTE: In manifest.json, the source definition will include the 'identifier' field.
                #       If users do not specify an additional 'identifier' in dbt source schema,
                #       its value will be the same as the "name" field.
                name = node.get('name')
                table = node.get('identifier')  # there is no alias in the source definition
                schema = node.get('schema')
                database = node.get('database')
                ref_id = node.get("unique_id")
            else:
                name = node.get('name')
                table = node.get('alias')
                schema = node.get('schema')
                database = node.get('database')
                ref_id = node.get("unique_id")
            result.append(ProfileSubject(table, schema, database, name, ref_id))
        return result

    subjects = as_subjects(dbtutil.get_dbt_state_candidate(dbt_state_dir, options, select_for_metadata=True))
    Statistics().reset()

    tagged_subjects = as_subjects(dbtutil.get_dbt_state_candidate(dbt_state_dir, options))

    total = len(tagged_subjects)
    if not options.get('dbt_resources') and options.get('tag') is None:
        tagged_subjects = list(filter(filter_fn, tagged_subjects))
        Statistics().add_field('filter', total - len(tagged_subjects))

    return tagged_subjects, subjects


def get_dbt_profile_subjects(dbt_state_dir, options, filter_fn):
    tagged_subjects, _ = get_dbt_all_subjects(dbt_state_dir, options, filter_fn)
    return tagged_subjects


def get_dbt_state_dir(target_path, dbt_config, ds):
    if target_path is None or os.path.exists(target_path) is False:
        project_dir = dbt_config.get('projectDir')
        dbt_project = dbtutil.load_dbt_project(project_dir)
        target_path = dbt_project.get('target-path') if dbt_project.get('target-path') else 'target'
        if os.path.isabs(target_path) is False:
            parent = project_dir if os.path.isabs(project_dir) else os.path.join(FileSystem.WORKING_DIRECTORY,
                                                                                 project_dir)
            target_path = os.path.join(parent, target_path)

    if not dbtutil.is_dbt_state_ready(target_path):
        return None, f"[bold red]Error:[/bold red] No available 'manifest.json' under '{target_path}'"

    if os.environ.get('PIPERIDER_SKIP_TARGET_CHECK', None) != '1':
        if not check_dbt_manifest_compatibility(ds, target_path):
            return None, f"[bold red]Error:[/bold red] Target mismatched. Please run 'dbt compile -t {dbt_config.get('target')}' to generate the new manifest, or set the environment variable 'PIPERIDER_SKIP_TARGET_CHECK=1' to skip the check."

    return target_path, None


class Runner():
    @staticmethod
    def exec(datasource=None, table=None, output=None, skip_report=False, dbt_target_path: str = None,
             dbt_resources: Optional[dict] = None, dbt_select: tuple = None, dbt_state: str = None,
             report_dir: str = None):
        console = Console()

        raise_exception_when_directory_not_writable(output)

        configuration = Configuration.instance()
        filesystem = configuration.activate_report_directory(report_dir=report_dir)
        datasources = {}
        datasource_names = []
        for ds in configuration.dataSources:
            datasource_names.append(ds.name)
            datasources[ds.name] = ds

        if len(datasource_names) == 0:
            console.print("[bold red]Error: no datasource found[/bold red]")
            return 1

        if datasource:
            ds_name = datasource
        else:
            # if global dbt config exists, use dbt profile target
            # else use the first datasource
            ds_name = configuration.dbt.get('target') if configuration.dbt else datasource_names[0]

        if ds_name not in datasource_names:
            console.print(f"[bold red]Error: datasource '{ds_name}' doesn't exist[/bold red]")
            console.print(f"Available datasources: {', '.join(datasource_names)}")
            return 1

        ds = datasources[ds_name]

        passed, reasons = ds.validate()
        if not passed:
            console.print(f"[bold red]Error:[/bold red] The credential of '{ds.name}' is not configured.")
            for reason in reasons:
                console.print(f'    {reason}')
            console.print(
                "[bold yellow]Hint:[/bold yellow]\n  Please execute command 'piperider init' to move forward.")
            return 1

        if not datasource and configuration.dbt is None and len(datasource_names) > 1:
            console.print(
                f"[bold yellow]Warning: multiple datasources found ({', '.join(datasource_names)}), using '{ds_name}'[/bold yellow]\n")

        console.print(f'[bold dark_orange]DataSource:[/bold dark_orange] {ds.name}')
        console.rule('Validating')
        err = ds.verify_connector()
        if err:
            console.print(
                f'[[bold red]FAILED[/bold red]] Failed to load the \'{ds.type_name}\' connector.')
            raise err

        try:
            ds.verify_connection()
        except Exception as err:
            console.print(
                f'[[bold red]FAILED[/bold red]] Failed to connect the \'{ds.name}\' data source.')
            raise err
        stop_runner = _validate_assertions(console)
        if stop_runner:
            console.print('\n\n[bold red]ERROR:[/bold red] Stop profiling, please fix the syntax errors above.')
            return 1

        dbt_config = ds.args.get('dbt')
        dbt_manifest = None
        dbt_run_results = None

        if dbt_config:
            if not dbtutil.is_ready(dbt_config):
                console.log(
                    '[bold red]ERROR:[/bold red] DBT configuration is not completed, please check the config.yml')
                return sys.exit(1)
            dbt_target_path, err_msg = get_dbt_state_dir(dbt_target_path, dbt_config, ds)
            if err_msg:
                console.print(err_msg)
                return sys.exit(1)
            dbt_manifest = dbtutil.get_dbt_manifest(dbt_target_path)
            dbt_run_results = dbtutil.get_dbt_run_results(dbt_target_path)
            if dbt_select:
                # If the dbt_resources were already provided by environment variable PIPERIDER_DBT_RESOURCES, skip the dbt select
                dbt_resources = dbt_resources if dbt_resources else dbtutil.load_dbt_resources(dbt_target_path,
                                                                                               select=dbt_select,
                                                                                               state=dbt_state)
        console.print('everything is OK.')

        console.rule('Collect metadata')
        run_id = uuid.uuid4().hex
        created_at = datetime.utcnow()
        engine = ds.get_engine_by_database()

        subjects: List[ProfileSubject]
        dbt_metadata_subjects: List[ProfileSubject] = None
        dbt_test_results = None

        if dbt_config:
            if dbtutil.is_dbt_run_results_ready(dbt_target_path):
                dbt_test_results = dbtutil.get_dbt_state_tests_result(dbt_target_path, table_filter=table)

        if table:
            if len(table.split('.')) == 2:
                schema, table_name = table.split('.')
                subjects = [ProfileSubject(table_name, schema)]
            else:
                subjects = [ProfileSubject(table, ds.get_schema())]
            Statistics().add_field('total', len(subjects))
        else:
            def filter_fn(subject: ProfileSubject):
                return _filter_subject(subject.name, configuration.includes, configuration.excludes)

            if dbt_config:
                options = dict(
                    view_profile=configuration.include_views,
                    dbt_resources=dbt_resources,
                    tag=dbt_config.get('tag')
                )
                subjects, dbt_metadata_subjects = get_dbt_all_subjects(dbt_target_path, options, filter_fn)
            else:
                table_names = inspect(engine).get_table_names()
                if configuration.include_views:
                    table_names += inspect(engine).get_view_names()

                subjects = [ProfileSubject(table_name) for table_name in table_names]
                subjects = list(filter(filter_fn, subjects))

        run_result = {}

        statistics = Statistics()
        profiler = Profiler(ds, RichProfilerEventHandler([subject.name for subject in subjects]), configuration)
        try:
            profiler.collect_metadata(dbt_metadata_subjects, subjects)

            console.rule('Profile statistics')
            profiler_result = profiler.profile(subjects, metadata_subjects=dbt_metadata_subjects)
            run_result.update(profiler_result)
        except NoSuchTableError as e:
            console.print(f"[bold red]Error:[/bold red] No such table '{str(e)}'")
            return 1
        except Exception as e:
            raise Exception(f'Profiler Exception: {type(e).__name__}(\'{e}\')')

        statistics.reset()
        metrics = []
        if dbt_config:
            metrics = dbtutil.get_dbt_state_metrics(dbt_target_path, dbt_config.get('tag', 'piperider'), dbt_resources)

        console.rule('Query metrics')
        statistics.display_statistic('query', 'metric')
        if metrics:
            run_result['metrics'] = MetricEngine(
                ds,
                metrics,
                RichMetricEventHandler([m.label for m in metrics])
            ).execute()

        # TODO: refactor input unused arguments
        assertion_results, assertion_exceptions = _execute_assertions(console, engine, ds.name, output,
                                                                      profiler_result, created_at)

        run_result['tests'] = []
        if assertion_results or dbt_test_results:
            console.rule('Assertion Results')
            if dbt_test_results:
                console.rule('dbt')
                _show_dbt_test_result(dbt_test_results)
                run_result['tests'].extend(dbt_test_results)
                if assertion_results:
                    console.rule('PipeRider')
            if assertion_results:
                _show_assertion_result(assertion_results, assertion_exceptions)
                run_result['tests'].extend([r.to_result_entry() for r in assertion_results])

        if not table:
            if dbt_config:
                run_result['dbt'] = dict()
                if dbt_manifest:
                    run_result['dbt']['manifest'] = dbt_manifest
                if dbt_run_results:
                    run_result['dbt']['run_results'] = dbt_run_results

        for t in run_result['tables']:
            _clean_up_profile_null_properties(run_result['tables'][t])

        if dbt_config:
            dbtutil.append_descriptions(run_result, dbt_target_path)
        _append_descriptions_from_assertion(run_result)

        run_result['id'] = run_id
        run_result['created_at'] = datetime_to_str(created_at)
        run_result['datasource'] = dict(name=ds.name, type=ds.type_name)

        decorate_with_metadata(run_result)

        output_path = prepare_default_output_path(filesystem, created_at, ds)
        output_file = os.path.join(output_path, 'run.json')

        with open(output_file, 'w') as f:
            f.write(json.dumps(run_result, separators=(',', ':')))

        if dbt_config:
            abs_dir = os.path.abspath(dbt_target_path)
            dbt_state_files = ['manifest.json', 'run_results.json', 'index.html', 'catalog.json']
            dbt_output_dir = os.path.join(output_path, 'dbt')
            os.makedirs(dbt_output_dir, exist_ok=True)
            for file in dbt_state_files:
                abs_file_path = os.path.join(abs_dir, file)
                if not os.path.exists(abs_file_path):
                    continue
                shutil.copy2(abs_file_path, dbt_output_dir)

        if output:
            clone_directory(output_path, output)

        if skip_report:
            console.print(f'Results saved to {output if output else output_path}')

        _analyse_and_log_run_event(run_result, assertion_results, dbt_test_results)

        if not _check_assertion_status(assertion_results, assertion_exceptions):
            return EC_ERR_TEST_FAILED

        return 0
