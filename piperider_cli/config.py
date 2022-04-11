from ruamel.yaml import YAML

yaml = YAML(typ="safe")

__all__ = ['load', 'load_stages', 'load_sources', 'get']


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

    def load_stages(self, file_path):
        data = self.load(file_path)
        verify_stages(data)
        return data

    def load_sources(self, file_path):
        data = self.load(file_path)
        verify_sources(data)
        return data

    def get(self, key=None):
        if key is None:
            return self.data
        return self.data[key]

    def get_stages(self, file_path):
        stages = self.data.get(file_path)
        if stages is None:
            stages = self.load_stages(file_path)
        return stages

    def get_sources(self, file_path):
        sources = self.data.get(file_path)
        if sources is None:
            sources = self.load_sources(file_path)
        return sources


def verify_sources(sources):
    if sources is None:
        raise Exception('Sources must be defined')

    if 'data' not in sources:
        raise Exception("Sources must contain 'data' key")

    data = sources['data']

    if 'type' not in data:
        raise Exception("Sources must contain 'type' key under data")

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


get = PipeRiderConfig().get
load = PipeRiderConfig().load
load_sources = PipeRiderConfig().load_sources
load_stages = PipeRiderConfig().load_stages
get_sources = PipeRiderConfig().get_sources
get_stages = PipeRiderConfig().get_stages

if __name__ == '__main__':
    print(PipeRiderConfig().load('data/examples/source_local.yml'))
