import io
import json
import os
import sys
from glob import glob
from pathlib import Path
from typing import Dict, Optional, Union

import inquirer
from jinja2 import UndefinedError
from rich.console import Console
from rich.table import Table

from piperider_cli import load_jinja_template, load_jinja_string_template
from piperider_cli import yaml as pyml
from piperider_cli.dbt.list_task import load_manifest, list_resources_unique_id_from_manifest, load_full_manifest
from piperider_cli.error import \
    DbtProjectInvalidError, \
    DbtProfileInvalidError, \
    DbtProfileBigQueryAuthWithTokenUnsupportedError, DbtRunTimeError
from piperider_cli.metrics_engine import Metric
from piperider_cli.metrics_engine.metrics import SemanticModel
from piperider_cli.statistics import Statistics

console = Console()


def search_dbt_project_path() -> str:
    paths = list(Path.cwd().parents)
    paths.insert(0, Path.cwd())
    return next((str(x) for x in paths if (x / "dbt_project.yml").exists()), None)


def get_dbt_project_path(dbt_project_dir: str = None, no_auto_search: bool = False,
                         recursive: bool = True) -> str:
    project_dir = dbt_project_dir if dbt_project_dir else search_dbt_project_path()
    if project_dir is None:
        return None
    return os.path.join(project_dir, "dbt_project.yml")


# Deprecated due to we will search parent directory for dbt_project.yml, not subdirectory ref: SC-31557
def _search_dbt_project_path(recursive: bool = True):
    exclude_patterns = ['site-packages', 'dbt_packages']
    segments = [os.getcwd()]
    if recursive:
        _warning_if_search_path_too_widely(os.getcwd())
        segments.append('**')
    paths = glob(os.path.join(*segments, 'dbt_project.yml'), recursive=True)
    for exclude_pattern in exclude_patterns:
        paths = list(filter(lambda x: exclude_pattern not in x, paths))
    dbt_project_path = None
    if not paths:
        # No dbt project found
        return dbt_project_path

    if len(paths) == 1:
        # Only one dbt project found, use it
        dbt_project_path = paths[0]
    else:
        # Multiple dbt projects found, ask user to select one
        paths = sorted(paths, key=len)
        default_index = 0
        console.print(f'\nMultiple dbt projects found. Please select the dbt project: (Default: {default_index})')
        table = Table(show_header=True, header_style="bold magenta")
        table.add_column('Index', style="bold", width=5, justify='right')
        table.add_column('Path', style="bold")
        for i, p in enumerate(paths):
            table.add_row(str(i), p)
        console.print(table)
        in_index = input('index : ').strip()
        try:
            in_index = int(in_index) if in_index else default_index
            index = int(in_index)
            dbt_project_path = paths[index]
        except Exception as e:
            console.print(f'[bold yellow]Failed to read index![/] Error: {e}')
            return None

    return dbt_project_path


def _warning_if_search_path_too_widely(search_path):
    # Only warning user on macOS platform
    if sys.platform != "darwin":
        return

    home_dir = os.path.expanduser('~')

    if search_path in home_dir:
        console.print(
            f"[[bold yellow]Warning[/bold yellow]] Search path '{search_path}' is too widely. It will take some time to parse directories and may need extra permissions.")
        if inquirer.confirm(message="Do you still want to keep going?", default=True) is not True:
            raise KeyboardInterrupt()


def is_ready(config):
    if not config.get('profile'):
        return False

    if not config.get('target'):
        return False

    if not config.get('projectDir'):
        return False

    if not os.path.expanduser(config.get('projectDir')):
        return False

    return True


def _is_dbt_file_existing(dbt_state_dir: str, filename: str):
    dbt_state_dir = os.path.abspath(dbt_state_dir)
    filepath = os.path.join(dbt_state_dir, filename)
    if not os.path.exists(filepath):
        return False
    return True


def is_dbt_state_ready(dbt_state_dir: str):
    return _is_dbt_file_existing(dbt_state_dir, 'manifest.json')


def is_dbt_run_results_ready(dbt_state_dir: str):
    return _is_dbt_file_existing(dbt_state_dir, 'run_results.json')


def _get_state_run_results(dbt_state_dir: str):
    path = os.path.join(dbt_state_dir, 'run_results.json')
    with open(path) as f:
        run_results = json.load(f)

    return run_results


