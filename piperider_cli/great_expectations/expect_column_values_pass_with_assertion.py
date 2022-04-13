"""
This is a template for creating custom ColumnMapExpectations.
For detailed instructions on how to use it, please see:
    https://docs.greatexpectations.io/docs/guides/expectations/creating_custom_expectations/how_to_create_custom_column_map_expectations
"""

from typing import Optional

from great_expectations.core.expectation_configuration import ExpectationConfiguration
from great_expectations.exceptions import InvalidExpectationConfigurationError
from great_expectations.execution_engine import (
    PandasExecutionEngine,
    SparkDFExecutionEngine,
    SqlAlchemyExecutionEngine,
)
from great_expectations.expectations.expectation import ColumnMapExpectation
from great_expectations.expectations.metrics import (
    ColumnMapMetricProvider,
    column_condition_partial,
)
from sqlalchemy.sql.elements import ColumnClause
from pyspark.sql.column import Column

# This class defines a Metric to support your Expectation.
# For most ColumnMapExpectations, the main business logic for calculation will live in this class.
from piperider_cli.great_expectations import ge_custom_assertion


def find_delegation(engine_type: str, assertion_id: str):
    try:
        from piperider_cli.great_expectations.ge_custom_assertion import find_assert
        func = find_assert(engine_type, assertion_id)
        if not func:
            raise NotImplementedError(f'Cannot find assertion with id {assertion_id}')
        return func
    except Exception as e:
        raise e


class ColumnValuesPassAssertion(ColumnMapMetricProvider):
    # This is the id string that will be used to reference your metric.
    condition_metric_name = "column_values.pass_assertion"
    condition_value_keys = ("assertion_id", "params")

    @column_condition_partial(engine=PandasExecutionEngine)
    def _pandas(cls, column, **kwargs):
        func = find_delegation('pandas', kwargs.get('assertion_id'))
        return func(column, **kwargs)

    @column_condition_partial(engine=SqlAlchemyExecutionEngine)
    def _sqlalchemy(cls, column: ColumnClause, _dialect, **kwargs):
        func = find_delegation('sql', kwargs.get('assertion_id'))
        return func(column, **kwargs)

    @column_condition_partial(engine=SparkDFExecutionEngine)
    def _spark(cls, column: Column, **kwargs):
        func = find_delegation('spark', kwargs.get('assertion_id'))
        return func(column, **kwargs)


# This class defines the Expectation itself
class ExpectColumnValuesPassWithAssertion(ColumnMapExpectation):
    """Expect column values could pass check from PipeRider's assertion"""

    # These examples will be shown in the public gallery.
    # They will also be executed as unit tests for your Expectation.
    examples = [
        {
            "data": {
                "all_threes": [3, 3, 3, 3, 3],
                "some_zeroes": [3, 3, 3, 0, 0],
            },
            "tests": [
                {
                    "title": "basic_positive_test",
                    "exact_match_out": False,
                    "include_in_gallery": True,
                    "in": {"column": "all_threes", "assertion_id": "my-custom-assertion"},
                    "out": {
                        "success": True,
                    },
                },
                {
                    "title": "basic_negative_test",
                    "exact_match_out": False,
                    "include_in_gallery": True,
                    "in": {"column": "some_zeroes", "mostly": 0.8, "assertion_id": "my-custom-assertion"},
                    "out": {
                        "success": False,
                    },
                },
            ],
        }
    ]

    # This is the id string of the Metric used by this Expectation.
    # For most Expectations, it will be the same as the `condition_metric_name` defined in your Metric class above.
    map_metric = "column_values.pass_assertion"

    # This is a list of parameter names that can affect whether the Expectation evaluates to True or False
    success_keys = ("mostly", "assertion_id", "params")

    # This dictionary contains default values for any parameters that should have default values
    default_kwarg_values = {}

    # default_kwarg_values = {"assertion_id": None}

    # args_keys = (
    #     "assertion_id",
    # )

    def validate_configuration(
        self, configuration: Optional[ExpectationConfiguration]
    ) -> None:
        """
        Validates that a configuration has been set, and sets a configuration if it has yet to be set. Ensures that
        necessary configuration arguments have been provided for the validation of the expectation.

        Args:
            configuration (OPTIONAL[ExpectationConfiguration]): \
                An optional Expectation Configuration entry that will be used to configure the expectation
        Returns:
            None. Raises InvalidExpectationConfigurationError if the config is not validated successfully
        """

        super().validate_configuration(configuration)
        if configuration is None:
            configuration = self.configuration

        try:
            assert (
                configuration.kwargs.get("column")
            ), "column is required for custom assertion"
            assert (
                configuration.kwargs.get("assertion_id")
            ), "assertionId is required for custom assertion"
        except AssertionError as e:
            raise InvalidExpectationConfigurationError(str(e))

    # This object contains metadata for display in the public Gallery
    library_metadata = {
        "tags": [],  # Tags for this Expectation in the Gallery
        "contributors": [  # Github handles for all contributors to this Expectation.
            "@who",  # Don't forget to add your github handle here!
        ],
    }


if __name__ == "__main__":
    @ge_custom_assertion.spark('my-custom-assertion')
    @ge_custom_assertion.pandas('my-custom-assertion')
    @ge_custom_assertion.sql('my-custom-assertion')
    def _c_func(column, **kwargs):
        return column == 3


    ExpectColumnValuesPassWithAssertion().print_diagnostic_checklist()
