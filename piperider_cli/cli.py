import click

from piperider_cli import config as cfg
from piperider_cli import workspace


@click.group()
def cli():
    pass


@cli.command()
def init():
    workspace.init()


@cli.command()
def report():
    # generate report from ge's checkpoint data
    pass


@cli.command()
def config():
    cfg.load('piperider/sources/local.yaml', key='sources')
    cfg.load('piperider/stages/local.yaml', key='stages')
    print(cfg.get())
    pass


@cli.command()
def run():
    pass
