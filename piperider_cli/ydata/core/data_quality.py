"""
Implementation of main class for Data Quality checks.
"""
from collections import Counter
from typing import Callable, List, Optional, Union

from pandas import DataFrame

from ..bias_fairness import BiasFairness
from ..data_expectations import DataExpectationsReporter
from ..data_relations import DataRelationsDetector
from ..drift import DriftAnalyser
from ..duplicates import DuplicateChecker
from ..erroneous_data import ErroneousDataIdentifier
from ..labelling import label_inspector_dispatch
from ..missings import MissingsProfiler
from ..utils.logger import NAME, get_logger
from .warnings import Priority, QualityWarning, WarningStyling


# pylint: disable=too-many-locals
class DataQuality:
    "DataQuality contains the multiple data quality engines."
    # pylint: disable=too-many-arguments
    def __init__(self,
                 df: DataFrame,
                 label: str = None,
                 random_state: Optional[int] = None,
                 entities: Optional[List[Union[str, List[str]]]] = None,
                 is_close: bool = False,
                 ed_extensions: Optional[list] = None,
                 sample: Optional[DataFrame] = None,
                 model: Callable = None,
                 results_json_path: str = None,
                 error_tol: int = 0,
                 rel_error_tol: Optional[float] = None,
                 minimum_coverage: Optional[float] = 0.75,
                 sensitive_features: Optional[List[str]] = None,
                 dtypes: Optional[dict] = None,
                 corr_th: float = 0.8,
                 vif_th: float = 5,
                 p_th: float = 0.05,
                 plot: bool = False,
                 severity: str = 'ERROR'):
        """
        Engines:
        - Duplicates
        - Missing Values
        - Labelling
        - Erroneous Data
        - Drift Analysis
        - Data Expectations
        - Bias & Fairness
        - Data Relations

        Args:
            df (DataFrame): reference DataFrame used to run the DataQuality analysis.
            label (str, optional): [MISSINGS, LABELLING, DRIFT ANALYSIS] target feature to be predicted.
                                    If not specified, LABELLING is skipped.
            random_state (int, optional): Integer seed for random reproducibility. Default is None.
                Set to None for fully random behavior, no reproducibility.
            entities: [DUPLICATES] entities relevant for duplicate analysis.
            is_close: [DUPLICATES] Pass True to use numpy.isclose instead of pandas.equals in column comparison.
            ed_extensions: [ERRONEOUS DATA] A list of user provided erroneous data values to append to defaults.
            sample: [DRIFT ANALYSIS] data against which drift is tested.
            model: [DRIFT ANALYSIS] model wrapped by ModelWrapper used to test concept drift.
            results_json (str): [EXPECTATIONS] A path to the json output from a Great Expectations validation run.
            error_tol (int): [EXPECTATIONS] Defines how many failed expectations are tolerated.
            rel_error_tol (float): [EXPECTATIONS] Defines the maximum fraction of failed expectations, \
                overrides error_tol.
            minimum_coverage (float): [EXPECTATIONS] Minimum expected fraction of DataFrame columns covered by the \
                expectation suite.
            sensitive_features (List[str]): [BIAS & FAIRNESS] features deemed as sensitive attributes
            dtypes (Optional[dict]): Maps names of the columns of the dataframe to supported dtypes. Columns not \
                specified are automatically inferred.
            corr_th (float): [DATA RELATIONS] Absolute threshold for high correlation detection. Defaults to 0.8.
            vif_th (float): [DATA RELATIONS] Variance Inflation Factor threshold for numerical independence test, \
                typically 5-10 is recommended. Defaults to 5.
            p_th (float): [DATA RELATIONS] Fraction of the right tail of the chi squared CDF defining threshold for \
                categorical independence test. Defaults to 0.05.
            plot (bool): Pass True to produce all available graphical outputs, False to suppress all graphical output.
            severity (str): Sets the logger warning threshold.
                Valid levels are: [DEBUG, INFO, WARNING, ERROR, CRITICAL]
        """
        entities = [] if entities is None else entities
        ed_extensions = [] if ed_extensions is None else ed_extensions
        sensitive_features = [] if sensitive_features is None else sensitive_features
        dtypes = {} if dtypes is None else dtypes

        self.df = df
        self._warnings = []
        self._logger = get_logger(NAME, level=severity)
        self._random_state = random_state

        self._engines_legacy = {  # Default list of engines
            'duplicates': DuplicateChecker(df=df, entities=entities, is_close=is_close, severity=severity),
            'missings': MissingsProfiler(df=df, label=label, random_state=self.random_state, severity=severity),
            'erroneous-data': ErroneousDataIdentifier(df=df, ed_extensions=ed_extensions, severity=severity),
            'drift': DriftAnalyser(ref=df, sample=sample, label=label, model=model, random_state=self.random_state,
                                   severity=severity)
        }

        self._engines_new = {'data-relations': DataRelationsDetector(severity=severity)}
        self._eval_args = {  # Argument lists for different engines
            # TODO: centralize shared args in a dictionary to pass just like a regular kwargs to engines,
            # pass specific args in arg list (define here). In new standard all engines can be run at the evaluate
            # method only, the evaluate run expression can then be:
            # results = {name: engine.evaluate(*self._eval_args.get(name,[]), **shared_args)
            # for name, engine in self.engines.items()}
            'expectations': [results_json_path, df, error_tol, rel_error_tol, minimum_coverage],
            'data-relations': [df, dtypes, label, corr_th, vif_th, p_th, plot]
        }

        # Engines based on mandatory arguments
        if label is not None:
            self._engines_legacy['labelling'] = label_inspector_dispatch(df=df, label=label,
                                                                         random_state=self.random_state,
                                                                         severity=severity)
        else:
            self._logger.warning('Label is not defined. Skipping LABELLING engine.')
        if len(sensitive_features) > 0:
            self._engines_legacy['bias&fairness'] = BiasFairness(df=df, sensitive_features=sensitive_features,
                                                                 label=label, random_state=self.random_state,
                                                                 severity=severity)
        else:
            self._logger.warning('Sensitive features not defined. Skipping BIAS & FAIRNESS engine.')
        if results_json_path is not None:
            self._engines_new['expectations'] = DataExpectationsReporter(severity=severity)
        else:
            self._logger.warning(
                'The path to a Great Expectations results json is not defined. Skipping EXPECTATIONS engine.')

    def _clean_warnings(self):
        """Deduplicates and sorts the list of warnings."""
        self._warnings = sorted(list(set(self._warnings)))  # Sort unique warnings by priority

    def get_warnings(self,
                     category: Optional[Union[QualityWarning.Category, str]] = None,
                     test: Optional[Union[QualityWarning.Test, str]] = None,
                     priority: Optional[Priority] = None) -> List[QualityWarning]:
        "Retrieves warnings filtered by their properties."

        category = QualityWarning.Category(category) if category is not None else None
        test = QualityWarning.Test(test) if test is not None else None

        self._store_warnings()
        self._clean_warnings()
        filtered = [w for w in self._warnings if w.category == category] if category else self._warnings
        filtered = [w for w in filtered if w.test == test] if test else filtered
        filtered = [w for w in filtered if w.priority == Priority(priority)] if priority else filtered
        return filtered

    @property
    def engines(self):
        "Dictionary of instantiated engines to run data quality analysis."
        return {**self._engines_legacy, **self._engines_new}

    @property
    def random_state(self):
        "Random state passed to individual engines on evaluate."
        return self._random_state

    @random_state.setter
    def random_state(self, new_state):
        "Sets new state to random state."
        if new_state is None or (isinstance(new_state, int) and new_state >= 0):
            self._random_state = new_state
        else:
            self._logger.warning(
                'An invalid random state was passed. Acceptable values are integers >= 0 or None. Setting to None \
(no reproducibility).')
            self._random_state = None

    def _store_warnings(self):
        "Appends all warnings from individiual engines into warnings of DataQuality main class."
        for engine in self.engines.values():
            self._warnings += engine.get_warnings()

    def evaluate(self, summary: bool = True) -> dict:
        """Runs all the individual data quality checks and aggregates the results.

        Arguments:
            summary (bool): Print a report containing all the warnings detected during the data quality analysis.
        """
        results = {name: engine.evaluate(*self._eval_args.get(name, []), summary=False)
                   for name, engine in self.engines.items()
                   }
        self._store_warnings()  # fetch all warnings from the engines
        self._clean_warnings()
        if summary:
            self._report()

        return results

    def _report(self):
        "Prints a report containing all the warnings detected during the data quality analysis."
        self._clean_warnings()
        if not self._warnings:
            print(f'{WarningStyling.OKAY}No warnings found.{WarningStyling.ENDC}')
        else:
            prio_counts = Counter([warn.priority.value for warn in self._warnings])
            print(f'{WarningStyling.BOLD}Warnings:{WarningStyling.ENDC}')
            print(f'\tTOTAL: {len(self._warnings)} warning(s)')
            print(*(f"\t{WarningStyling.BOLD}{WarningStyling.PRIORITIES[prio]}Priority {prio}{WarningStyling.ENDC}: \
{count} warning(s)" for prio, count in prio_counts.items()), sep='\n')
            warns = [[warn for warn in self._warnings if warn.priority.value == level] for level in range(4)]
            for warn_list in warns:
                if len(warn_list) > 0:
                    print(warn_list[0].priority)
                print(*(f"\t{warn}" for warn in warn_list), sep='\n')
