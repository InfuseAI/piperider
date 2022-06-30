from piperider_cli.assertion_engine.assertion import AssertionContext, AssertionResult, ValidationResult
from piperider_cli.assertion_engine.types import BaseAssertionType, register_assertion_function


class UserDefinedTests(BaseAssertionType):
    def name(self):
        return 'user-defined-test-test'

    def execute(self, context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
        context.result.actual = 'I see you'
        context.result._expected = dict(magic_number=5566)
        return context.result.success()

    def validate(self, context: AssertionContext) -> ValidationResult:
        result = ValidationResult(context)
        result.errors.append('explain to users why this broken')
        return result


register_assertion_function(UserDefinedTests)
