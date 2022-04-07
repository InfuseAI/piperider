import os

from piperider_cli.data import get_example_by_name


def init():
    working_dir = os.path.join(os.getcwd(), 'piperider')
    sub_dirs = ['tests', 'sources', 'stages', 'harness']

    if not os.path.exists(working_dir):
        for s in sub_dirs:
            os.makedirs(os.path.join(working_dir, s), exist_ok=True)

    with open(os.path.join(working_dir, 'sources', 'local.yaml'), 'w') as fh:
        fh.write(get_example_by_name('source_local.yml'))

    with open(os.path.join(working_dir, 'stages', 'local.yaml'), 'w') as fh:
        fh.write(get_example_by_name('stage_local.yml'))

    # create a stage to test the file

    # 1. init to create an example to use local file (a csv) by qrtt1
    # 2. sources/ local file convert to ge datasource
    # 3. stages/ read config and validate source and test structure (invoke with `run`)
