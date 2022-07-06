import re
import os
import sys
import json
from glob import glob
from subprocess import DEVNULL, PIPE
from subprocess import Popen, check_output
from piperider_cli.error import DbtInvocationError

import inquirer
from rich.console import Console
from rich.table import Table

console = Console()


def search_dbt_project_path():
    exclude_patterns = ['site-packages', 'dbt_packages']
    _warning_if_search_path_too_widely(os.getcwd())
    console.print('Start to search dbt project ...')
    paths = glob(os.path.join(os.getcwd(), '**', 'dbt_project.yml'), recursive=True)
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
        console = Console()
        console.print(
            f"[[bold yellow]Warning[/bold yellow]] Search path '{search_path}' is too widely. It will take some time to parse directories and may need extra permissions.")
        if inquirer.confirm(message="Do you still want to keep going?", default=True) is not True:
            raise KeyboardInterrupt()


def _check_dbt_command(dbt):
    if not dbt:
        return False
    dbt_root = os.path.expanduser(dbt.get('projectDir'))
    try:
        check_output(['dbt', '--version'], cwd=dbt_root, stderr=DEVNULL)
    except Exception:
        return False
    return True


def _list_dbt_resources(dbt):
    dbt_root = os.path.expanduser(dbt.get('projectDir'))
    console.rule('Running dbt')
    console.print(f'[bold yellow]dbt working dir:[/bold yellow] {dbt_root}')

    full_cmd_arr = ['dbt', 'list', '--output', 'json', '--resource-type', 'all']
    proc = Popen(full_cmd_arr, stdout=PIPE, stderr=PIPE, cwd=dbt_root)
    out, err = proc.communicate()
    if proc.returncode != 0:
        raise DbtInvocationError()
    lines = out.decode().split('\n')[:-1]

    # Skip lines not starts with '{', which are not message in JSON format
    resources = [json.loads(x) for x in lines if x.startswith('{')]
    return resources


def _list_dbt_tables(dbt, default_schema):
    tables = set()
    resources = dbt.get('resources', [])
    sources = [r for r in resources if r['resource_type'] == 'source']
    models = [r for r in resources if r['resource_type'] == 'model']

    for source in sources:
        schema = source['source_name']
        schema = f'{schema}.' if schema and schema != default_schema else ''
        name = source['name']
        tables.add(f'{schema}{name}')

    for model in models:
        schema = model['config'].get('schema', default_schema)
        schema = f'{schema}.' if schema and schema != default_schema else ''
        name = model['name']
        tables.add(f'{schema}{name}')

    return list(tables)


def _run_dbt_command(table, default_schema, dbt):
    dbt_root = os.path.expanduser(dbt.get('projectDir'))

    cmd = dbt.get('cmd', 'test')
    dbt_resources = dbt['resources']
    full_cmd_arr = ['dbt', cmd]
    if table:
        select = table
        if '.' in table:
            schema, name = table.split('.')[:2]
        else:
            schema, name = default_schema, table

        for resource in dbt_resources:
            if resource.get('name') != name:
                continue
            if resource['resource_type'] == 'model':
                select = name
                break
            if resource['resource_type'] == 'source' and resource['source_name'] == schema:
                select = f'source:{schema}.{name}'
                break
        full_cmd_arr.append('-s')
        full_cmd_arr.append(select)

    console.print(f"Execute command: {' '.join(full_cmd_arr)}")
    proc = Popen(full_cmd_arr, cwd=dbt_root)
    proc.communicate()

    run_results_path = os.path.join(dbt_root, 'target/run_results.json')
    with open(run_results_path) as f:
        run_results = json.load(f)

    output = {}
    unique_tests = {}

    for result in run_results.get('results', []):
        unique_id = result.get('unique_id')
        if unique_id is None:
            continue
        unique_tests[unique_id] = dict(
            status=result.get('status'),
            failures=result.get('failures'),
            message=result.get('message'),
        )

    for resource in dbt_resources:
        unique_id = resource.get('unique_id')
        if unique_id not in unique_tests:
            continue

        macros = resource.get('depends_on', {}).get('macros', [])
        nodes = resource.get('depends_on', {}).get('nodes', [])
        if not nodes or not macros:
            continue

        test_method = macros[0].replace('macro.dbt.test_', '')
        node = nodes[0]
        node_type = node.split('.')[0]
        package_name = resource.get('package_name')

        is_source = 'source_' if node_type == 'source' else ''
        table_with_schema = re.sub(f'^{node_type}\.{package_name}\.', '', node)
        schema = ''
        table_name = table_with_schema
        if '.' in table_with_schema:
            schema, table_name = table_with_schema.split('.')[:2]
        is_schema = f'{schema}_' if schema != '' else ''

        pattern = f'^{is_source}{test_method}_{is_schema}{table_name}_'
        column = re.sub(pattern, '', resource['name'])

        parent_table = f'{schema}.{table_name}' if schema and schema != default_schema else table_name

        if parent_table not in output:
            output[parent_table] = dict(columns={}, tests=[])

        if column not in output[parent_table]['columns']:
            output[parent_table]['columns'][column] = []
        output[parent_table]['columns'][column].append(dict(
            name=unique_id,
            status='passed' if unique_tests[unique_id]['status'] == 'pass' else 'failed',
            message=unique_tests[unique_id]['message'],
        ))

    return output


def _append_descriptions_from_dbt(profile_result, dbt, default_schema):
    dbt_root = os.path.expanduser(dbt.get('projectDir'))
    full_cmd_arr = ['dbt', 'list', '--output', 'json', '--resource-type', 'model', '--resource-type', 'source', '--output-keys', 'resource_type,description,name,columns,source_name']
    lines = check_output(full_cmd_arr, cwd=dbt_root).decode().split('\n')[:-1]
    # Skip lines not starts with '{', which are not message in JSON format
    resources = [json.loads(x) for x in lines if x.startswith('{')]
    for resource in resources:
        schema = resource.get('source_name')
        table_name = resource.get('name')
        description = resource.get('description', '')

        schema = f'{schema}.' if schema and schema != default_schema else ''
        table_name = f'{schema}{table_name}'

        if table_name not in profile_result['tables']:
            continue
        profile_result['tables'][table_name]['description'] = description

        columns = resource.get('columns', {})
        for column_name, v in columns.items():
            if column_name not in profile_result['tables'][table_name]['columns']:
                continue
            profile_result['tables'][table_name]['columns'][column_name]['description'] = v.get('description', '')
