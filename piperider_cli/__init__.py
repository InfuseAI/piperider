import logging
import os
import re
import sys
import webbrowser
from datetime import datetime

from dateutil import tz
from ruamel import yaml

PIPERIDER_USER_HOME = os.path.expanduser('~/.piperider')
PIPERIDER_USER_PROFILE = os.path.join(PIPERIDER_USER_HOME, 'profile.yml')


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


def get_sentry_dns():
    dns_file = os.path.normpath(os.path.join(os.path.dirname(__file__), 'SENTRY_DNS'))
    with open(dns_file) as f:
        dns = f.read().strip()
        return dns


def get_user_id():
    with open(PIPERIDER_USER_PROFILE, 'r') as f:
        user_profile = yaml.YAML().load(f)
        return user_profile.get('user_id')


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


def set_sentry_env():
    if '.dev' in __version__:
        return 'development'
    elif re.match(r'^\d+\.\d+\.\d+\.\d{8}[a|b|rc]?.*$', __version__):
        return 'nightly'
    elif 'a' in __version__:
        return 'alpha'
    elif 'b' in __version__:
        return 'beta'
    elif 'rc' in __version__:
        return 'release-candidate'
    return 'production'


sentry_dns = get_sentry_dns()
sentry_env = set_sentry_env()


def ensure_directory_writable(directory):
    d = os.path.abspath(directory)

    if os.path.exists(d):
        if not os.path.isdir(directory):
            return False
        return os.access(d, os.W_OK)
    else:
        try:
            os.makedirs(directory)
            return True
        except BaseException:
            return False


def raise_exception_when_directory_not_writable(output):
    if output:
        if not ensure_directory_writable(output):
            raise Exception(f'The path "{output}" is not writable')


def safe_load_yaml(file_path):
    try:
        with open(file_path, 'r') as f:
            payload = yaml.safe_load(f)
    except yaml.YAMLError as e:
        print(e)
        return None
    except FileNotFoundError:
        return None
    return payload


def round_trip_load_yaml(file_path):
    with open(file_path, 'r') as f:
        try:
            payload = yaml.round_trip_load(f)
        except yaml.YAMLError as e:
            print(e)
            return None
    return payload


def open_report_in_browser(report_path='', is_cloud_path=False):
    protocol_prefix = "" if is_cloud_path else "file://"
    try:
        webbrowser.open(f"{protocol_prefix}{report_path}")
    except yaml.YAMLError as e:
        print(e)
        return None
