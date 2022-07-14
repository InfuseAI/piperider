import re
import os
import sys
import json
from abc import ABCMeta, abstractmethod
from glob import glob
from subprocess import DEVNULL, PIPE
from subprocess import Popen, check_output
from piperider_cli.error import DbtCommandNotFoundError, DbtInvocationError

import inquirer
from rich.console import Console
from rich.table import Table

console = Console()


class DbtAdaptee(metaclass=ABCMeta):

    @abstractmethod
    def set_root(self, root):
        raise NotImplementedError

    @abstractmethod
    def check(self):
        raise NotImplementedError

    @abstractmethod
    def list_resources(self, types, keys):
        raise NotImplementedError

    @abstractmethod
    def run(self, cmd_arr):
        raise NotImplementedError

    @abstractmethod
    def get_run_results(self):
        raise NotImplementedError


class DefaultDbtAdaptee(DbtAdaptee):

    def set_root(self, root):
        self.root = root

    def check(self):
        check_output(['dbt', '--version'], cwd=self.root, stderr=DEVNULL)

    def list_resources(self, types=['all'], keys=''):
        cmd_arr = ['dbt', 'list', '--output', 'json']
        for t in types:
            cmd_arr.append('--resource-type')
            cmd_arr.append(t)
        if keys:
            cmd_arr.append('--output-keys')
            cmd_arr.append(keys)

        return self._run_command(cmd_arr, stdout=PIPE, stderr=PIPE)

    def run(self, cmd_arr):
        self._run_command(cmd_arr)

    def _run_command(self, cmd_arr, stdout=None, stderr=None):
        proc = Popen(cmd_arr, stdout=stdout, stderr=stderr, cwd=self.root)
        out, err = proc.communicate()
        # Exit code ref: https://docs.getdbt.com/reference/exit-codes
        if proc.returncode == 2:
            raise DbtInvocationError()
        if out:
            return out.decode()

    def get_run_results(self):
        path = os.path.join(self.root, 'target/run_results.json')
        with open(path) as f:
            return json.load(f)


class DbtAdapter:

    def __init__(self, config, adaptee=None):
        self.config = config or {}
        self.profile = self.config.get('profile')
        self.profilesDir = self.config.get('profilesDir')
        self.projectDir = self.config.get('projectDir')
        self.target = self.config.get('target')
        self.rootPath = os.path.expanduser(self.projectDir) if self.projectDir else None

        self.adaptee: DbtAdaptee = adaptee if adaptee else DefaultDbtAdaptee()
        self.adaptee.set_root(self.rootPath)

        self.resources = []
        self.command = None
        self.error = None

        if self._check_dbt_command():
            self._list_dbt_resources()

    @staticmethod
    def search_dbt_project_path():
        exclude_patterns = ['site-packages', 'dbt_packages']
        DbtAdapter._warning_if_search_path_too_widely(os.getcwd())
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

    @staticmethod
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

    @staticmethod
    def check_dbt_command(dbt_config):
        adaptee = DefaultDbtAdaptee()
        adaptee.set_root(os.path.expanduser(dbt_config.get('projectDir', '')))
        try:
            adaptee.check()
        except Exception:
            return DbtCommandNotFoundError()

    def _check_dbt_command(self):
        if not self.is_ready():
            return False
        try:
            self.adaptee.check()
        except Exception:
            self.error = DbtCommandNotFoundError()
            return False
        return True

    def _list_dbt_resources(self):
        out = self.adaptee.list_resources()
        lines = out.split('\n')[:-1]

        # Skip lines not starts with '{', which are not message in JSON format
        self.resources = [json.loads(x) for x in lines if x.startswith('{')]

    def is_ready(self):
        # TODO: check dbt command
        if self.error:
            return False
        return None not in [self.profile, self.projectDir, self.target, self.rootPath]

    def get_error(self):
        return self.error

    def list_dbt_tables(self, default_schema):
        tables = set()
        sources = [r for r in self.resources if r['resource_type'] == 'source']
        models = [r for r in self.resources if r['resource_type'] == 'model']

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

    def set_dbt_command(self, command):
        self.command = command

    def run_dbt_command(self, table, default_schema):
        console.rule('Running dbt')
        console.print(f'[bold yellow]dbt working dir:[/bold yellow] {self.rootPath}')

        full_cmd_arr = ['dbt', self.command]
        if table:
            select = table
            if '.' in table:
                schema, name = table.split('.')[:2]
            else:
                schema, name = default_schema, table

            for resource in self.resources:
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
        self.adaptee.run(full_cmd_arr)

        run_results = self.adaptee.get_run_results()

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

        for resource in self.resources:
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

    def append_descriptions(self, profile_result, default_schema):
        out = self.adaptee.list_resources(['model', 'source'], 'resource_type,description,name,columns,source_name')
        lines = out.split('\n')[:-1]
        # Skip lines not starts with '{', which are not message in JSON format
        resources = [json.loads(x) for x in lines if x.startswith('{')]
        for resource in resources:
            schema = resource.get('source_name')
            table_name = resource.get('name')
            table_desc = resource.get('description', '')

            schema = f'{schema}.' if schema and schema != default_schema else ''
            table_name = f'{schema}{table_name}'

            if table_name not in profile_result['tables']:
                continue
            if table_desc:
                profile_result['tables'][table_name]['description'] = f"{table_desc} - via DBT"

            columns = resource.get('columns', {})
            for column_name, v in columns.items():
                if column_name not in profile_result['tables'][table_name]['columns']:
                    continue
                column_desc = v.get('description', '')
                if column_desc:
                    profile_result['tables'][table_name]['columns'][column_name]['description'] = f"{column_desc} - via DBT"
