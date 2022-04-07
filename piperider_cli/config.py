from ruamel.yaml import YAML

from piperider_cli.data import get_example_by_name

yaml = YAML(typ="safe")


def load(filename):
    with open(filename) as fh:
        return yaml.load(fh)


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


if __name__ == '__main__':
    ds = load('data/examples/source_local.yml')
    print(ds)
