"""
Definition of a data quality warning.
"""

from typing import Any

from pydantic import BaseModel

from ..utils.enum import OrderedEnum, StringEnum


# pylint: disable=too-few-public-methods
class WarningStyling:
    """WarningStyling is a helper class for print messages.
    """
    PRIORITIES_F = {
        0: "\u001b[48;5;1m",
        1: "\u001b[48;5;209m",
        2: "\u001b[48;5;11m",
        3: "\u001b[48;5;69m"
    }
    PRIORITIES = {
        0: "\u001b[38;5;1m",
        1: "\u001b[38;5;209m",
        2: "\u001b[38;5;11m",
        3: "\u001b[38;5;69m"
    }
    OKAY = "\u001b[38;5;2m"
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


class Priority(OrderedEnum):
    """Priorities translate the expected impact of data quality issues.

    Priorities:
      P0: blocks using the dataset
      P1: heavy impact expected
      P2: allows usage but may block human-intelligible insights
      P3: minor impact, aesthetic
    """
    P0 = 0
    P1 = 1
    P2 = 2
    P3 = 3

    def __str__(self):
        "Priority {value}: {long description}"
        _descriptions = {
            0: 'blocks using the dataset',
            1: 'heavy impact expected',
            2: 'usage allowed, limited human intelligibility',
            3: 'minor impact, aesthetic'
        }
        return f"{WarningStyling.PRIORITIES[self.value]}{WarningStyling.BOLD}Priority {self.value}\
{WarningStyling.ENDC} - {WarningStyling.BOLD}{_descriptions[self.value]}{WarningStyling.ENDC}:"


class QualityWarning(BaseModel):
    """ Details for issues detected during data quality analysis.

    category: name of the test suite (e.g. 'Duplicates')
    test: name of the individual test (e.g. 'Exact Duplicates')
    description: long-text description of the results
    priority: expected impact of data quality warning
    data: sample data
    """

    class Category(StringEnum):
        BIAS_FAIRNESS = "BIAS&FAIRNESS"
        DATA_EXPECTATIONS = "DATA EXPECTATIONS"
        DATA_RELATIONS = "DATA RELATIONS"
        DUPLICATES = "DUPLICATES"
        ERRONEOUS_DATA = "ERRONEOUS DATA"
        LABELS = "LABELS"
        MISSINGS = "MISSINGS"
        SAMPLING = "SAMPLING"

    class Test(StringEnum):
        # BIAS&FAIRNESS
        PROXY_IDENTIFICATION = "PROXY IDENTIFICATION"
        SENSITIVE_ATTRIBUTE_PREDICTABILITY = "SENSITIVE ATTRIBUTE PREDICTABILITY"
        SENSITIVE_ATTRIBUTE_REPRESENTATIVITY = "SENSITIVE ATTRIBUTE REPRESENTATIVITY"

        # DATA EXPECTATIONS
        COVERAGE_FRACTION = "COVERAGE FRACTION"
        EXPECTATION_ASSESSMENT_VALUE_BETWEEN = "EXPECTATION ASSESSMENT - VALUE BETWEEN"
        OVERALL_ASSESSMENT = "OVERALL ASSESSMENT"

        # DATA RELATIONS
        COLLIDER_CORRELATIONS = "COLLIDER CORRELATIONS"
        CONFOUNDED_CORRELATIONS = "CONFOUNDED CORRELATIONS"
        HIGH_COLLINEARITY_CATEGORICAL = "HIGH COLLINEARITY - CATEGORICAL"
        HIGH_COLLINEARITY_NUMERICAL = "HIGH COLLINEARITY - NUMERICAL"

        # DUPLICATES
        DUPLICATE_COLUMNS = "DUPLICATE COLUMNS"
        ENTITY_DUPLICATES = "ENTITY DUPLICATES"
        EXACT_DUPLICATES = "EXACT DUPLICATES"

        # ERRONEOUS DATA
        FLATLINES = "FLATLINES"
        PREDEFINED_ERRONEOUS_DATA = "PREDEFINED ERRONEOUS DATA"

        # LABELS
        FEW_LABELS = "FEW LABELS"
        MISSING_LABELS = "MISSING LABELS"
        ONE_REST_PERFORMANCE = "ONE VS REST PERFORMANCE"
        OUTLIER_DETECTION = "OUTLIER DETECTION"
        TEST_NORMALITY = "TEST NORMALITY"
        UNBALANCED_CLASSES = "UNBALANCED CLASSES"

        # MISSINGS
        HIGH_MISSINGS = "HIGH MISSINGS"
        HIGH_MISSING_CORRELATIONS = "HIGH MISSING CORRELATIONS"
        MISSINGNESS_PREDICTION = "MISSINGNESS PREDICTION"

        # SAMPLING
        CONCEPT_DRIFT = "CONCEPT DRIFT"
        SAMPLE_COVARIATE_DRIFT = "SAMPLE COVARIATE DRIFT"
        SAMPLE_LABEL_DRIFT = "SAMPLE LABEL DRIFT"

    category: Category
    test: Test
    description: str
    priority: Priority
    data: Any = None

    #########################
    # String Representation #
    #########################
    def __str__(self):
        return f"{WarningStyling.PRIORITIES[self.priority.value]}*{WarningStyling.ENDC} {WarningStyling.BOLD}\
[{self.category.value}{WarningStyling.ENDC} - {WarningStyling.UNDERLINE}{self.test.value}]{WarningStyling.ENDC} \
{self.description}"

    ########################
    # Comparison Operators #
    ########################
    def __ge__(self, other):
        if self.__class__ is other.__class__:
            return self.priority >= other.priority
        return NotImplemented

    def __gt__(self, other):
        if self.__class__ is other.__class__:
            return self.priority > other.priority
        return NotImplemented

    def __le__(self, other):
        if self.__class__ is other.__class__:
            return self.priority <= other.priority
        return NotImplemented

    def __lt__(self, other):
        if self.__class__ is other.__class__:
            return self.priority < other.priority
        return NotImplemented

    ##########################
    #  Hashable Definition   #
    ##########################

    def __hash__(self):
        # Hashable definition is needed for storing the elements in a set.
        return hash((self.category, self.test, self.description, self.priority))

    def __eq__(self, other):
        if self.__class__ is other.__class__:
            return all(
                (
                    self.category == other.category,
                    self.test == other.test,
                    self.description == other.description,
                    self.priority == other.priority
                )
            )
        return NotImplemented
