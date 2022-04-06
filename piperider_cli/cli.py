import click


@click.group()
def cli():
    click.echo('PipeRider CLI: Hello World!')
    pass


@cli.command()
def init():
    # generate ge configuration
    pass


@cli.command()
def report():
    # generate report from ge's checkpoint data
    pass
