import inspect
from typing import Callable

from ruamel.yaml.comments import CommentedMap, CommentedSeq

import piperider_cli.assertion_engine.recommended_rules as recommended_rule_functions

recommended_rule_parameter_keys = ['table', 'column', 'profiling_result']


class AssertionRecommender:
    def __init__(self, assertions, profiling_result):
        self.assertions = assertions
        self.profiling_result = profiling_result
        self.recommended_rule_callbacks = []
        self.load_recommended_rules()
        pass

    def recommend(self):
        for table, ta in self.assertions.items():
            table_assertions: CommentedSeq = ta[table]['tests']
            for callback in self.recommended_rule_callbacks:
                function_name, assertion_values = callback(table, None, self.profiling_result)
                if function_name:
                    table_assertions.append(CommentedMap({
                        'name': function_name,
                        'assert': CommentedMap(assertion_values),
                        'tags': ['PIPERIDER_RECOMMENDED_ASSERTION']
                    }))
            for column, col in ta[table]['columns'].items():
                column_assertions = col['tests']
                for callback in self.recommended_rule_callbacks:
                    function_name, assertion_values = callback(table, column, self.profiling_result)
                    if function_name:
                        column_assertions.append(CommentedMap({
                            'name': function_name,
                            'assert': CommentedMap(assertion_values),
                            'tags': ['PIPERIDER_RECOMMENDED_ASSERTION']
                        }))
        # TODO: Return the summary of recommended assertions
        pass

    def load_recommended_rules(self):
        for k, callback in recommended_rule_functions.table_assertions.__dict__.items():
            if isinstance(callback, Callable):
                args = inspect.signature(callback)
                parameters = list(args.parameters.keys())
                if parameters == recommended_rule_parameter_keys:
                    self.recommended_rule_callbacks.append(callback)
                    pass
        pass


if __name__ == '__main__':
    pass
