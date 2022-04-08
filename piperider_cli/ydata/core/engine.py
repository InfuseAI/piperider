"""
Implementation of abstract class for Data Quality engines.
"""
from abc import ABC
from collections import Counter
from typing import Optional

from numpy import random
from pandas import DataFrame

from ..utils.auxiliary import infer_df_type, infer_dtypes
from ..utils.logger import NAME, get_logger
from .warnings import Priority, QualityWarning, WarningStyling


# pylint: disable=too-many-instance-attributes
class QualityEngine(ABC):
    "Main class for running and storing data quality analysis."
    # pylint: disable=too-many-arguments
    def __init__(self,
                 df: DataFrame,
                 random_state: Optional[int] = None,
                 label: str = None,
                 dtypes: dict = None,
                 severity: Optional[str] = None):
        self._df = df
        self._df_type = None
        self._warnings = []
        self._logger = get_logger(NAME, level=severity)
        self._tests = []
        self._label = label
        self._dtypes = dtypes
        self._random_state = random_state

    @property
    def df(self):
        "Target of data quality checks."
        return self._df

    @property
    def label(self):
        "Property that returns the label under inspection."
        return self._label

    @label.setter
    def label(self, label: str):
        assert isinstance(label, str), "Property 'label' should be a string."
        assert label in self.df.columns, f"Provided label {label} does not exist as a DataFrame column."
        self._label = label

    @property
    def dtypes(self):
        "Infered dtypes for the dataset."
        if self._dtypes is None:
            self._dtypes = infer_dtypes(self.df)
        return self._dtypes

    @dtypes.setter
    def dtypes(self, dtypes: dict):
        if not isinstance(dtypes, dict):
            self._logger.warning("Property 'dtypes' should be a dictionary. Defaulting to all column dtypes inference.")
            dtypes = {}
        cols_not_in_df = [col for col in dtypes if col not in self.df.columns]
        if len(cols_not_in_df) > 0:
            self._logger.warning("Passed dtypes keys %s are not columns of the provided dataset.", cols_not_in_df)
        supported_dtypes = ['numerical', 'categorical']
        wrong_dtypes = [col for col, dtype in dtypes.items() if dtype not in supported_dtypes]
        if len(wrong_dtypes > 0):
            self._logger.warning(
                "Columns %s of dtypes where not defined with a supported dtype and will be inferred.",
                wrong_dtypes)
        dtypes = {key: val for key, val in dtypes.items() if key not in cols_not_in_df + wrong_dtypes}
        df_col_set = set(self.df.columns)
        dtypes_col_set = set(dtypes.keys())
        missing_cols = df_col_set.difference(dtypes_col_set)
        if missing_cols:
            _dtypes = infer_dtypes(self.df, skip=df_col_set.difference(missing_cols))
            for col, dtype in _dtypes.items():
                dtypes[col] = dtype
        self._dtypes = dtypes

    @property
    def df_type(self):
        "Infered type for the dataset."
        if self._df_type is None:
            self._df_type = infer_df_type(self.df)
        return self._df_type

    @property
    def random_state(self):
        "Last set random state."
        return self._random_state

    @random_state.setter
    def random_state(self, new_state):
        "Sets new state to random state."
        try:
            self._random_state = new_state
            random.seed(self.random_state)
        except TypeError:
            self._logger.warning(
                'An invalid random state was passed. Acceptable values are integers >= 0 or None. Setting to None.')
            self._random_state = None

    def _clean_warnings(self):
        """Deduplicates and sorts the list of warnings."""
        self._warnings = sorted(list(set(self._warnings)))  # Sort unique warnings by priority

    def store_warning(self, warning: QualityWarning):
        "Adds a new warning to the internal 'warnings' storage."
        self._warnings.append(warning)

    def get_warnings(self,
                     category: Optional[str] = None,
                     test: Optional[str] = None,
                     priority: Optional[Priority] = None):
        "Retrieves warnings filtered by their properties."
        self._clean_warnings()
        filtered = [w for w in self._warnings if w.category == category] if category else self._warnings
        filtered = [w for w in filtered if w.test == test] if test else filtered
        filtered = [w for w in filtered if w.priority == Priority(priority)] if priority else filtered
        return filtered  # sort by priority

    @property
    def tests(self):
        "List of individual tests available for the data quality checks."
        return self._tests

    def _report(self):
        "Prints a report containing all the warnings detected during the data quality analysis."
        self._clean_warnings()
        if not self._warnings:
            print(f'{WarningStyling.OKAY}No warnings found.{WarningStyling.ENDC}')
        else:
            prio_counts = Counter([warn.priority.value for warn in self._warnings])
            print(f'{WarningStyling.BOLD}Warnings:{WarningStyling.ENDC}')
            print(f'\tTOTAL: {len(self._warnings)} warning(s)')
            print(
                *
                (
                    f"\t{WarningStyling.BOLD}{WarningStyling.PRIORITIES[prio]}Priority {prio}{WarningStyling.ENDC}: \
{count} warning(s)" for prio,
                    count in prio_counts.items()),
                sep='\n')
            warns = [[warn for warn in self._warnings if warn.priority.value == level] for level in range(4)]
            for warn_list in warns:
                if len(warn_list) > 0:
                    print(warn_list[0].priority)
                print(*(f"\t{warn}" for warn in warn_list), sep='\n')

    def evaluate(self, summary: bool = True):
        """Runs all the individual tests available within the same suite. Returns a dict of (name: results).

        Arguments:
            summary (bool): Print a report containing all the warnings detected during the data quality analysis.
        """
        self._warnings = []  # reset the warnings
        results = {}
        for test in self.tests:
            try:  # if anything fails
                results[test] = getattr(self, test)()
            # pylint: disable=broad-except
            except Exception as exc:  # print a Warning and log the message
                self._logger.warning('Skipping %s due to failure during computation. \
See results folder of this test for further details.', test)
                results[test] = "[ERROR] Test failed to compute. Original exception: " + f"{exc}"

        if summary:
            self._report()

        return results
