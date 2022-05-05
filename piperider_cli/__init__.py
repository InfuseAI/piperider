import logging
import os
import sys

import click


def create_logger(name) -> logging.Logger:
    log_level = logging.WARNING
    if os.environ.get('PIPERIDER_LOG_LEVEL') == 'DEBUG':
        log_level = logging.DEBUG
    if os.environ.get('PIPERIDER_LOG_LEVEL') == 'INFO':
        log_level = logging.INFO

    log = logging.getLogger(name)
    log.setLevel(log_level)
    handler = logging.StreamHandler(sys.stderr)
    handler.setLevel(log_level)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    log.addHandler(handler)
    return log


class Stage(object):

    def __init__(self, stage_file, name, content):
        self.stage_file_obj = stage_file
        self.stage_file = stage_file.stage_file
        self.name = name
        self.content = content
        self.source_file = None

        self._load_source()

    def show_progress(self, console=None):
        if console is None:
            click.echo(
                f'Process stage [{os.path.basename(self.stage_file).split(".")[0]}:{self.name}]')
        else:
            console.rule(f'[bold green][Process stage] {os.path.basename(self.stage_file).split(".")[0]}:{self.name}',
                         align='left')

    def show_result(self, console=None, error=None):
        stage_name = f'{os.path.basename(self.stage_file).split(".")[0]}:{self.name}'

        if console:
            if error is not None:
                click.echo(f'Skipped stage [{stage_name}] Error: {error}')
                console.rule(f'[bold red][Failed] {stage_name}', align='left')
            else:
                console.rule(f'[bold green][Pass] {stage_name}', align='left')

    def _load_source(self):
        if 'data' not in self.content:
            raise ValueError('data is required field')

        source_name = self.content['data']
        self.source_file = os.path.abspath(
            os.path.join(os.path.dirname(self.stage_file), '../sources', f'{source_name}.yaml'))

    def tests(self):
        return self.content['tests']


class StageFile(object):

    def __init__(self, stage_file):
        self.stage_file = stage_file
        from piperider_cli.config import load_stages
        self.stage_content: dict = load_stages(stage_file)
        self.filename = stage_file

    def stages(self):
        for k in self.stage_content.keys():
            yield Stage(self, k, self.stage_content[k])

    def get(self, name):
        if name in self.stage_content:
            return Stage(self, name, self.stage_content[name])


def get_assertion_dir():
    return os.environ.get('PIPERIDER_CUSTOM_ASSERTIONS_PATH', '')


def set_assertion_dir(dir):
    snap_dir = os.path.join(os.path.normpath(dir), '__snapshots__')
    if not os.path.exists(snap_dir):
        os.mkdir(snap_dir)
    os.environ['PIPERIDER_CUSTOM_ASSERTIONS_PATH'] = snap_dir
