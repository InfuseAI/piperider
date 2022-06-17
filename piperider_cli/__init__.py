import logging
import os
import sys
from datetime import datetime
from dateutil import tz


def create_logger(name) -> logging.Logger:
    log_level = logging.WARNING
    if os.environ.get('PIPERIDER_LOG_LEVEL') == 'DEBUG':
        log_level = logging.DEBUG
    if os.environ.get('PIPERIDER_LOG_LEVEL') == 'INFO':
        log_level = logging.INFO

    log = logging.getLogger(name)
    log.setLevel(log_level)
    handler = logging.StreamHandler(sys.stderr)
    handler.setLevel(log_level)
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    log.addHandler(handler)
    return log


def get_assertion_dir():
    return os.environ.get('PIPERIDER_CUSTOM_ASSERTIONS_PATH', '')


def set_assertion_dir(dir):
    snap_dir = os.path.join(os.path.normpath(dir), '__snapshots__')
    if not os.path.exists(snap_dir):
        os.mkdir(snap_dir)
    os.environ['PIPERIDER_CUSTOM_ASSERTIONS_PATH'] = snap_dir


def get_version():
    version_file = os.path.normpath(os.path.join(os.path.dirname(__file__), 'VERSION'))
    with open(version_file) as fh:
        version = fh.read().strip()
        return version


def clone_directory(src, dst):
    if sys.version_info >= (3, 8):
        # dirs_exist_ok only available after 3.8
        import shutil
        shutil.copytree(src, dst, dirs_exist_ok=True)
    else:
        from distutils.dir_util import copy_tree
        copy_tree(src, dst)


def datetime_to_str(input, to_tzlocal=False):
    if not isinstance(input, datetime):
        raise ValueError(f"Invalid type: expect 'datetime', got '{type(input).__name__}'")
    if to_tzlocal:
        input = convert_to_tzlocal(input)
    output = input.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
    return output


def str_to_datetime(input: str, to_tzlocal=False):
    output = datetime.strptime(input, '%Y-%m-%dT%H:%M:%S.%fZ')
    if to_tzlocal:
        output = convert_to_tzlocal(output)
    return output


def convert_to_tzlocal(input):
    if not isinstance(input, datetime):
        raise ValueError(f"Invalid type: expect 'datetime', got '{type(input).__name__}'")
    from_zone = tz.tzutc()
    to_zone = tz.tzlocal()
    return input.replace(tzinfo=from_zone).astimezone(to_zone)


__version__ = get_version()
