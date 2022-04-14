from piperider_cli.custom_assertion import check


@check('my-should-be-in-date')
def should_be_in_date(column, **kwargs):
    # column is a DataFrame
    # check should return a bool
    return column > 3
