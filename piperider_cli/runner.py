import hashlib
import json
import math
import os
import shlex
import shutil
import subprocess
import sys
import uuid
from datetime import datetime
from enum import Enum
from typing import List, Optional

from rich import box
from rich.color import Color
from rich.console import Console
from rich.progress import BarColumn, Column, MofNCompleteColumn, Progress, TextColumn, TimeElapsedColumn
from rich.style import Style
from rich.table import Table
from sqlalchemy import inspect
from sqlalchemy.exc import NoSuchTableError

import piperider_cli.dbtutil as dbtutil
from piperider_cli import clone_directory, convert_to_tzlocal, datetime_to_str, event, \
    raise_exception_when_directory_not_writable
from piperider_cli.configuration import Configuration, FileSystem, ReportDirectory
from piperider_cli.datasource import DataSource
from piperider_cli.datasource.unsupported import UnsupportedDataSource
from piperider_cli.error import PipeRiderInvalidDataSourceError, PipeRiderError, PipeRiderConnectorUnsupportedError
from piperider_cli.event.events import RunEventPayload
from piperider_cli.exitcode import EC_WARN_NO_PROFILED_MODULES
from piperider_cli.metrics_engine import MetricEngine, MetricEventHandler
from piperider_cli.profiler import ProfileSubject, Profiler, ProfilerEventHandler
from piperider_cli.statistics import Statistics
from piperider_cli.utils import create_link, remove_link


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

    def handle_manifest_start(self):
        self.progress.start()
        padding = ' ' * (len(str(self.table_total)) - len(str(self.table_completed)))
        coft = f'[{padding}{self.table_completed}/{self.table_total}]'
        task_id = self.progress.add_task('DBT Manifest', total=None, coft=coft)
        self.tasks['__manifest__'] = task_id
        pass

    def handle_manifest_progress(self, total, completed):
        task_id = self.tasks['__manifest__']
        self.progress.update(task_id, completed=completed, total=total)
        pass

    def handle_manifest_end(self):
        self.progress.stop()
        task_id = self.tasks['__manifest__']
        self.progress.remove_task(task_id)
        pass

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


class PreRunValidatingResult(Enum):
    OK = 0
    ERROR = 1
    FAILED_TO_LOAD_CONNECTOR = 2
    FAILED_TO_CONNECT_DATASOURCE = 3


def _pre_run_validating(ds: DataSource) -> (PreRunValidatingResult, Exception):
    err = ds.verify_connector()
    if err:
        return PreRunValidatingResult.FAILED_TO_LOAD_CONNECTOR, err

    try:
        ds.verify_connection()
    except Exception as err:
        return PreRunValidatingResult.FAILED_TO_CONNECT_DATASOURCE, err

    return PreRunValidatingResult.OK, None


def prepare_default_output_path(filesystem: ReportDirectory, created_at, ds):
    latest_symlink_path = os.path.join(filesystem.get_output_dir(), 'latest')
    latest_source = f"{ds.name}-{convert_to_tzlocal(created_at).strftime('%Y%m%d%H%M%S')}"
    output_path = os.path.join(filesystem.get_output_dir(), latest_source)

    if not os.path.exists(output_path):
        os.makedirs(output_path, exist_ok=True)

    # Create a symlink pointing to the latest output directory
    remove_link(latest_symlink_path)

    console = Console()
    if not os.path.exists(latest_symlink_path):
        create_link(output_path, latest_symlink_path)
    else:
        console.print(f'[bold yellow]Warning: {latest_symlink_path} already exists[/bold yellow]')

    return output_path


def _append_descriptions(profile_result):
    for table_v in profile_result['tables'].values():
        table_v['description'] = 'Description: N/A'
        for column_v in table_v['columns'].values():
            column_v['description'] = 'Description: N/A'


def _clean_up_profile_null_properties(table_results):
    if not table_results:
        return

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


def _analyse_run_event(event_payload: RunEventPayload, profiled_result, dbt_test_results):
    tables = profiled_result.get('tables', [])
    tables = {k: v for k, v in tables.items() if v}
    event_payload.tables = len(tables)

    # Table info
    for t in tables:
        table = profiled_result['tables'][t]
        # null col_count when the metadata is not available
        event_payload.columns.append(table.get('col_count'))
        # null row_count when the table is not profiled
        event_payload.rows.append(table.get('row_count'))

    # Count dbt-test cases
    if dbt_test_results:
        for r in dbt_test_results:
            if r.get('status') == 'passed':
                event_payload.passed_dbt_testcases += 1
            else:
                event_payload.failed_dbt_testcases += 1


def decorate_with_metadata(profile_result: dict):
    from piperider_cli import __version__
    from piperider_cli.profiler.version import schema_version

    configuration = Configuration.instance()
    project_id = configuration.get_telemetry_id()

    profile_result['version'] = __version__
    profile_result['project_id'] = f'{project_id}'
    profile_result['user_id'] = f'{event._collector._user_id}'
    profile_result['metadata_version'] = schema_version()


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


