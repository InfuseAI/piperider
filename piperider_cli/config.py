import os.path

from ruamel.yaml import YAML

from piperider_cli.data import get_example_by_name

yaml = YAML(typ="safe")

__all__ = ['load', 'get']

DEFAULT_SOURCES_CONFIG = 'piperider/sources/local.yaml'
DEFAULT_STAGES_CONFIG = 'piperider/stages/local.yaml'


class Singleton(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(Singleton, cls).__call__(*args, **kwargs)
        return cls._instances[cls]


class PipeRiderConfig(metaclass=Singleton):
    data = {
        'sources': {},
        'stages': {}
    }

    def load(self, source_path=DEFAULT_SOURCES_CONFIG, stages_path=DEFAULT_STAGES_CONFIG):
        with open(source_path, "r") as f:
            self.data['sources'] = yaml.load(f)
        with open(stages_path, "r") as f:
            self.data['stages'] = yaml.load(f)
        return self.data

    def load_yaml(self, filename):
        with open(filename, "r") as f:
            return yaml.load(f)

    def get(self, key=None):
        if key is None:
            return self.data
        return self.data[key]


load = PipeRiderConfig().load
get = PipeRiderConfig().get

if __name__ == '__main__':
    print(PipeRiderConfig().load('data/examples/source_local.yml'))