def _get_state_manifest(dbt_state_dir: str, project_dir: str = None):
    path = os.path.join(dbt_state_dir, 'manifest.json')
    if project_dir is not None:
        path = os.path.join(project_dir, path)
    elif os.path.isabs(path) is False:
        from piperider_cli.configuration import FileSystem
        path = os.path.join(FileSystem.WORKING_DIRECTORY, path)
    with open(path) as f:
        manifest = json.load(f)

    return manifest


def append_descriptions(profile_result, dbt_state_dir):
    manifest = _get_state_manifest(dbt_state_dir)

    nodes = manifest.get('nodes')
    for node in nodes.values():
        model = node.get('name')
        model_desc = node.get('description')
        if model not in profile_result['tables']:
            continue
        if model_desc:
            profile_result['tables'][model]['description'] = f"{model_desc}"

        columns = node.get('columns', {})
        for column, v in columns.items():
            if column not in profile_result['tables'][model]['columns']:
                continue
            column_desc = v.get('description')
            if column_desc:
                profile_result['tables'][model]['columns'][column]['description'] = f"{column_desc}"


def get_dbt_state_candidate(dbt_state_dir: str, options: dict, *, select_for_metadata: bool = False):
    candidate = []
    material_whitelist = ['seed', 'table', 'incremental']
    resource_whitelist = ['model', 'seed']
    if options.get('view_profile'):
        material_whitelist.append('view')

    tag = options.get('tag')
    dbt_resources = options.get('dbt_resources')

    manifest = _get_state_manifest(dbt_state_dir)
    nodes = manifest.get('nodes')
    sources = manifest.get('sources')

    def profiling_chosen_fn(key, node):
        statistics = Statistics()
        if dbt_resources:
            fqn = '.'.join(node.get('fqn'))
            unique_id = node.get('unique_id')
            chosen = unique_id in dbt_resources['models'] or fqn in dbt_resources['models']
            if not chosen:
                statistics.add_field_one('filter')
            return chosen
        else:
            if tag:
                chosen = tag in node.get('tags', [])
                if not chosen:
                    statistics.add_field_one('notag')
                return chosen
            config_material = node.get('config').get('materialized')
            if config_material not in material_whitelist:
                statistics.add_field_one(config_material)
                return False
            return True

    def metadata_chosen_fn(key, node):
        materialized = node.get('config', {}).get('materialized')
        if materialized == 'ephemeral':
            return False
        return True

    is_chosen_fn = profiling_chosen_fn if not select_for_metadata else metadata_chosen_fn

    for key, node in nodes.items():
        if node.get('resource_type') not in resource_whitelist:
            continue
        Statistics().add_field_one('total')
        if not is_chosen_fn(key, node):
            continue
        candidate.append(node)

    for key, node in sources.items():
        if not is_chosen_fn(key, node):
            continue
        candidate.append(node)

    return candidate


def get_dbt_state_tests_result(dbt_state_dir: str, table_filter=None):
    output = []
    unique_tests = {}

    run_results = _get_state_run_results(dbt_state_dir)
    manifest = _get_state_manifest(dbt_state_dir)

    nodes = manifest.get('nodes')
    sources = manifest.get('sources')
    for result in run_results.get('results', []):
        unique_id = result.get('unique_id')

        node = nodes.get(unique_id)
        if not node:
            continue

        if node.get('resource_type') != 'test':
            continue

        # The test is just compiled, but not executed
        if result.get('status') == 'success':
            continue

        unique_tests[unique_id] = dict(
            status=result.get('status'),
            failures=result.get('failures'),
            message=result.get('message'),
        )

        test_node = node
        table = None
        depends_on_nodes = test_node.get('depends_on', {}).get('nodes', [])
        for depends_on_node_id in depends_on_nodes:
            depends_on_node = nodes.get(depends_on_node_id)
            if depends_on_node_id.startswith('source'):
                source = sources.get(depends_on_node_id)
                table = f"{source.get('source_name')}.{source.get('name')}"
                break
            elif depends_on_node.get('resource_type') in ['model', 'seed']:
                table = depends_on_node.get('name')
                break
        column = test_node.get('column_name')

        if table is None:
            continue

        if table_filter is not None:
            if len(table.split('.')) == 2:
                _, table_name = table.split('.')
            else:
                table_name = table
            if table_name != table_filter:
                continue

        output.append(dict(
            id=unique_id,
            name=unique_id,
            table=table,
            column=column if column != test_node['name'] else None,
            status='failed' if unique_tests[unique_id]['status'] == 'fail' else 'passed',
            tags=[],
            message=unique_tests[unique_id]['message'],
            display_name=test_node['name'],
            source='dbt'
        ))

    return output


