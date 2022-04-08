"""
Auxiliary utility methods, IO, processing, etc.
"""
import json
from typing import Optional, Tuple, Union

from pandas import DataFrame, Series, Index, DatetimeIndex, PeriodIndex, TimedeltaIndex
from pandas.api.types import infer_dtype
from numpy import isclose
from sklearn.preprocessing import StandardScaler, MinMaxScaler

from .enum import DataFrameType


def test_load_json_path(json_path: str, encoding: Optional[str] = None) -> dict:
    """Tests file existence from given path and attempts to parse as a json dictionary.

    Args:
        json_path (str): A path to a json dictionary.
    Returns:
        json_dict (dict): The json dictionary loaded as Python dictionary.
    """
    if isinstance(json_path, str):
        with open(json_path, 'r', encoding=encoding) as b_stream:
            data = b_stream.read()
        json_dict = json.loads(data)
    else:
        raise IOError("Expected a path to a json file.")
    return json_dict


def random_split(df: Union[DataFrame, Series], split_size: float,
                 shuffle: bool = True, random_state: int = None) -> Tuple[DataFrame]:
    """Shuffles a DataFrame and splits it into 2 partitions according to split_size.
    Returns a tuple with the split first (partition corresponding to split_size, and remaining second).
    Args:
        df (DataFrame): A DataFrame to be split
        split_size (float): Fraction of the sample to be taken
        shuffle (bool): If True shuffles sample rows before splitting
        random_state (int): If an int is passed, the random process is reproducible using the provided seed"""
    assert random_state is None or (isinstance(random_state, int) and random_state >=
                                    0), 'The random seed must be a non-negative integer or None.'
    assert 0 <= split_size <= 1, 'split_size must be a fraction, i.e. a float in the [0,1] interval.'
    if shuffle:  # Shuffle dataset rows
        sample = df.sample(frac=1, random_state=random_state)
    split_len = int(sample.shape[0] * split_size)
    split = sample.iloc[:split_len]
    remainder = sample.iloc[split_len:]
    return split, remainder


def min_max_normalize(df: DataFrame, dtypes: dict) -> DataFrame:
    """Applies min-max normalization to the numerical features of the dataframe.

    Args:
        df (DataFrame): DataFrame to be normalized
        dtypes (dict): Map of column names to variable types"""
    numeric_features = [
        col for col in df.columns if dtypes.get(col) == 'numerical']
    if numeric_features:
        scaled_data = MinMaxScaler().fit_transform(df[numeric_features].values)
        df[numeric_features] = scaled_data
    return df


def standard_normalize(df: DataFrame, dtypes: dict) -> DataFrame:
    """Applies standard normalization (z-score) to the numerical features of the dataframe.

    Args:
        df (DataFrame): DataFrame to be normalized
        dtypes (dict): Map of column names to variable types"""
    numeric_features = [
        col for col in df.columns if dtypes.get(col) == 'numerical']
    if numeric_features:
        scaled_data = StandardScaler().fit_transform(
            df[numeric_features].values)
        df[numeric_features] = scaled_data
    return df


def find_duplicate_columns(df: DataFrame, is_close=False) -> dict:
    """Returns a mapping dictionary of columns with fully duplicated feature values.

    Arguments:
        is_close(bool): Pass True to use numpy.isclose instead of pandas.equals."""
    dups = {}
    for idx, col in enumerate(df.columns):     # Iterate through all the columns of dataframe
        ref = df[col]                          # Take the column values as reference.
        for tgt_col in df.columns[idx + 1:]:   # Iterate through all other columns
            if isclose(ref, df[tgt_col]).all() if is_close else ref.equals(df[tgt_col]):  # Take target values
                dups.setdefault(col, []).append(tgt_col)  # Store if they match
    return dups


def drop_column_list(df: DataFrame, column_list: dict, label: str = None):
    "Drops from a DataFrame a duplicates mapping of columns to duplicate lists. Works inplace."
    for col, dup_list in column_list.items():
        dup_list = [col for col in dup_list if col != label]
        if col in df.columns:  # Ensures we will not drop both members of duplicate pairs
            df.drop(columns=dup_list, index=dup_list, inplace=True)


def infer_dtypes(df: Union[DataFrame, Series], skip: Optional[Union[list, set]] = None):
    """Simple inference method to return a dictionary with list of numeric_features and categorical_features
    Note: The objective is not to substitute the need for passed dtypes but rather to provide expedite inferal between
    numerical or categorical features"""
    skip = [] if skip is None else skip
    dtypes = {}
    as_categorical = ['string',
                      'bytes',
                      'mixed-integer',
                      'mixed-integer-float',
                      'categorical',
                      'boolean',
                      'mixed']
    if isinstance(df, DataFrame):
        for column in df.columns:
            if column in skip:
                continue
            if infer_dtype(df[column]) in as_categorical:
                dtypes[column] = 'categorical'
            else:
                dtypes[column] = 'numerical'
    elif isinstance(df, Series):
        dtypes[df.name] = 'categorical' if infer_dtype(
            df) in as_categorical else 'numerical'
    return dtypes


def check_time_index(index: Index) -> bool:
    """Tries to infer from passed index column if the dataframe is a timeseries or not."""
    if isinstance(index, (DatetimeIndex, PeriodIndex, TimedeltaIndex)):
        return True
    return False


def infer_df_type(df: DataFrame) -> DataFrameType:
    """Simple inference method to dataset type."""
    if check_time_index(df.index):
        return DataFrameType.TIMESERIES
    return DataFrameType.TABULAR
