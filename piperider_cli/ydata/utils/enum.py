"""
Custom implementations of Enums.
"""

from enum import Enum


class PredictionTask(Enum):
    "Enum of supported prediction tasks."
    CLASSIFICATION = 'classification'
    REGRESSION = 'regression'


class DataFrameType(Enum):
    "Enum of supported dataset types."
    TABULAR = 'tabular'
    TIMESERIES = 'timeseries'


class OrderedEnum(Enum):
    "Enum with support for ordering."

    def __ge__(self, other):
        if self.__class__ is other.__class__:
            return self.value >= other.value
        return NotImplemented

    def __gt__(self, other):
        if self.__class__ is other.__class__:
            return self.value > other.value
        return NotImplemented

    def __le__(self, other):
        if self.__class__ is other.__class__:
            return self.value <= other.value
        return NotImplemented

    def __lt__(self, other):
        if self.__class__ is other.__class__:
            return self.value < other.value
        return NotImplemented


class StringEnum(Enum):

    @classmethod
    def _missing_(cls, value):

        def _key_from_str_(cls, value: str):
            if value in cls.__members__:
                return cls(value)

            return None

        if isinstance(value, str):
            upper_value = value.upper()

            key = _key_from_str_(cls, upper_value)
            if key is not None:
                return key

            lower_value = value.lower()

            key = _key_from_str_(cls, lower_value)
            if key is not None:
                return key

        raise ValueError(f"{value} is not a valid {cls.__name__}")
