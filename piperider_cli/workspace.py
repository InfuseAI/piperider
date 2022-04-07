import os


def init():
    working_dir = os.path.join(os.getcwd(), 'piperider')
    sub_dirs = ['tests', 'sources', 'stages', 'harness']

    if not os.path.exists(working_dir):
        for s in sub_dirs:
            os.makedirs(os.path.join(working_dir, s), exist_ok=True)
