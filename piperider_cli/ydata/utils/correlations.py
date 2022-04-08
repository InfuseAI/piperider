"""
Utilities for feature correlations.
"""

import warnings
from itertools import combinations
from typing import List, Optional

from matplotlib.pyplot import figure as pltfigure, show as pltshow
from numpy import (
    nan,
    fill_diagonal,
    ndarray,
    max as npmax,
    square,
    min as npmin,
    sqrt,
    unique,
    zeros,
    average,
    where,
    sum as npsum,
    multiply,
    subtract,
    ones,
    identity,
    diag,
    zeros_like,
    isnan,
    triu_indices_from,
)
from numpy.linalg import pinv
from pandas import DataFrame, Series, crosstab
from scipy.stats import chi2_contingency, pearsonr
from scipy.stats.distributions import chi2
from seaborn import diverging_palette, heatmap
from statsmodels.stats.outliers_influence import \
    variance_inflation_factor as vif

from .auxiliary import drop_column_list, find_duplicate_columns


def filter_associations(corrs: DataFrame, th: float,
                        name: str = 'corr', subset: Optional[List[str]] = None) -> Series:
    """Filters an association matrix for combinations above a threshold.

    Args:
        corrs (DataFrame): original asssociation matrix (e.g. pandas' corr, dython's compute_associations),
                            shape of (n_feats, n_feats) with association metric (e.g. pearson's correlation, theil's u)
                            as values
        th (float): filter for associations with absolute value higher than threshold
        name (str): name of the association metric
        subset (List[str], optional): list of feature names to subset original association values

    Returns
        corrs (Series): map of feature_pair to association metric value, filtered
    """
    corrs = corrs.copy()  # keep original
    fill_diagonal(corrs.values, nan)  # remove the same column pairs
    corrs = corrs[subset] if subset is not None else corrs  # subset features
    corrs = corrs[(corrs > th) | (corrs < -th)].melt(ignore_index=False).reset_index().dropna()  # subset by threshold
    corrs['features'] = ['_'.join(sorted((i.index, i.variable)))
                         for i in corrs.itertuples()]  # create the sorted pairs of feature names
    corrs.drop_duplicates('features', inplace=True)  # deduplicate combination pairs
    corrs.sort_values(by='value', ascending=False, inplace=True)  # sort by correlation
    corrs = corrs.set_index('features').rename(columns={'value': name})[name]  # rename and subset columns
    return corrs


def pearson_correlation(col1: ndarray, col2: ndarray) -> float:
    """Returns Pearson's correlation coefficient for col1 and col2.
    Used for numerical - numerical variable pairs.

    Args:
        col1 (ndarray): A numerical column with no null values
        col2 (ndarray): A numerical column with no null values"""
    return pearsonr(col1, col2)[0]


def unbiased_cramers_v(col1: ndarray, col2: ndarray) -> float:
    """Returns the unbiased Cramer's V correlation coefficient for col1 and col2.
    Used for categorical - categorical variable pairs.

    Args:
        col1 (ndarray): A categorical column with no null values
        col2 (ndarray): A categorical column with no null values"""
    n_elements = col1.size
    contingency_table = crosstab(col1, col2)
    chi_sq = chi2_contingency(contingency_table)[0]
    phi_sq = chi_sq / n_elements
    r_vals, k_vals = contingency_table.shape
    phi_sq_hat = npmax([0, phi_sq - ((r_vals - 1) * (k_vals - 1)) / (n_elements - 1)])
    k_hat = k_vals - square(k_vals - 1) / (n_elements - 1)
    r_hat = r_vals - square(r_vals - 1) / (n_elements - 1)
    den = npmin([k_hat - 1, r_hat - 1])
    return sqrt(phi_sq_hat / den) if den != 0 else nan  # Note: this is strictly positive


def correlation_ratio(col1: ndarray, col2: ndarray) -> float:
    """Returns the correlation ratio for col1 and col2.
    Used for categorical - numerical variable pairs.

    Args:
        col1 (ndarray): A categorical column with no null values
        col2 (ndarray): A numerical column with no null values"""
    uniques = unique(col1)
    if len(uniques) < 2:
        return nan
    y_x_hat = zeros(len(uniques))
    counts = zeros(len(uniques))
    for count, value in enumerate(uniques):
        y_x = col2[where(col1 == value)]
        counts[count] = y_x.size
        y_x_hat[count] = average(y_x)
    y_hat = average(y_x_hat, weights=counts)
    eta_2 = npsum(
        multiply(counts,
                 square(subtract(y_x_hat, y_hat)))) / npsum(square(subtract(col2, y_hat)))
    return sqrt(eta_2)  # Note: this is strictly positive