def get_dbt_state_dir(target_path, dbt_config, ds, skip_datasource_connection=False):
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

    if os.environ.get('PIPERIDER_SKIP_TARGET_CHECK', None) != '1' and skip_datasource_connection is False:
        if not check_dbt_manifest_compatibility(ds, target_path):
            return None, f"[bold red]Error:[/bold red] Target mismatched. Please run 'dbt compile -t {dbt_config.get('target')}' to generate the new manifest, or set the environment variable 'PIPERIDER_SKIP_TARGET_CHECK=1' to skip the check."

    return target_path, None


def get_git_branch():
    # NOTE: Provide git branch information directly for the archived dbt project without .git folder
    git_branch = os.environ.get('PIPERIDER_GIT_BRANCH', None)
    git_sha = os.environ.get('PIPERIDER_GIT_SHA', None)
    # there's no git branch information when comparing to tag or commit
    if git_branch is not None or git_sha is not None:
        return git_branch, git_sha

    def _exec(command_line: str):
        cmd = shlex.split(command_line)
        proc = None
        try:
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=FileSystem.WORKING_DIRECTORY,
            )
            outs, errs = proc.communicate()
        except BaseException:
            if proc:
                proc.kill()
                outs, errs = proc.communicate()
            else:
                return ''

        if outs is not None:
            outs = outs.decode().strip()
        return outs

    git_branch = _exec('git branch --show-current')
    try:
        line = _exec(f'git log {git_branch} --pretty=oneline -n 1')
        git_sha = line.split(' ')[0]
    except BaseException:
        git_sha = ''
    return git_branch, git_sha


