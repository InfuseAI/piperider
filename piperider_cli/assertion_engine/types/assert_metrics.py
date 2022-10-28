from datetime import datetime
from typing import Union, List

from piperider_cli.assertion_engine import AssertionContext, ValidationResult
from piperider_cli.assertion_engine.types.base import BaseAssertionType


class AssertMetric(BaseAssertionType):

    def __init__(self):
        self.mapping = MetricName()

    def name(self):
        return ''

    def execute(self, context: AssertionContext):
        table = context.table
        column = context.column
        metrics = context.profiler_result

        target_metrics = metrics.get('tables', {}).get(table)
        if column:
            target_metrics = target_metrics.get('columns', {}).get(column)

        if not target_metrics:
            return context.result.fail_with_metric_not_found_error(context.table, context.column)

        context.result.name = self.mapping.get(context.metric, target_metrics.get('type'))
        context.result.expected = self.to_interval_notation(context.asserts)

        if context.metric in target_metrics:
            if target_metrics.get(context.metric) is None:
                return context.result.fail()
        else:
            return context.result.fail_with_profile_metric_not_found_error(context.table, context.column, context.metric)

        value = target_metrics.get(context.metric)
        context.result.actual = value
        if not self.assert_metric_boundary(value, context.asserts):
            return context.result.fail()

        return context.result.success()

    def validate(self, context: AssertionContext) -> ValidationResult:
        results = ValidationResult(context)

        if not self.mapping.is_exist(context.metric):
            results.errors.append(f"cannot find a metric assertion by metric '{context.metric}'")

        names = ['gte', 'lte', 'gt', 'lt', 'eq', 'ne']
        results = results.allow_only(*names) \
            .require_metric_consistency(*names)

        if context.asserts is None:
            results.errors.append(f'At least one of {names} is needed.')

        if results.errors:
            return results

        self._assert_metric_validation(context.asserts, results)

        return results

    @staticmethod
    def to_interval_notation(asserts):
        if len(asserts.keys()) == 2:
            operators = {
                'lte': ']',
                'lt': ')',
                'gte': '[',
                'gt': '('
            }
            boundary = ''
            for k, v in asserts.items():
                if k.startswith('lt'):
                    boundary += f'{v}{operators[k]}'
                else:
                    boundary = f'{operators[k]}{v}, {boundary}'
            return boundary
        else:
            operators = {
                'gt': '>',
                'gte': '≥',
                'eq': '=',
                'ne': '≠',
                'lt': '<',
                'lte': '≤'
            }
            k, v = list(asserts.items())[0]
            return f'{operators[k]} {v}'

    @staticmethod
    def assert_metric_boundary(metric: Union[int, float, str], metric_boundary: dict) -> bool:
        if isinstance(metric, str):
            metric = datetime.fromisoformat(metric)

        for op, v in metric_boundary.items():
            if isinstance(v, str):
                v = datetime.fromisoformat(v)
            if op == 'gt' and not metric > v:
                return False
            elif op == 'gte' and not metric >= v:
                return False
            elif op == 'eq' and not metric == v:
                return False
            elif op == 'ne' and not metric != v:
                return False
            elif op == 'lt' and not metric < v:
                return False
            elif op == 'lte' and not metric <= v:
                return False
        return True

    @staticmethod
    def _assert_metric_validation(metric_boundary: dict, results: ValidationResult):
        if len(metric_boundary.keys()) == 1:
            pass
        elif len(metric_boundary.keys()) == 2:
            lower = None
            upper = None
            for op, v in metric_boundary.items():
                if op == 'eq' or op == 'ne':
                    results.errors.append("Only one operator allowed if the expression contains 'eq' and 'ne'")
                    return

                if op.startswith('lt'):
                    upper = v
                elif op.startswith('gt'):
                    lower = v

            if upper is None or lower is None:
                results.errors.append('Please specified your metric upper and lower boundary')
                return

            if isinstance(upper, str) and isinstance(lower, str):
                upper = datetime.fromisoformat(upper)
                lower = datetime.fromisoformat(lower)
            if upper < lower:
                results.errors.append("The 'lt' or 'lte' value should be greater than or equal to "
                                      "the 'gt' or 'gte' value.")
        else:
            results.errors.append('The number of operator should be 1 or 2.')


