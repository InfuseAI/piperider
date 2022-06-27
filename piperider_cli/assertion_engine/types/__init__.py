from piperider_cli.assertion_engine.types.assert_column_misc import \
    AssertColumnNotNull, \
    AssertColumnNull, \
    AssertColumnUnique, \
    AssertColumnExist
from piperider_cli.assertion_engine.types.assert_column_ranges import \
    AssertColumnMinInRange, \
    AssertColumnMaxInRange, \
    AssertColumnInRange
from piperider_cli.assertion_engine.types.assert_column_types import \
    AssertColumnSchemaType, \
    AssertColumnType, \
    AssertColumnInTypes
from piperider_cli.assertion_engine.types.assert_rows import \
    AssertRowCountInRange, \
    AssertRowCount
from piperider_cli.assertion_engine.types.base import BaseAssertionType

custom_registry = {}


def register_assertion_function(typename: BaseAssertionType):
    instance: BaseAssertionType = typename()
    if instance.name() in custom_registry:
        raise ValueError(f'{instance.name()} has been registered by {custom_registry.get(instance.name())}')
    custom_registry[instance.name()] = instance


def get_assertion(function_name: str) -> BaseAssertionType:
    if function_name not in custom_registry:
        raise ValueError(f'cannot find an assertion by name {function_name}')
    return custom_registry[function_name]


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

if __name__ == '__main__':
    pass
