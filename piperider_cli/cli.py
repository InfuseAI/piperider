import click

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
    pass


@cli.command()
def run():
    pass