def get_dbt_state_metrics(dbt_state_dir: str, dbt_tag: str, dbt_resources: Optional[dict] = None):
    manifest = _get_state_manifest(dbt_state_dir)

    def is_chosen(key, metric):
        statistics = Statistics()
        if dbt_resources:
            chosen = key in dbt_resources['metrics']
            if not chosen:
                statistics.add_field_one('filter')
            return chosen
        if dbt_tag is not None:
            chosen = dbt_tag in metric.get('tags')
            if not chosen:
                statistics.add_field_one('notag')
            return chosen
        return True

    metrics = []
    metric_map = {}
    for key, metric in manifest.get('metrics').items():
        if metric.get('calculation_method') == 'derived':
            table = None
            schema = None
            database = None
        else:
            nodes = metric.get('depends_on').get('nodes', [])
            # Note: In "metrics" definition, if "model" value doesn't use `ref()` function,
            #       the "depends_on.nodes" will be empty in the generated metrics manifest
            if len(nodes) == 0:
                continue
            depends_on_node = nodes[0]
            table = manifest.get('nodes').get(depends_on_node).get('alias')
            schema = manifest.get('nodes').get(depends_on_node).get('schema')
            database = manifest.get('nodes').get(depends_on_node).get('database')

        m = Metric(metric.get('name'), table, schema, database, metric.get('expression'), metric.get('timestamp'),
                   metric.get('calculation_method'), metric.get('time_grains'), dimensions=None,
                   filters=metric.get('filters'), label=metric.get('label'), description=metric.get('description'),
                   ref_id=metric.get('unique_id'))

        metric_map[key] = m
        statistics = Statistics()
        statistics.add_field_one('total')

        if is_chosen(key, metric):
            if metric.get('window'):
                console.print(
                    f"[[bold yellow]Warning[/bold yellow]] Skip metric '{metric.get('name')}'. Property 'window' is not supported.")
                statistics.add_field_one('nosupport')
                continue
            metrics.append(m)

    for key, metric in metric_map.items():
        if metric.calculation_method == 'derived':
            for depends_on_metric in manifest.get('metrics').get(key).get('depends_on').get('nodes'):
                metric.ref_metrics.append(metric_map.get(depends_on_metric))

    return metrics


def is_dbt_schema_version_16(manifest: Dict):
    # dbt_schema_version: 'https://schemas.getdbt.com/dbt/manifest/v10.json'
    schema_version_url = manifest['metadata'].get('dbt_schema_version')

    def parse_version_from_url(url: str):
        import re
        match = re.match(r"(.*?)\/v(\d+)\.json", url)
        if match:
            return int(match.group(2))

    version = parse_version_from_url(schema_version_url)
    return version >= 10


def load_metric_jinja_string_template(value: str):
    from jinja2 import Environment, BaseLoader
    env = Environment(loader=BaseLoader())

    def dimension(var):
        return var

    env.globals['Dimension'] = dimension
    template = env.from_string(value)

    return template


def get_support_time_grains(grain: str):
    all_time_grains = ['day', 'week', 'month', 'quarter', 'year']
    available_time_grains = all_time_grains[all_time_grains.index(grain):]
    support_time_grains = ['day', 'month', 'year']

    return [x for x in support_time_grains if x in available_time_grains]


def get_metric_filter(metric_name, raw_filter):
    try:
        sql_filter = load_metric_jinja_string_template(raw_filter.get('where_sql_template')).render()
        return {
            'field': sql_filter.split(' ')[0],
            'operator': sql_filter.split(' ')[1],
            'value': sql_filter.split(' ')[2]
        }
    except UndefinedError as e:
        func_name = e.message.split(' ')[0]
        console.print(
            f"[[bold yellow]Skip[/bold yellow]] Metric '{metric_name}'. "
            f"Jinja function {func_name} of filter is not supported.")

    return None


def find_derived_time_grains(manifest: Dict, metric: Dict):
    nodes = metric.get('depends_on').get('nodes', [])
    depends_on = nodes[0]
    if depends_on.startswith('semantic_model.'):
        semantic_model = manifest.get('semantic_models').get(depends_on)
        measure = None
        for obj in semantic_model.get('measures'):
            if obj.get('name') == metric.get('type_params').get('measure').get('name'):
                measure = obj
                break

        agg_time_dimension = measure.get('agg_time_dimension') if measure.get(
            'agg_time_dimension') else semantic_model.get('defaults').get('agg_time_dimension')

        time_grains = None
        if agg_time_dimension is not None:
            # find dimension definition - time
            for obj in semantic_model.get('dimensions'):
                if obj.get('name') == agg_time_dimension:
                    grain = obj.get('type_params').get('time_granularity')
                    time_grains = get_support_time_grains(grain)
                    break

        return time_grains


