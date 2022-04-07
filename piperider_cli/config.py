from ruamel.yaml import YAML

from piperider_cli.data import get_example_by_name

yaml = YAML(typ="safe")

__all__ = ['load', 'get']


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
        return data

    def get(self, key=None):
        if key is None:
            return self.data
        return self.data[key]


def verify_sources(sources):
    if sources is None:
        raise Exception('Sources must be defined')

    if 'data' not in sources:
        raise Exception("Sources must contain 'data' key")

    data = sources['data']

    if 'type' not in data:
        raise Exception("Sources must contain 'data.type' key")

    # TODO: check different keys based on support types. Ex. s3,  bigquery, etc...
    return True


def verify_stages(stages):
    if stages is None:
        raise Exception('Stages must be defined')

    for key in stages.keys():
        if 'data' not in stages[key]:
            raise Exception(f'Stages {key} must contain "data" key')
        if 'tests' not in stages[key]:
            raise Exception(f'Stages {key} must contain "tests" key')
        for test in stages[key]['tests']:
            if 'function' not in test:
                raise Exception(f'Stages {key} must contain "function" key in tests')
            if 'column' not in test:
                raise Exception(f'Stages {key} must contain "column" key in tests')
            # TODO: check the value of function and column
    return True


load = PipeRiderConfig().load
get = PipeRiderConfig().get

if __name__ == '__main__':
    print(PipeRiderConfig().load('data/examples/source_local.yml'))
