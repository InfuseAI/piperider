from ruamel.yaml import YAML

yaml = YAML(typ="safe")


def load(filename):
    with open(filename) as fh:
        return yaml.load(fh)


if __name__ == '__main__':
    print(load('data/examples/source_local.yml'))
