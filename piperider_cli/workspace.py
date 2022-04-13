import os
import shutil

from piperider_cli.data import get_example_by_name


def generate_file_from_example(example_file, output_path):
    working_dir = os.path.join(os.getcwd(), 'piperider')

    with open(os.path.join(working_dir, output_path), 'w') as fh:
        fh.write(get_example_by_name(example_file))


def init():
    from piperider_cli import data
    init_template_dir = os.path.join(os.path.dirname(data.__file__), 'piperider-init-template')
    working_dir = os.path.join(os.getcwd(), 'piperider')
    shutil.copytree(init_template_dir, working_dir, dirs_exist_ok=True)
