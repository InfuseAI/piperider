import click

from piperider_cli import workspace


@click.group()
def cli():
    pass


@cli.command()
def init():
    # TODO show the process and message to users
    click.echo('Initialize piperider')
    workspace.init()


@cli.command()
def run():
    # TODO check the args are "stages" files
    # invoke the stage -> piperider_cli.data.execute_great_expectation
    # generate the report file or directory
    pass