def get_dbt_state_metrics_16(dbt_state_dir: str, dbt_tag: Optional[str] = None, dbt_resources: Optional[dict] = None):
    manifest = _get_state_manifest(dbt_state_dir)

    if not is_dbt_schema_version_16(manifest):
        console.print("[[bold yellow]Skip[/bold yellow]] Metric query is not supported for dbt < 1.6")
        return []

    def is_chosen(key, metric):
        statistics = Statistics()
        if dbt_resources:
            chosen = key in dbt_resources['metrics']
            if not chosen:
                statistics.add_field_one('filter')
            return chosen
        if dbt_tag is not None:
            chosen = dbt_tag in metric.get('tags')
            if not chosen:
                statistics.add_field_one('notag')
            return chosen
        return True

    metrics = []
    metric_map = {}

    for key, metric in manifest.get('metrics').items():
        metric_map[metric.get('name')] = metric

    def _create_metric(name, filter=None, alias=None, root_name=None):
        root_name = name if root_name is None else root_name
        statistics = Statistics()
        metric = metric_map.get(name)

        if metric.get('type') == 'simple':
            primary_entity = None
            metric_filter = []
            if metric.get('filter') is not None:
                # in dbt 1.7, there's an additional layer of 'where_filters'
                if 'where_filters' in metric.get('filter'):
                    for where_filter in metric.get('filter').get('where_filters', []):
                        f = get_metric_filter(root_name, where_filter)
                        if f is not None:
                            metric_filter.append(f)
                        else:
                            statistics.add_field_one('nosupport')
                            return None
                else:
                    f = get_metric_filter(root_name, metric.get('filter'))
                    if f is not None:
                        metric_filter.append(f)
                    else:
                        statistics.add_field_one('nosupport')
                        return None

            if filter is not None:
                if 'where_filters' in filter:
                    for where_filter in filter.get('where_filters', []):
                        f = get_metric_filter(root_name, where_filter)
                        if f is not None:
                            metric_filter.append(f)
                        else:
                            statistics.add_field_one('nosupport')
                            return None
                else:
                    f = get_metric_filter(root_name, filter)
                    if f is not None:
                        metric_filter.append(f)
                    else:
                        statistics.add_field_one('nosupport')
                        return None

            nodes = metric.get('depends_on').get('nodes', [])
            depends_on = nodes[0]
            if depends_on.startswith('semantic_model.'):
                semantic_model = manifest.get('semantic_models').get(depends_on)
                table = semantic_model.get('node_relation').get('alias')
                schema = semantic_model.get('node_relation').get('schema_name')
                database = semantic_model.get('node_relation').get('database')
                # find measure definition
                measure = None
                for obj in semantic_model.get('measures'):
                    if obj.get('name') == metric.get('type_params').get('measure').get('name'):
                        measure = obj
                        break
                # TODO: remove assertion
                assert measure is not None, 'Measure not found'
                expression = measure.get('expr') if measure.get('expr') is not None else measure.get('name')
                calculation_method = measure.get('agg')

                for entity in semantic_model.get('entities'):
                    if entity.get('type') == 'primary':
                        primary_entity = entity.get('name')
                        break

                agg_time_dimension = measure.get('agg_time_dimension') if measure.get(
                    'agg_time_dimension') else semantic_model.get('defaults').get('agg_time_dimension')
                timestamp = None
                time_grains = None
                if agg_time_dimension is not None:
                    # find dimension definition - time
                    for obj in semantic_model.get('dimensions'):
                        if obj.get('name') == agg_time_dimension:
                            timestamp = obj.get('expr') if obj.get('expr') else obj.get('name')
                            grain = obj.get('type_params').get('time_granularity')
                            time_grains = get_support_time_grains(grain)
                            break

                if metric.get('filter') is not None:
                    # find dimension definition - categorical
                    for obj in semantic_model.get('dimensions'):
                        if obj.get('name') in metric_filter[0]['field']:
                            expr = obj.get('expr') or obj.get('name')
                            metric_filter[0]['field'] = metric_filter[0]['field'].replace(obj.get('name'), expr)
                            break
            else:
                # TODO: remove assertion
                assert False, 'Simple type metric should depend on semantic model.'

            model = SemanticModel(metric.get('name'), table, schema, database, expression, timestamp,
                                  filters=metric_filter)

            m = Metric(metric.get('name'), model=model, calculation_method=calculation_method, time_grains=time_grains,
                       label=metric.get('label'), description=metric.get('description'),
                       ref_id=metric.get('unique_id'))

            for f in m.model.filters:
                if primary_entity in f['field']:
                    f['field'] = f['field'].replace(f'{primary_entity}__', '')
                else:
                    console.print(
                        f"[[bold yellow]Skip[/bold yellow]] "
                        f"Metric '{root_name if root_name else metric.get('name')}'. "
                        f"Dimension of foreign entities is not supported.")
                    statistics.add_field_one('nosupport')
                    return None
            if m.calculation_method in ['sum_boolean', 'median', 'percentile']:
                console.print(
                    f"[[bold yellow]Skip[/bold yellow]] Metric '{metric.get('name')}'. "
                    f"Aggregation type '{m.calculation_method}' is not supported.")
                statistics.add_field_one('nosupport')
                return None

            return m
        elif metric.get('type') == 'derived':
            ref_metrics = []
            time_grains = ['day', 'month', 'year']
            expr = metric.get('type_params').get('expr')
            for ref_metric in metric.get('type_params').get('metrics'):
                if ref_metric.get('offset_window') is not None:
                    console.print(
                        f"[[bold yellow]Skip[/bold yellow]] Metric '{metric.get('name')}'. "
                        f"Derived metric property 'offset_window' is not supported.")
                    statistics.add_field_one('nosupport')
                    return None
                m2 = _create_metric(
                    ref_metric.get('name'),
                    filter=ref_metric.get('filter'),
                    alias=ref_metric.get('alias'),
                    root_name=root_name
                )
                if m2 is None:
                    return None
                ref_metrics.append(m2)

                derived_time_grains = find_derived_time_grains(manifest, metric_map[ref_metric.get('name')])
                if len(time_grains) < len(derived_time_grains):
                    time_grains = derived_time_grains

                if ref_metric.get('alias') is not None:
                    expr = expr.replace(ref_metric.get('alias'), ref_metric.get('name'))

            m = Metric(metric.get('name'),
                       calculation_method='derived',
                       expression=expr,
                       time_grains=time_grains,
                       label=metric.get('label'), description=metric.get('description'), ref_metrics=ref_metrics,
                       ref_id=metric.get('unique_id'))
            return m
        elif metric.get('type') == 'ratio':
            ref_metrics = []
            time_grains = ['day', 'month', 'year']
            numerator = metric.get('type_params').get('numerator')
            m2 = _create_metric(
                numerator.get('name'),
                filter=numerator.get('filter'),
                alias=numerator.get('alias'),
                root_name=root_name
            )
            if m2 is None:
                return None
            ref_metrics.append(m2)
            derived_time_grains = find_derived_time_grains(manifest, metric_map[numerator.get('name')])
            if len(time_grains) < len(derived_time_grains):
                time_grains = derived_time_grains

            denominator = metric.get('type_params').get('denominator')
            m2 = _create_metric(
                denominator.get('name'),
                filter=denominator.get('filter'),
                alias=denominator.get('alias'),
                root_name=root_name
            )
            if m2 is None:
                return None
            ref_metrics.append(m2)
            derived_time_grains = find_derived_time_grains(manifest, metric_map[denominator.get('name')])
            if len(time_grains) < len(derived_time_grains):
                time_grains = derived_time_grains

            m = Metric(metric.get('name'),
                       calculation_method='ratio',
                       numerator=numerator.get('name'),
                       denominator=denominator.get('name'),
                       time_grains=time_grains,
                       label=metric.get('label'), description=metric.get('description'), ref_metrics=ref_metrics,
                       ref_id=metric.get('unique_id'))
            return m
        else:
            console.print(
                f"[[bold yellow]Skip[/bold yellow]] Metric '{metric.get('name')}'. "
                f"Metric type 'Cumulative' is not supported.")
            statistics.add_field_one('nosupport')
        return None

    for key, metric in manifest.get('metrics').items():
        statistics = Statistics()
        statistics.add_field_one('total')

        if not is_chosen(key, metric):
            continue

        m = _create_metric(metric.get('name'))
        if m is not None:
            metrics.append(m)

    return metrics


