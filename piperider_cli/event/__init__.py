import os
import uuid
from ruamel import yaml
from piperider_cli.event.collector import Collector

PIPERIDER_USER_HOME = '~/.piperider'
PIPERIDER_USER_PROFILE = os.path.join(PIPERIDER_USER_HOME, 'profile.yml')

_collector = Collector()
_yml = yaml.YAML(typ='safe')

def init():
    api_key = os.environ['PIPERIDER_EVENT_API_KEY']
    user_id = None

    if not os.path.exists(PIPERIDER_USER_PROFILE):
        user_id = _generate_user_id()
    else:
        with open(PIPERIDER_USER_PROFILE, 'r') as f:
            profile = _yml.load(f)
            user_id = profile.get('user_id', None)

    if user_id is None:
        user_id = _generate_user_id()

    _collector.set_api_key(api_key)
    _collector.set_user_id(user_id)

def _generate_user_id():
    # TODO: handle mkdir error
    os.makedirs(PIPERIDER_USER_HOME)
    user_id = uuid.uuid4().hex
    with open(PIPERIDER_USER_PROFILE, 'w+') as f:
        _yml.dump({'user_id': user_id}, f)
    return user_id

def log_event():
    _collector.log_event('test')