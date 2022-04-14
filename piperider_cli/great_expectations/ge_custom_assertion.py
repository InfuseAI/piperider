import functools
from typing import Dict, Callable


def pandas(assertion_id):
    def origin(func):
        register_custom_assert('pandas', assertion_id, func)
        return func

    return origin


def sql(assertion_id):
    def origin(func):
        register_custom_assert('sql', assertion_id, func)
        return func

    return origin


def spark(assertion_id):
    def origin(func):
        register_custom_assert('spark', assertion_id, func)
        return func

    return origin


__registry: Dict[str, Dict[str, Callable]] = dict()


def register_custom_assert(engine: str, assertion_id: str, assertion: Callable):
    valid_engines = ['pandas', 'sql', 'spark']
    if engine not in valid_engines:
        raise ValueError(f'engine should be one of {valid_engines}')

    if engine not in __registry:
        __registry[engine] = dict()

    if assertion_id in __registry[engine]:
        raise ValueError(f'duplicated id {assertion_id} in the registry')

    __registry[engine][assertion_id] = assertion


def find_assert(engine: str, assertion_id: str):
    return __registry.get(engine, dict()).get(assertion_id)


def has_assertion_id(assertion_id: str):
    for r in __registry.values():
        if assertion_id in r:
            return True
    return False
