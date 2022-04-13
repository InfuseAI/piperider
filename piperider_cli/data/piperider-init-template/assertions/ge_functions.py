from piperider_cli.great_expectations import ge_custom_assertion


@ge_custom_assertion.sql('shouldBeInDate')
@ge_custom_assertion.pandas('shouldBeInDate')
def should_be_in_date(column, **kwargs):
    return column > 3
