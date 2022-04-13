from piperider_cli import custom_assertion


@custom_assertion.sql('shouldBeInDate')
@custom_assertion.pandas('shouldBeInDate')
def shouldBeInDate(column, **kwargs):
    return column > 3
