import json
import math
import os
import sys
from datetime import datetime

import readchar
from rich.console import Console

import piperider_cli.hack.inquirer as inquirer_hack


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
        return f'{self.datasource}->{self.name:20} ' \
               f'#pass={self.pass_count:3} ' \
               f'#fail={self.fail_count:<3} ' \
               f'#row={self.row_count:<8} ' \
               f'#column={self.col_count:<3} {self.created_at}'


class ComparisonData(object):
    def __init__(self):
        self.table = dict(base=None, input=None)
        self.summary = dict(
            schema=dict(added=0, deleted=0, type_changed=0),
            distribution=dict(changed=0, highest=None),
            missing_values=dict(changed=0, highest=None),
            range=dict(changed=0, highest=None),
        )
        self.detail = dict(
            row_count=dict(base=None, input=None),
            column_count=dict(base=None, input=None),
            schema=dict(base=[], input=[]),
            distribution=[],
            missing_values=dict(base=[], input=[]),
            range=dict(base=[], input=[]),
        )
        self._columns = dict(base={}, input={})
        self._column_names = dict(base=[], input=[])
        self._highest = dict(
            distribution=dict(column=None, value=0),
            missing_values=dict(column=None, value=0),
            range=dict(column=None, value=0),
        )
        self._created_at = datetime.now()

    def id(self):
        ds_name = self.table['base'].get('datasource', {}).get('name', '')
        table_name = self.table['base'].get('name', '')
        _id = f'{self._created_at.strftime("%Y%m%d%H%M%S")}'
        if table_name:
            _id = f'{table_name}-{_id}'
        if ds_name:
            _id = f'{ds_name}-{_id}'
        return _id

    def add_table(self, base, input):
        self.table['base'] = dict(
            name=base['name'],
            created_at=base['created_at'],
            datasource=base['datasource'],
        )
        self.table['input'] = dict(
            name=input['name'],
            created_at=input['created_at'],
            datasource=input['datasource'],
        )
        self.detail['row_count']['base'] = base['row_count']
        self.detail['row_count']['input'] = input['row_count']
        self.detail['column_count']['base'] = base['col_count']
        self.detail['column_count']['input'] = input['col_count']

    def add_column(self, base, input):
        base_name = base.get('name') if base else None
        self._column_names['base'].append(base_name)
        if base_name:
            base['changes'] = {}
            base['metrics'] = {}
            self._columns['base'][base_name] = base

        input_name = input.get('name') if input else None
        self._column_names['input'].append(input_name)
        if input_name:
            input['changes'] = {}
            input['metrics'] = {}
            self._columns['input'][input_name] = input

    def schema_changed(self, event, col_name):
        self.summary['schema'][event] += 1
        base_col = self._columns['base'].get(col_name, None)
        input_col = self._columns['input'].get(col_name, None)

        if event == 'deleted' and base_col:
            base_col['changes'] = {'deleted': True}
        if event == 'added' and input_col:
            input_col['changes'] = {'added': True}
        if event == 'type_changed' and base_col and input_col:
            base_col['changes'] = {'type_changed': True}
            input_col['changes'] = {'type_changed': True}

    def metrics_changed(self, metric, col_name, base, input):
        self.summary[metric]['changed'] += 1
        base_col = self._columns['base'].get(col_name, None)
        input_col = self._columns['input'].get(col_name, None)
        if base_col:
            base_col['metrics'][metric] = base
        if input_col:
            input_col['metrics'][metric] = input
            input_col['changes'][metric] = True

    def record_highest(self, metric, col_name, value):
        if self._highest[metric]['value'] < value:
            self._highest[metric]['value'] = value
            self._highest[metric]['column'] = col_name

    def _add_column_item(self, name, target, item, add_null=False):
        if item and item.get('value', None) is not None or add_null:
            self.detail[name][target].append(item)

    def _combine_distribute_item(self, base, input):
        if base is None or input is None:
            return

        base_dist = base.get('metrics', {}).get('distribution', None)
        input_dist = input.get('metrics', {}).get('distribution', None)

        if base_dist is None or input_dist is None:
            return None

        diff_type = base_dist['type'] != input_dist['type']
        acceptable_type = base_dist['type'] in ['topk', 'yearly', 'monthly', 'daily']
        if diff_type or not acceptable_type:
            return dict(
                column=base['name'],
                type=base_dist['type'],
                base=[dict(label=label, base=base_dist['counts'][i], input=0) for i, label in
                      enumerate(base_dist['labels'])],
                input=[dict(label=label, base=0, input=input_dist['counts'][i]) for i, label in
                       enumerate(input_dist['labels'])],
            )

        # # TODO should handle different types of distribution
        combined = []

        for i, label in enumerate(base_dist['labels']):
            input_labels = input_dist.get('labels', [])
            input_count = 0
            if label in input_labels:
                input_index = input_labels.index(label)
                input_count = input_dist.get('counts')[input_index]

            combined.append(dict(
                label=label,
                base=base_dist.get('counts')[i],
                input=input_count,
            ))

        for i, label in enumerate(input_dist['labels']):
            if label in base_dist['labels']:
                continue

            combined.append(dict(
                label=label,
                base=0,
                input=input_dist.get('counts')[i],
            ))

        if base_dist['type'] in ['yearly', 'monthly', 'daily']:
            combined.sort(key=lambda x: x['label'])

        return dict(
            column=base['name'],
            type=base_dist['type'],
            combined=combined,
        )

    def _transform_item(self, item, field, change_fields=None):
        transformed = dict(key=None, value=None, changed=False, )
        if item:
            transformed['key'] = item['name']
            if change_fields:
                transformed['value'] = item.get(field, None)
            else:
                transformed['value'] = item.get('metrics', {}).get(field, None)
                change_fields = [field]
            changes = item.get('changes', None)
            if changes:
                for change_field in change_fields:
                    transformed['changed'] |= changes.get(change_field, False)
        return transformed

    def _move_highest_to_top(self, metric, col_name):
        if len(self.detail[metric]['base']) > 0:
            self.detail[metric]['base'].insert(0, self.detail[metric]['base'].pop())
            self.detail[metric]['input'].insert(0, self.detail[metric]['input'].pop())
            self.summary[metric]['highest'] = col_name

    def to_json(self):
        for i, col_name in enumerate(self._column_names['base']):
            base_col = self._columns['base'].get(col_name, None)
            input_col_name = self._column_names['input'][i]
            input_col = self._columns['input'].get(input_col_name, None)

            # add schema changes
            self._add_column_item('schema',
                                  'base',
                                  self._transform_item(base_col, 'type', [
                                      'type_changed', 'deleted', 'added']),
                                  add_null=True)
            self._add_column_item('schema',
                                  'input',
                                  self._transform_item(input_col, 'type', [
                                      'type_changed', 'deleted', 'added']),
                                  add_null=True)

            # TODO: add distribution changes
            item = self._combine_distribute_item(base_col, input_col)
            if item:
                self.detail['distribution'].append(item)

            # add missing values changes
            self._add_column_item('missing_values',
                                  'base',
                                  self._transform_item(base_col, 'missing_values'))
            self._add_column_item('missing_values',
                                  'input',
                                  self._transform_item(input_col, 'missing_values'))

            # add range changes
            self._add_column_item('range', 'base', self._transform_item(base_col, 'range'))
            self._add_column_item('range', 'input', self._transform_item(input_col, 'range'))

            if base_col and input_col:
                if self._highest['missing_values']['column'] == col_name:
                    self._move_highest_to_top('missing_values', col_name)
                if self._highest['range']['column'] == col_name:
                    self._move_highest_to_top('range', col_name)

        output = dict(
            created_at=self._created_at.strftime('%Y-%m-%dT%H:%M:%S.%fZ'),
            table=self.table,
            summary=self.summary,
            detail=self.detail
        )
        return json.dumps(output)


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
                        except Exception:
                            pass
            return tables

        def _walk_throw_data_sources(path):
            outputs = []
            for root, dirs, files in os.walk(path):
                for dir in dirs:
                    if dir != 'latest':
                        tables = _walk_throw_tables(os.path.join(root, dir))
                        outputs.extend(tables)
            outputs.sort(key=lambda x: (x.name, x.created_at), reverse=True)
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
            self.console.print('Selected reports:')
            self.console.print(f'  Base:  {self.a.path}')
            self.console.print(f'  Input: {self.b.path}')
            return True
        return False

    def select_one_report(self) -> ProfilerOutput:
        def _report_validater(answers, current) -> bool:
            return len(current) == 1

        profiler_outputs = self.list_existing_outputs()

        if len(profiler_outputs) < 1:
            raise Exception("Not enough reports to compare. Please run 'piperider run' first.")

        questions = [
            inquirer_hack.LimitedCheckboxQuestion('profiler_output',
                                                  message="Please select a report to compare",
                                                  choices=profiler_outputs,
                                                  carousel=True,
                                                  validate=_report_validater,
                                                  limited=1,
                                                  )
        ]
        answers = inquirer_hack.prompt_ex(questions, raise_keyboard_interrupt=True)

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
            raise Exception("Not enough reports to compare. Please run 'piperider run' first.")

        questions = [
            inquirer_hack.LimitedCheckboxQuestion(
                'profiler_outputs',
                message="Please select the 2 reports to compare",
                choices=profiler_outputs,
                carousel=True,
                validate=_report_validater,
                limited=2,
            ),
        ]
        answers = inquirer_hack.prompt_ex(questions, raise_keyboard_interrupt=True)
        if answers:
            return answers['profiler_outputs'][0], answers['profiler_outputs'][1]
        return None, None

    def generate_data(self) -> ComparisonData:
        if self.a is None or self.b is None:
            raise Exception("Please select reports to compare first.")

        base = self.a.load()
        input = self.b.load()
        base_col_names = [v['name'] for v in base['columns'].values()]
        input_col_names = [v['name'] for v in input['columns'].values()]

        data = ComparisonData()
        data.add_table(base, input)

        for n in base_col_names:
            base_col = base['columns'].get(n, None)
            input_col = input['columns'].get(n, None)
            data.add_column(base_col, input_col)

            if n not in input_col_names:
                data.schema_changed('deleted', n)
                continue

            # check type changed
            if base_col['type'] != input_col['type']:
                data.schema_changed('type_changed', n)
                continue

            # compare ranges
            if base_col['type'] == 'numeric':
                base_col_min = base_col['min']
                base_col_max = base_col['max']
                input_col_min = input_col['min']
                input_col_max = input_col['max']
                if base_col_min != input_col_min or base_col_max != input_col_max:
                    # use Euclidean distance to calculate the distance between two ranges
                    # formula: sqrt( (min1-min2)^2 + (max1-max2)^2 )
                    value = math.sqrt(
                        math.pow(abs(base_col_min - input_col_min), 2) + math.pow(abs(base_col_max - input_col_max), 2)
                    )
                    data.record_highest('range', n, value)
                    data.metrics_changed('range', n, [base_col_min, base_col_max], [input_col_min, input_col_max])

            # compare missing values
            base_missing_values = 1 - (base_col['non_nulls'] / base_col['total'])
            input_missing_values = 1 - (input_col['non_nulls'] / input_col['total'])
            if base_missing_values != input_missing_values:
                value = abs(base_missing_values - input_missing_values)
                data.record_highest('missing_values', n, value)
                data.metrics_changed('missing_values', n, base_missing_values, input_missing_values)

            # compare distribution
            if base_col['distribution'] != input_col['distribution']:
                # TODO the highest of distribution changes
                data.metrics_changed('distribution', n, base_col['distribution'], input_col['distribution'])

        for n in input_col_names:
            input_col = input['columns'].get(n, None)
            if n not in base_col_names:
                data.add_column(None, input_col)
                data.schema_changed('added', n)

        return data
