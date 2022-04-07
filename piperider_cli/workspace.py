import os

from piperider_cli.data import get_example_by_name


def generate_file_from_example(example_file, output_path):
    working_dir = os.path.join(os.getcwd(), 'piperider')

    with open(os.path.join(working_dir, output_path), 'w') as fh:
        fh.write(get_example_by_name(example_file))


def init():
    working_dir = os.path.join(os.getcwd(), 'piperider')
    sub_dirs = ['tests', 'sources', 'stages', 'harness']

    if not os.path.exists(working_dir):
        for s in sub_dirs:
            os.makedirs(os.path.join(working_dir, s), exist_ok=True)

    generate_file_from_example('source_local.yml', 'sources/local.yaml')
    generate_file_from_example('stage_local.yml', 'stages/local.yaml')
    generate_file_from_example('data.csv', 'data.csv')

    # create a stage to test the file

    # 2. sources/ local file convert to ge datasource
    # 3. stages/ read config and validate source and test structure (invoke with `run`)
