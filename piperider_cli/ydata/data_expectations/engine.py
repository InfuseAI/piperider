"""
Implementation of DataExpectationsReporter engine to run data expectations validation analysis.
"""
from typing import Optional

from pandas import DataFrame
from numpy import argmin

from ..core.warnings import Priority

from ..core import QualityEngine, QualityWarning
from ..utils.auxiliary import test_load_json_path
from ..utils.logger import NAME, get_logger


class DataExpectationsReporter(QualityEngine):
    """Main class to run data expectation validation analysis.
    Supports standard Great Expectations json reports from expectation suite validation runs.
    """

    # pylint: disable=super-init-not-called
    def __init__(self, severity: Optional[str] = None):  # Overrides base class init
        """
        severity (str, optional): Sets the logger warning threshold \
        to one of the valid levels [DEBUG, INFO, WARNING, ERROR, CRITICAL]
        """
        self._warnings = []  # reset the warnings to avoid duplicates
        self._logger = get_logger(NAME, level=severity)

    @property
    def tests(self):
        return ['_coverage_fraction', '_expectation_level_assessment', '_overall_assessment']

    def __between_value_error(self, expectation_summary: dict) -> tuple:
        """Computes deviation metrics of the observed value relative to the expectation range and the nearest bound.
        If the max and the min of the range coincide, deviation_relative_to_range is returned None.
        If the nearest bound is 0, deviation_relative_to_bound is not computed is returned None.
        Returns a signed tuple (deviation_relative_to_bound, deviation_relative_to_range).

        Args:
            expectation_summary (dict): An expectation subdirectory taken from the results_summary."""
        range_deviations = None
        bound_deviations = None
        observed = expectation_summary['result']['observed_value']
        column_name = expectation_summary['kwargs']['column']
        bounds = [expectation_summary['kwargs'][bound] for bound in ['min_value', 'max_value']]
        abs_dist_bounds = [abs(observed - bound) for bound in bounds]
        nearest_bound = bounds[argmin(abs_dist_bounds)]
        range_width = bounds[1] - bounds[0]
        deviation = observed - nearest_bound
        if range_width != 0:
            range_deviations = deviation / range_width
            range_deviation_string = f"\n\t- The observed deviation is of {range_deviations:.1f} min-max ranges."
        if nearest_bound != 0:
            bound_deviations = deviation / nearest_bound
            bound_deviation_string = f"\n\t- The observed value is {bound_deviations:.0%} deviated from the nearest \
bound of the expected range."
        self.store_warning(
            QualityWarning(
                test=QualityWarning.Test.EXPECTATION_ASSESSMENT_VALUE_BETWEEN,
                category=QualityWarning.Category.DATA_EXPECTATIONS, priority=Priority.P3,
                data=(range_deviations, bound_deviations),
                description=f"Column {column_name} - The observed value is outside of the expected range."
                            + (range_deviation_string if range_deviations else "")
                            + (bound_deviation_string if bound_deviations else "")
            )
        )
        return (range_deviations, bound_deviations)

    @staticmethod
    def _summarize_results(results_json_path: str) -> dict:
        """Tests and parses the results_json file, creates a metadata summary to support tests of the module.

        Args:
            results_json_path (str): A path to the json output from a Great Expectations validation run.
        Returns:
            results_summary (dict): A summarized version of the validation run output dictionary."""
        results_json = test_load_json_path(results_json_path)
        results_summary = {'OVERALL': {},
                           'EXPECTATIONS': {}}
        for idx_, expectation_results in enumerate(results_json["results"]):
            expectation_summary = {
                'results_format': "BASIC+" if "result" in expectation_results else "BOOLEAN_ONLY",
                "success": expectation_results['success'],
                "type": expectation_results['expectation_config']['expectation_type'],
                "kwargs": expectation_results['expectation_config']['kwargs'],
                "result": expectation_results['result']
            }
            expectation_kwargs = expectation_results['expectation_config']['kwargs']
            expectation_summary['is_table_expectation'] = expectation_summary['type'].startswith("expect_table_")
            expectation_summary['column_kwargs'] = {k: v for k,
                                                             v in expectation_kwargs.items() if k.startswith('column')}
            results_summary["EXPECTATIONS"][idx_] = expectation_summary

        overall_results = {
            'expectation_count': len(results_summary["EXPECTATIONS"]),
            'total_successes': sum([True for summary in results_summary["EXPECTATIONS"].values() if summary['success']])
        }
        try:
            overall_results["success_rate"] = overall_results["total_successes"] / overall_results["expectation_count"]
        except:
            overall_results["success_rate"] = None
        results_summary['OVERALL'] = overall_results
        return results_summary

    def _coverage_fraction(self, results_json_path: str, df: DataFrame, minimum_coverage: float = 0.75) -> float:
        """Compares the DataFrame column schema to the results json file to estimate validation coverage fraction.
        Ignores all table expectations (since these either are not comparing columns or are catchall expectations).

        Args:
            results_json_path (str): A path to the json output from a Great Expectations validation run.
            minimum_coverage (float): Minimum expected fraction of DataFrame columns covered by the expectation suite.
            df (DataFrame): The Pandas DataFrame that ran against the expectation suite, used to evaluate coverage.
        """
        results_summary = self._summarize_results(results_json_path)
        df_column_set = set(df.columns)
        column_coverage = set()
        for summary in results_summary['EXPECTATIONS'].values():
            if summary['is_table_expectation']:
                continue  # Table expectations are not considered
            for kwarg in summary['column_kwargs'].values():
                if isinstance(kwarg, str):
                    kwarg = [kwarg]
                column_coverage.update(kwarg)
        assert column_coverage.issubset(
            df_column_set), "The column mismatch suggests that the validation run originates from another DataFrame."
        coverage_fraction = len(column_coverage) / len(df_column_set)
        if coverage_fraction < minimum_coverage:
            self.store_warning(
                QualityWarning(
                    test=QualityWarning.Test.COVERAGE_FRACTION,
                    category=QualityWarning.Category.DATA_EXPECTATIONS, priority=Priority.P2,
                    data={'Columns not covered': df_column_set.difference(column_coverage)},
                    description=f"The provided DataFrame has a total expectation coverage of {coverage_fraction:.0%} \
of its columns, which is below the expected coverage of {minimum_coverage:.0%}."
                )
            )
        return len(column_coverage) / len(df_column_set)

    def _overall_assessment(self, results_json_path: str, error_tol: int = 0,
                            rel_error_tol: Optional[float] = None) -> list:
        """Controls for errors in the overall execution of the validation suite.
        Raises a warning if failed expectations are over the tolerance (0 by default).

        Args:
            results_json_path (str): A path to the json output from a Great Expectations validation run.
            error_tol (int): Defines how many failed expectations are tolerated.
            rel_error_tol (float): Defines the maximum fraction of failed expectations, overrides error_tol."""
        results_summary = self._summarize_results(results_json_path)
        failed_expectation_ids = [i for i, exp in enumerate(
            results_summary['EXPECTATIONS'].values()) if not exp['success']]
        if rel_error_tol:
            error_tol = results_summary['OVERALL']['expectation_count'] * rel_error_tol
        if results_summary['OVERALL']['expectation_count'] - results_summary['OVERALL']['total_successes'] > error_tol:
            self.store_warning(
                QualityWarning(
                    test=QualityWarning.Test.OVERALL_ASSESSMENT,
                    category=QualityWarning.Category.DATA_EXPECTATIONS, priority=Priority.P2,
                    data={'Failed expectation indexes': failed_expectation_ids},
                    description=f"{len(failed_expectation_ids)} expectations have failed, which is more than the \
implied absolute threshold of {int(error_tol)} failed expectations."
                )
            )
        return failed_expectation_ids

    def _expectation_level_assessment(self, results_json: dict) -> DataFrame:
        """Controls for errors in the expectation level of the validation suite.
        Calls expectation specific methods to analyze some of the expectation logs.

        Args:
            results_json (str): A path to the json output from a Great Expectations validation run."""
        expectations_summary = self._summarize_results(results_json)['EXPECTATIONS']
        expectation_level_report = DataFrame(
            index=expectations_summary.keys(),
            columns=[
                'Expectation type',
                'Successful?',
                'Error metric(s)'],
            dtype=object)
        for idx_, expectation_summary in expectations_summary.items():
            error_metric = None
            result = expectation_summary["success"]
            expectation_type = expectation_summary["type"]
            if result is False:
                # Expectation specific rules are called here
                if "between" in expectation_type and "quantile" not in expectation_type:
                    if expectation_summary['result'] and 'observed_value' in expectation_summary['result']:
                        error_metric = self.__between_value_error(expectation_summary)
            expectation_level_report.iloc[idx_] = [expectation_type, result, error_metric]
        return (expectation_level_report, {idx: expectations_summary[idx] for idx in expectation_level_report.index})

    # pylint: disable=too-many-arguments, arguments-differ
    def evaluate(self, results_json_path: str, df: DataFrame = None, error_tol: int = 0,
                 rel_error_tol: Optional[float] = None, minimum_coverage: Optional[float] = 0.75,
                 summary: bool = True) -> dict:
        """Runs tests to the validation run results and reports based on found errors.

        Args:
            results_json (str): A path to the json output from a Great Expectations validation run.
            df (DataFrame): The Pandas DataFrame that ran against the expectation suite, used to evaluate coverage.
            error_tol (int): Defines how many failed expectations are tolerated.
            rel_error_tol (float): Defines the maximum fraction of failed expectations, overrides error_tol.
            minimum_coverage (float): Minimum expected fraction of DataFrame columns covered by the expectation suite.
            summary (bool): Prints a report containing all the warnings detected during the data quality analysis.
        """
        df = df if isinstance(df, DataFrame) else None
        results = {}
        if df is not None:
            try:  # if anything fails
                results['Coverage Fraction'] = self._coverage_fraction(
                    results_json_path, df, minimum_coverage=minimum_coverage)
            except AssertionError as exc:  # print a Warning and log the message
                self._logger.critical(
                    "Canceled Data Expectations engine execution due to dataset-expectation suite mismatch.")
                return "[ERROR] Canceled computation. Original exception: " + f"{exc}"
        else:
            self._logger.error("A valid DataFrame was not passed, skipping coverage fraction test.")

        results['Overall Assessment'] = self._overall_assessment(results_json_path, error_tol, rel_error_tol)
        results['Expectation Level Assessment'] = self._expectation_level_assessment(results_json_path)
        self._clean_warnings()
        if summary:
            self._report()
        return results
