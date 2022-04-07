import os.path

from ruamel.yaml import YAML

from piperider_cli.data import get_example_by_name

yaml = YAML(typ="safe")

__all__ = ['load', 'get']


<<<<<<< HEAD
=======
def convert_to_ge_datasource(source_file):
    s = load(source_file)
    cfg = s['data']
    datasource_type = cfg['type']

    if 'file' == datasource_type:
        # a filename
        # directory
        get_example_by_name('datasources_filesystem.yml')
        pass
    pass


>>>>>>> 1324f09728c9091ff34aab9e145bf10f04262e66
class Singleton(type):
    _instances = {}

    def __call__(cls, *args, **kwargs):
        if cls not in cls._instances:
            cls._instances[cls] = super(Singleton, cls).__call__(*args, **kwargs)
        return cls._instances[cls]


class PipeRiderConfig(metaclass=Singleton):
    data = {}

    def load(self, file_path, key=None):
        with open(file_path, "r") as f:
            data = yaml.load(f)
            if key is None:
                self.data[file_path] = data
            else:
                self.data[key] = data
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
