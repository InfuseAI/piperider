from piperider_cli.assertion_engine import AssertionContext, ValidationResult, AssertionResult
from piperider_cli.assertion_engine.types.assert_column_misc import \
    AssertColumnNotNull, \
    AssertColumnNull, \
    AssertColumnUnique, \
    AssertColumnExist, \
    AssertColumnValue
from piperider_cli.assertion_engine.types.assert_column_ranges import \
    AssertColumnMinInRange, \
    AssertColumnMaxInRange, \
    AssertColumnInRange
from piperider_cli.assertion_engine.types.assert_column_types import \
    AssertColumnSchemaType, \
    AssertColumnType, \
    AssertColumnInTypes
from piperider_cli.assertion_engine.types.assert_metrics import AssertMetric
from piperider_cli.assertion_engine.types.assert_rows import \
    AssertRowCountInRange, \
    AssertRowCount
from piperider_cli.assertion_engine.types.base import BaseAssertionType

custom_registry = {}


class _NotFoundAssertion(BaseAssertionType):

    def __init__(self, assertion_name):
        self.assertion_name = assertion_name

    def name(self):
        return self.assertion_name

    def execute(self, context: AssertionContext) -> AssertionResult:
        raise BaseException('this is not-found-assertion, cannot be used')

    def validate(self, context: AssertionContext) -> ValidationResult:
        result = ValidationResult(context)
        result.errors.append(f"cannot find an assertion by name '{context.name}'")
        return result


def register_assertion_function(typename: BaseAssertionType):
    instance: BaseAssertionType = typename()
    if instance.name() in custom_registry:
        raise ValueError(f'{instance.name()} has been registered by {custom_registry.get(instance.name())}')
    custom_registry[instance.name()] = instance


def get_assertion(name: str, metric: str) -> BaseAssertionType:
    if metric:
        return AssertMetric()

    if name not in custom_registry:
        return _NotFoundAssertion(name)
    return custom_registry[name]


register_assertion_function(AssertRowCountInRange)
register_assertion_function(AssertRowCount)

register_assertion_function(AssertColumnSchemaType)
register_assertion_function(AssertColumnType)
register_assertion_function(AssertColumnInTypes)

register_assertion_function(AssertColumnMinInRange)
register_assertion_function(AssertColumnMaxInRange)
register_assertion_function(AssertColumnInRange)

register_assertion_function(AssertColumnNotNull)
register_assertion_function(AssertColumnNull)
register_assertion_function(AssertColumnUnique)
register_assertion_function(AssertColumnExist)
register_assertion_function(AssertColumnValue)

if __name__ == '__main__':
    pass