def check_dbt_manifest(dbt_state_dir: str) -> bool:
    path = os.path.join(dbt_state_dir, 'manifest.json')
    if os.path.isabs(path) is False:
        from piperider_cli.configuration import FileSystem
        path = os.path.join(FileSystem.WORKING_DIRECTORY, path)
    return os.path.exists(path)


def get_dbt_manifest(dbt_state_dir: str, project_dir: str = None):
    return _get_state_manifest(dbt_state_dir, project_dir=project_dir)


def load_dbt_resources(target_path: str, select: tuple = None, state=None):
    manifest = load_manifest(get_dbt_manifest(target_path)) if state is None else load_full_manifest(target_path)
    try:
        list_resources = list_resources_unique_id_from_manifest(manifest, select=select, state=state)
    except RuntimeError as e:
        raise DbtRunTimeError(e, select, state)
    return read_dbt_resources(list_resources)


def get_dbt_run_results(dbt_state_dir: str):
    return _get_state_run_results(dbt_state_dir) if is_dbt_run_results_ready(dbt_state_dir) else None


def load_dbt_project(path: str):
    """
    Load dbt project file and return the content of 'profile' and 'target-path' fields
    """
    if not path.endswith('dbt_project.yml'):
        path = os.path.join(path, 'dbt_project.yml')

    if not os.path.isabs(path):
        from piperider_cli.configuration import FileSystem
        if os.path.exists(path) is False:
            path = os.path.join(FileSystem.WORKING_DIRECTORY, path)

    with open(path, 'r') as fd:
        try:
            loader = pyml.allow_duplicate_keys_loader()
            dbt_project = loader(fd)

            content = {}
            for key, val in dbt_project.items():
                if key not in ['profile', 'target-path']:
                    continue
                if isinstance(val, str):
                    content[key] = load_jinja_string_template(val).render()
                else:
                    content[key] = val
            return content
        except Exception as e:
            raise DbtProjectInvalidError(path, e)