class Runner:
    @staticmethod
    def exec(datasource=None, table=None, output=None, skip_report=False, dbt_target_path: str = None,
             dbt_resources: Optional[dict] = None, dbt_profile: str = None, dbt_target: str = None,
             dbt_select: tuple = None, dbt_state: str = None,
             report_dir: str = None, skip_datasource_connection: bool = False, event_payload=RunEventPayload()):
        console = Console()

        raise_exception_when_directory_not_writable(output)

        configuration = Configuration.instance(dbt_profile=dbt_profile, dbt_target=dbt_target)
        filesystem = configuration.activate_report_directory(report_dir=report_dir)
        ds = configuration.get_datasource(datasource)
        if ds is None:
            if skip_datasource_connection is False:
                console.print(
                    "[[bold red]Error[/bold red]] Data source not found. "
                    "Please check your dbt 'profiles.yml' configuration.")
                return 1
            else:
                ds = UnsupportedDataSource('Unknown', dbt=configuration.dbt)
        else:
            event_payload.datasource_type = ds.type_name
        if skip_datasource_connection:
            event_payload.skip_datasource = True

        if configuration.dbt:
            console.rule('DBT')
            console.print('Profile: ', style='bold', end='')
            console.print(f'{configuration.dbt.get("profile")}', style='cyan')
            console.print('Target: ', style='bold', end='')
            console.print(f'{configuration.dbt.get("target")}', style='cyan')

        # Validating
        console.rule('Validating')
        event_payload.step = 'validate'
        passed, reasons = ds.validate()
        if not passed:
            console.print(f"[bold red]Error:[/bold red] The credential of '{ds.name}' is not configured.")
            for reason in reasons:
                console.print(f'    {reason}')
            console.print(
                "[bold yellow]Hint:[/bold yellow]\n  Please execute command 'piperider init' to move forward.")
            return 1

        result, err = _pre_run_validating(ds)
        if result is PreRunValidatingResult.FAILED_TO_LOAD_CONNECTOR:
            if skip_datasource_connection is False:
                if isinstance(err, PipeRiderConnectorUnsupportedError):
                    console.print(f'[[bold red]Error[/bold red]] {err}')
                    raise err
                else:
                    console.print(
                        f'[[bold red]Error[/bold red]] Failed to load the \'{ds.credential.get("type")}\' connector.')
                    if isinstance(err, PipeRiderError):
                        console.print(f'Hint: {err.hint}')
                return 1
        elif result is PreRunValidatingResult.FAILED_TO_CONNECT_DATASOURCE:
            if skip_datasource_connection is False:
                console.print(
                    '[[bold red]ERROR[/bold red]] Unable to connect the data source, please check the configuration')
                if ds.type_name == 'unsupported':
                    data_source_type = ds.credential.get('type')
                    raise PipeRiderInvalidDataSourceError(data_source_type, FileSystem.dbt_profiles_path)
                return 1

        dbt_config = ds.args.get('dbt')
        dbt_manifest = None
        dbt_run_results = None

        if dbt_config:
            if not dbtutil.is_ready(dbt_config):
                console.log(
                    '[[bold red]ERROR:[/bold red]] DBT configuration is not completed, please check the config.yml')
                return 1
            dbt_target_path, err_msg = get_dbt_state_dir(dbt_target_path, dbt_config, ds, skip_datasource_connection)
            if err_msg:
                console.print(err_msg)
                return 1
            dbt_manifest = dbtutil.get_dbt_manifest(dbt_target_path)
            dbt_run_results = dbtutil.get_dbt_run_results(dbt_target_path)
            if dbt_select:
                # If the dbt_resources were already provided by environment variable PIPERIDER_DBT_RESOURCES, skip the dbt select
                dbt_resources = dbt_resources if dbt_resources else dbtutil.load_dbt_resources(dbt_target_path,
                                                                                               select=dbt_select,
                                                                                               state=dbt_state)
        console.print('everything is OK.')

        # Profiling
        event_payload.step = 'pre-profile'
        run_id = uuid.uuid4().hex
        created_at = datetime.utcnow()
        if skip_datasource_connection:
            engine = None
        else:
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
        profiler_result = {}

        statistics = Statistics()
        profiler = Profiler(ds, RichProfilerEventHandler([subject.name for subject in subjects]), configuration)

        if skip_datasource_connection:
            # Generate run result from dbt manifest
            console.rule('Analyze dbt manifest')
            profiler_result = profiler.collect_metadata_from_dbt_manifest(dbt_manifest, dbt_metadata_subjects, subjects)
            console.rule('Skip Profile Data Source', style='dark_orange')
            run_result.update(profiler_result)
        else:
            try:
                event_payload.step = 'schema'
                console.rule('Collect metadata')
                profiler.collect_metadata(dbt_metadata_subjects, subjects)

                event_payload.step = 'profile'
                console.rule('Profile statistics')
                profiler_result = profiler.profile(subjects, metadata_subjects=dbt_metadata_subjects)
                run_result.update(profiler_result)
            except NoSuchTableError as e:
                console.print(f"[bold red]Error:[/bold red] No such table '{str(e)}'")
                return 1
            except Exception as e:
                raise Exception(f'Profiler Exception: {type(e).__name__}(\'{e}\')')

        statistics.reset()

        # Query metrics
        event_payload.step = 'metric'
        if skip_datasource_connection is False:
            console.rule('Query metrics')
            metrics = []
            if dbt_config:
                metrics = dbtutil.get_dbt_state_metrics_16(dbt_target_path, dbt_config.get('tag'), dbt_resources)
            statistics.display_statistic('query', 'metric')
            if metrics:
                run_result['metrics'] = MetricEngine(
                    ds,
                    metrics,
                    RichMetricEventHandler([m.label for m in metrics])
                ).execute()

        # TODO: refactor input unused arguments

        # DBT Test
        event_payload.step = 'dbt test'
        run_result['tests'] = []
        if dbt_test_results:
            console.rule('DBT Test Results')
            _show_dbt_test_result(dbt_test_results)
            run_result['tests'].extend(dbt_test_results)

        if not table:
            if dbt_config:
                run_result['dbt'] = dict()
                if dbt_manifest:
                    def _slim_dbt_manifest(manifest):
                        for key in manifest['nodes'].keys():
                            raw_code = manifest['nodes'][key]['raw_code']
                            sha1 = hashlib.sha1()
                            sha1.update(raw_code.encode('utf-8'))
                            manifest['nodes'][key]['raw_code'] = sha1.hexdigest()
                        return manifest

                    size = sys.getsizeof(dbt_manifest)
                    if size > 1024 * 1024 * 10:
                        # Reduce the manifest size if it's larger than 10MB
                        run_result['dbt']['manifest'] = _slim_dbt_manifest(dbt_manifest)
                    else:
                        run_result['dbt']['manifest'] = dbt_manifest
                if dbt_run_results:
                    run_result['dbt']['run_results'] = dbt_run_results

        for t in run_result['tables']:
            _clean_up_profile_null_properties(run_result['tables'][t])

        if dbt_config:
            dbtutil.append_descriptions(run_result, dbt_target_path)

        # Generate report
        event_payload.step = 'report'
        run_result['id'] = run_id
        run_result['created_at'] = datetime_to_str(created_at)
        git_branch, git_sha = get_git_branch()
        run_result['datasource'] = dict(name=ds.name, type=ds.type_name,
                                        git_branch=git_branch, git_sha=git_sha,
                                        skip_datasource=skip_datasource_connection)

        decorate_with_metadata(run_result)

        output_path = prepare_default_output_path(filesystem, created_at, ds)
        output_file = os.path.join(output_path, 'run.json')

        with open(output_file, 'w', encoding='utf-8') as f:
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

        _analyse_run_event(event_payload, run_result, dbt_test_results)

        if len(subjects) == 0 and len(run_result.get('metrics', [])) == 0 and not skip_datasource_connection:
            return EC_WARN_NO_PROFILED_MODULES

        return 0
