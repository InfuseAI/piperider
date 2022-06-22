import inspect
from typing import Callable, List

from ruamel.yaml.comments import CommentedMap, CommentedSeq

from piperider_cli.assertion_engine.recommended_rules import RecommendedAssertion, RecommendedRules

recommended_rule_parameter_keys = ['table', 'column', 'profiling_result']


class AssertionRecommender:
    def __init__(self, assertions, profiling_result):
        self.assertions = assertions
        self.profiling_result = profiling_result
        self.recommended_rule_callbacks = []
        self.load_recommended_rules()
        pass

    def recommend(self) -> List[RecommendedAssertion]:
        assertions = []
        for table, ta in self.assertions.items():
            table_assertions: CommentedSeq = ta[table]['tests']
            for callback in self.recommended_rule_callbacks:
                assertion: RecommendedAssertion = callback(table, None, self.profiling_result)
                if assertion:
                    table_assertions.append(CommentedMap({
                        'name': assertion.name,
                        'assert': CommentedMap(assertion.asserts),
                        'tags': ['PIPERIDER_RECOMMENDED_ASSERTION']
                    }))
                    assertion.table = table
                    assertions.append(assertion)
            for column, col in ta[table]['columns'].items():
                column_assertions = col['tests']
                for callback in self.recommended_rule_callbacks:
                    assertion: RecommendedAssertion = callback(table, column, self.profiling_result)
                    if not assertion:
                        continue

                    assertion.table = table
                    assertion.column = column
                    if assertion.asserts:
                        column_assertions.append(CommentedMap({
                            'name': assertion.name,
                            'assert': CommentedMap(assertion.asserts),
                            'tags': ['PIPERIDER_RECOMMENDED_ASSERTION']
                        }))
                    else:
                        column_assertions.append(CommentedMap({
                            'name': assertion.name,
                            'tags': ['PIPERIDER_RECOMMENDED_ASSERTION']
                        }))
                    assertions.append(assertion)
        return assertions

    def load_recommended_rules(self):
        for k, callback in RecommendedRules.__dict__.items():
            if isinstance(callback, Callable):
                args = inspect.signature(callback)
                parameters = list(args.parameters.keys())
                if parameters == recommended_rule_parameter_keys:
                    self.recommended_rule_callbacks.append(callback)
                    pass
        pass