def load_dbt_profile(path):
    template = load_jinja_template(path)
    profile = None
    try:
        loader = pyml.allow_duplicate_keys_loader()
        profile = loader(template.render())
    except Exception as e:
        raise DbtProfileInvalidError(path, e)
    if profile is None:
        raise DbtProfileInvalidError(path, f"The profile '{path}' is empty")
    return profile


def load_credential_from_dbt_profile(dbt_profile, profile_name, target_name):
    credential = dbt_profile.get(profile_name, {}).get('outputs', {}).get(target_name, {})

    if credential.get('type') == 'bigquery':
        # BigQuery Data Source
        from piperider_cli.datasource.bigquery import AUTH_METHOD_OAUTH_SECRETS
        # DBT profile support 4 types of methods to authenticate with BigQuery:
        #   [ 'oauth', 'oauth-secrets', 'service-account', 'service-account-json' ]
        # Ref: https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#authentication-methods
        if credential.get('method') == 'oauth-secrets':
            credential['method'] = AUTH_METHOD_OAUTH_SECRETS
            # TODO: Currently SqlAlchemy haven't support using access token to authenticate with BigQuery.
            #       Ref: https://github.com/googleapis/python-bigquery-sqlalchemy/pull/459
            raise DbtProfileBigQueryAuthWithTokenUnsupportedError
    elif credential.get('type') == 'redshift':
        if credential.get('method') is None:
            credential['method'] = 'password'
        host = credential.get('host')
        port = credential.get('port')
        dbname = credential.get('dbname')
        credential['endpoint'] = f'{host}:{port}/{dbname}'
    return credential


def read_dbt_resources(source: Union[str, io.TextIOWrapper, list]):
    if isinstance(source, io.TextIOWrapper):
        lines = source.readlines()
    elif isinstance(source, str):
        lines = source.split('\n')
    else:
        lines = source

    metrics = []
    models = []
    for line in lines:
        dbt_resource = line.rstrip()
        if ' ' in dbt_resource:
            # From dbt 1.5.x, `dbt list` will output runtime logs as well. Need to ignore them
            continue
        elif dbt_resource.startswith('source.'):
            continue
        elif dbt_resource.startswith('metric.'):
            metrics.append(dbt_resource)
        else:
            models.append(dbt_resource)
    return dict(metrics=metrics, models=models)


def prepare_topological_graph(manifest: Dict):
    child_map = manifest.get('child_map', {})
    graph = {}
    for k, v in child_map.items():
        if k.split('.')[0] == 'model' or k.split('.')[0] == 'metric':
            v = [x for x in v if x.split('.')[0] == 'model' or x.split('.')[0] == 'metric']
            graph[k] = v

    return graph
