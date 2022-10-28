import abc

from piperider_cli.assertion_engine import AssertionContext, AssertionResult
from piperider_cli.assertion_engine.assertion import ValidationResult


class BaseAssertionType(metaclass=abc.ABCMeta):

    @abc.abstractmethod
    def name(self):
        """
        function name of the assertion
        """
        pass

    @abc.abstractmethod
    def execute(self, context: AssertionContext) -> AssertionResult:
        pass

    @abc.abstractmethod
    def validate(self, context: AssertionContext) -> ValidationResult:
        pass
