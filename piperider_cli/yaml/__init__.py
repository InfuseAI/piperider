from typing import Any, Callable

from ruamel import yaml
from ruamel.yaml import CommentedMap as _cm, CommentedSeq as _cs

_yaml = yaml.YAML()

CommentedMap = _cm
CommentedSeq = _cs
YAMLError = yaml.YAMLError


def load(stream) -> Any:
    return _yaml.load(stream)


def allow_duplicate_keys_loader() -> Callable:
    yml = yaml.YAML()
    yml.allow_duplicate_keys = True
    return yml.load


def safe_load(stream, version=None) -> Any:
    return yaml.safe_load(stream, version)


def dump(
        data, stream: Any = None, *, transform: Any = None
) -> Any:
    return _yaml.dump(data, stream, transform=transform)


def safe_load_yaml(file_path):
    try:
        with open(file_path, 'r') as f:
            payload = safe_load(f)
    except yaml.YAMLError as e:
        print(e)
        return None
    except FileNotFoundError:
        return None
    return payload


def round_trip_load_yaml(file_path):
    with open(file_path, 'r') as f:
        try:
            payload = load(f)
        except yaml.YAMLError as e:
            print(e)
            return None
    return payload


def round_trip_dump(
        data: Any,
        stream=None):
    return yaml.round_trip_dump(data, stream)