# pylint: disable=too-many-locals
def correlation_matrix(df: DataFrame, dtypes: dict, label: str, drop_dups: bool = False) -> DataFrame:
    """Returns the correlation matrix.
    The methods used for computing correlations are mapped according to the column dtypes of each pair."""
    corr_funcs = {  # Map supported correlation functions
        ('categorical', 'categorical'): unbiased_cramers_v,
        ('categorical', 'numerical'): correlation_ratio,
        ('numerical', 'numerical'): pearson_correlation,
    }
    corr_mat = DataFrame(data=identity(n=len(df.columns)), index=df.columns, columns=df.columns)
    p_vals = DataFrame(data=ones(shape=corr_mat.shape), index=df.columns, columns=df.columns)
    has_values = df.notnull().values
    df = df.values
    for row_count, col1 in enumerate(corr_mat):
        dtype1 = dtypes[col1]
        for col_count, col2 in enumerate(corr_mat):
            if row_count >= col_count:
                continue  # Diagonal was filled from the start, lower triangle is equal to top triangle
            dtype2 = dtypes[col2]
            dtype_sorted_ixs = sorted(list(zip([row_count, col_count], [dtype1, dtype2])), key=lambda x: x[1])
            key = tuple(col_dtype[1] for col_dtype in dtype_sorted_ixs)
            is_valid = has_values[:, row_count] & has_values[:, col_count]  # Valid indexes for computation
            try:
                vals = [df[is_valid, col_dtype[0]] for col_dtype in dtype_sorted_ixs]
                corr = corr_funcs[key](*vals)
            except ValueError:
                corr = None  # Computation failed
            corr_mat.loc[col1, col2] = corr_mat.loc[col2, col1] = corr
    if drop_dups:
        # Find duplicate row lists in absolute correlation matrix
        dup_pairs = find_duplicate_columns(corr_mat.abs(), True)
        drop_column_list(corr_mat, dup_pairs, label)
        drop_column_list(p_vals, dup_pairs, label)
    return corr_mat, p_vals


def partial_correlation_matrix(corr_matrix: DataFrame) -> DataFrame:
    """Returns the matrix of full order partial correlations.
    Uses the covariance matrix inversion method."""
    inv_corr_matrix = pinv(corr_matrix)
    _diag = diag(inv_corr_matrix)
    if isnan(_diag).any() or (_diag <= 0).any():
        return None
    scaled_diag = diag(sqrt(1 / _diag))
    partial_corr_matrix = -1 * (scaled_diag @ inv_corr_matrix @ scaled_diag)
    fill_diagonal(partial_corr_matrix, 1)  # Fixing scaling setting the diagonal to -1
    return DataFrame(data=partial_corr_matrix, index=corr_matrix.index, columns=corr_matrix.columns)


def correlation_plotter(mat: DataFrame, title: str = '', symmetric: bool = True):
    """Plots correlation matrix heatmaps.

    Args:
        mat (DataFrame): A correlations matrix (partial or zero order)
        title (str): A string to be used as plot title
        symmetric (bool): True to only plot the lower triangle (symmetric correlation matrix), False to plot all.
        """
    mask = None
    if symmetric:
        mat = mat.iloc[1:, :-1]
        mask = zeros_like(mat)
        mask[triu_indices_from(mask, 1)] = True

    mat.rename(columns=lambda x: x if len(x) <= 9 else x[:4] + '...' + x[-4:], inplace=True)
    pltfigure(figsize=(14, 14))
    axe = heatmap(
        mat, cbar=True, vmin=-1, vmax=1, mask=mask if symmetric else None, annot=True, square=True,
        cmap=diverging_palette(220, 20, as_cmap=True), fmt=".0%")
    if title:
        axe.set_title(title)
    axe.set_xticklabels(axe.get_xticklabels(), rotation=45, size=8)
    pltshow()


def vif_collinearity(data: DataFrame, dtypes: dict, label: str = None) -> Series:
    """Computes Variance Inflation Factors for the features of data.
    Disregards the label feature."""
    if label and label in data.columns:
        data = data.drop(columns=label)
    num_columns = [col for col in data.columns if dtypes[col] == 'numerical']
    data = data.dropna(subset=num_columns)
    warnings.filterwarnings("ignore", category=RuntimeWarning)
    if data.empty:
        vifs = {}
    else:
        vifs = {num_columns[i]: vif(data[num_columns].values, i) for i in range(len(data[num_columns].columns))}
    warnings.resetwarnings()
    return Series(data=vifs, dtype=float).sort_values(ascending=False)


# pylint: disable=too-many-locals
def chi2_collinearity(data: DataFrame, dtypes: dict, p_th: float, label: str = None) -> DataFrame:
    """Applies chi-squared test on all combinations of categorical variable pairs in a dataset.
    Disregards the label feature.
    Returns the average of chi-sq statistics found for significant tests (p<p_th) for each categorical variable.
    Returns also the adjusted chi2, i.e. the chi2 statistic that produces the same p-value in 2 degrees of freedom."""
    cat_vars = sorted([col for col in data.columns if (dtypes[col] == 'categorical' and col != label)])
    combs = list(combinations(cat_vars, 2))
    chis = {'Var1': [],
            'Var2': [],
            'Adjusted Chi2': [],
            'p-value': [],
            'Chi2 stat': [],
            'DoF': []}
    crit_chis = {}
    for comb in combs:
        cont = crosstab(data[comb[0]], data[comb[1]])
        chi, p_stat, dof, _ = chi2_contingency(cont)
        crit_chi = crit_chis.setdefault(dof, chi2.ppf(1 - p_th, dof))
        if chi > crit_chi:
            adj_chi = chi
            if dof != 2:
                adj_chi = chi2.ppf(1 - p_stat, 2)
            for list_, value in zip(chis.values(), [comb[0], comb[1], adj_chi, p_stat, chi, dof]):
                list_.append(value)
    return DataFrame(data=chis).sort_values(by='p-value', ascending=True).reset_index(drop=True)
