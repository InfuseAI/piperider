import functools
import os
from typing import Dict, Callable


def check(assertion_id):
    def origin(func):
        register_custom_assert(assertion_id, func)
        return func

    return origin


__registry: Dict[str, Callable] = dict()


def register_custom_assert(assertion_id: str, assertion: Callable):
    if assertion_id in __registry:
        raise ValueError(f'duplicated id {assertion_id} in the registry')
    __registry[assertion_id] = assertion


def find_assert(assertion_id: str):
    return __registry.get(assertion_id)


def has_assertion_id(assertion_id: str):
    if assertion_id in __registry:
        return True
    return False

def get_assertion_dir():
    return os.environ.get('PIPERIDER_CUSTOM_ASSERTIONS_PATH', '')

def set_assertion_dir(dir):
    snap_dir = os.path.join(os.path.normpath(dir), '__snapshots__')
    if not os.path.exists(snap_dir):
        os.mkdir(snap_dir)
    os.environ['PIPERIDER_CUSTOM_ASSERTIONS_PATH'] = snap_dir