class MetricName:
    def __init__(self):
        self.mapping = {}
        self.all_type = 'ALL'

        # table metric
        self._add('row_count', 'row count')
        self._add('bytes', 'volume size')
        self._add('freshness', 'freshness')
        self._add('duplicate_rows', 'duplicate row count')
        self._add('duplicate_rows_p', 'duplicate row percentage')

        self._add('total', 'row count')
        self._add('samples', 'sample count')
        self._add('samples_p', 'sample percentage')
        self._add('nulls', 'missing count')
        self._add('nulls_p', 'missing percentage')
        self._add('non_nulls', 'non null count')
        self._add('non_nulls_p', 'non null percentage')
        self._add('invalids', 'invalid count')
        self._add('invalids_p', 'invalid percentage')
        self._add('valids', 'valid count')
        self._add('valids_p', 'valid percentage')
        self._add('zeros', 'zero count', ['integer', 'numeric'])
        self._add('zeros_p', 'zero percentage', ['integer', 'numeric'])
        self._add('negatives', 'negative value count', ['integer', 'numeric'])
        self._add('negatives_p', 'negative value percentage', ['integer', 'numeric'])
        self._add('positives', 'positive value count', ['integer', 'numeric'])
        self._add('positives_p', 'positive value percentage', ['integer', 'numeric'])
        self._add('zero_length', 'zero length string count', ['string'])
        self._add('zero_length_p', 'zero length string percentage', ['string'])
        self._add('non_zero_length', 'non zero length string count', ['string'])
        self._add('non_zero_length_p', 'non zero length string percentage', ['string'])
        self._add('trues', 'true count', ['boolean'])
        self._add('trues_p', 'true percentage', ['boolean'])
        self._add('falses', 'false count', ['boolean'])
        self._add('falses_p', 'false percentage', ['boolean'])
        self._add('min', 'min', ['integer', 'numeric', 'datetime'])
        self._add('max', 'max', ['integer', 'numeric', 'datetime'])
        self._add('avg', 'average', ['integer', 'numeric'])
        self._add('sum', 'sum', ['integer', 'numeric'])
        self._add('stddev', 'standard deviation', ['integer', 'numeric'])
        self._add('min', 'min length', ['string'])
        self._add('max', 'max length', ['string'])
        self._add('avg', 'average length', ['string'])
        self._add('stddev', 'std. deviation of length', ['string'])
        self._add('distinct', 'distinct count', ['integer', 'string', 'datetime'])
        self._add('distinct_p', 'distinct percentage', ['integer', 'string', 'datetime'])
        self._add('duplicates', 'duplicate count', ['integer', 'numeric', 'string', 'datetime'])
        self._add('duplicates_p', 'duplicate percentage', ['integer', 'numeric', 'string', 'datetime'])
        self._add('non_duplicates', 'non duplicate count', ['integer', 'numeric', 'string', 'datetime'])
        self._add('non_duplicates_p', 'non duplicate percentage', ['integer', 'numeric', 'string', 'datetime'])
        self._add('min', 'min', ['integer', 'numeric'])
        self._add('p5', '5th percentile', ['integer', 'numeric'])
        self._add('p25', '25th percentile ', ['integer', 'numeric'])
        self._add('p50', 'median', ['integer', 'numeric'])
        self._add('p75', '75th percentile', ['integer', 'numeric'])
        self._add('p95', '95th percentile', ['integer', 'numeric'])
        self._add('max', 'max', ['integer', 'numeric'])

    def _add(self, field, name, col_types: List[str] = None):
        if col_types is None or len(col_types) == 0:
            if self.all_type not in self.mapping:
                self.mapping[self.all_type] = {}
            self.mapping[self.all_type][field] = name
        else:
            for t in col_types:
                if t not in self.mapping:
                    self.mapping[t] = {}
                self.mapping[t][field] = name

    def get(self, field, col_type=None):
        name = self.mapping[self.all_type].get(field)

        if name is None and col_type is not None:
            name = self.mapping[col_type].get(field)

        if name is None:
            return field

        return name

    def is_exist(self, field):
        found = False
        for type_field_mapping in self.mapping.values():
            if field in type_field_mapping.keys():
                found = True
                break

        return found
