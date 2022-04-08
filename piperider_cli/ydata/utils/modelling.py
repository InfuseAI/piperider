"""
Utilities based on building baseline machine learning models.
"""
from typing import Union, Optional

from pandas import DataFrame, Series
from numpy import mean, tile, empty, std, square, sqrt, log as nplog, reciprocal
from scipy.stats import boxcox, normaltest, mode
from sklearn.compose import ColumnTransformer
from sklearn.exceptions import ConvergenceWarning, DataConversionWarning
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.metrics import mean_squared_error, roc_auc_score
from sklearn.mixture import GaussianMixture
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import (FunctionTransformer, OneHotEncoder,
                                   RobustScaler, StandardScaler,
                                   label_binarize)
from sklearn.utils._testing import ignore_warnings

from .auxiliary import infer_dtypes
from .enum import PredictionTask

BASELINE_CLASSIFIER = Pipeline([
    ('imputer', SimpleImputer()),
    ('classifier', LogisticRegression())
])

BASELINE_REGRESSION = Pipeline([
    ('imputer', SimpleImputer()),
    ('classifier', LinearRegression())
])

NUMERIC_TRANSFORMER = Pipeline([
    ('imputer', SimpleImputer()),
    ('scaler', StandardScaler())])

CATEGORICAL_TRANSFORMER = Pipeline([
    ('imputer', SimpleImputer(strategy='most_frequent')),
    ('encoder', OneHotEncoder(handle_unknown='ignore'))])

ORDINAL_TRANSFORMER = None  # Not implemented


def get_prediction_task(df: DataFrame, label: str):
    "Heuristics to infer prediction task (classification/regression)."

    return 'classification' if len(set(df[label])) == 2 else 'regression'


@ignore_warnings(category=ConvergenceWarning)
def baseline_predictions(df: DataFrame, label: str, task='classification'):
    "Train a baseline model and predict for a test set"

    # 0. Infer the prediction task
    task = get_prediction_task(df=df, label=label)

    # 1. Define the baseline model
    model = BASELINE_CLASSIFIER if task == 'classification' else BASELINE_REGRESSION

    # 2. Train overall model
    x_orig, y_orig = df.drop(label, axis=1), label_binarize(df[label], classes=list(set(df[label])))
    x_train, x_test, y_train, y_test = train_test_split(x_orig, y_orig, test_size=0.3, random_state=42)
    model.fit(x_train.select_dtypes('number'), y_train)

    # 3. Predict
    if task == 'regression':
        y_pred = model.predict(x_test.select_dtypes('number'))
    elif task == 'classification':
        y_pred = model.predict_proba(x_test.select_dtypes('number'))[:, 1]

    # 4. Return both the predictions and x_test, y_test to analyze the performances
    return y_pred, x_test, y_test


@ignore_warnings(category=DataConversionWarning)
def baseline_performance(df: DataFrame, label: str,
                         task: PredictionTask = PredictionTask.CLASSIFICATION,
                         adjusted_metric: bool = False):
    """Train a baseline model, predict for a test set and return the performance.

    Args:
        - df (DataFrame): original dataset
        - label (str): name of target feature column
        - task (PredictionTask): classification, regression
        - adjusted_metric (bool): if True, return metric as percentage of max achievable performance
    """

    # 0. Infer the prediction task
    task = get_prediction_task(df=df, label=label)

    # 1. Define the baseline performance metric
    metric = roc_auc_score if task == 'classification' else mean_squared_error

    # 2. Get the baseline predictions
    y_pred, _, y_test = baseline_predictions(df=df, label=label, task=task)

    # 3. Get the performance
    if adjusted_metric:
        perf = adjusted_performance(y_test, y_pred, task=task, metric=metric)
    else:
        perf = metric(y_test, y_pred)
    return perf


def adjusted_performance(y_true, y_pred, task: PredictionTask, metric: callable):
    """Calculates the adjusted metric as ratio of real to maximum performance.

    Returns the percentage to the best achievable performance starting from a baseline.
    """
    task = PredictionTask(task)
    y_default = mean(y_true) if task == PredictionTask.CLASSIFICATION else mode(y_true).mode[0]  # define the value
    y_base = tile(y_default, (len(y_true), 1))  # create an array with default value

    best_perf = metric(y_true, y_true)
    base_perf = metric(y_true, y_base)
    real_perf = metric(y_true, y_pred)

    return (real_perf - base_perf) / (best_perf - base_perf)


@ignore_warnings(category=DataConversionWarning)
def performance_per_feature_values(df: DataFrame, feature: str, label: str, task='classification'):
    """Performance achieved per each value of a groupby feature."""

    # 0. Infer the prediction task
    task = get_prediction_task(df=df, label=label)

    # 1. Define the baseline performance metric
    metric = roc_auc_score if task == 'classification' else mean_squared_error

    # 2. Get the baseline predictions
    y_pred, x_test, y_test = baseline_predictions(df=df, label=label, task=task)

    # 3. Get the performances per feature value
    uniques = set(x_test[feature])
    results = {}
    for value in uniques:  # for each category
        y_pred_cat = y_pred[x_test[feature] == value]
        y_true_cat = y_test[x_test[feature] == value]
        try:
            results[value] = metric(y_true_cat, y_pred_cat)
        except ValueError as exc:
            results[value] = f'[ERROR] Failed performance metric with message: {exc}'

    return results


def performance_per_missing_value(df: DataFrame, feature: str, label: str, task='classification'):
    """Performance difference between valued and missing values in feature."""

    # 0. Infer the prediction task
    task = get_prediction_task(df=df, label=label)

    # 1. Define the baseline performance metric
    metric = roc_auc_score if task == 'classification' else mean_squared_error

    # 2. Get the baseline predictions
    y_pred, x_test, y_test = baseline_predictions(df=df, label=label, task=task)

    # 3. Get the performance per valued vs missing feature
    missing_mask = x_test[feature].isna()
    results = {}
    results['missing'] = metric(y_test[missing_mask], y_pred[missing_mask])
    results['valued'] = metric(y_test[~missing_mask], y_pred[~missing_mask])
    return results


@ignore_warnings(category=ConvergenceWarning)
def predict_missingness(df: DataFrame, feature: str):
    "Train a baseline model to predict the missingness of a feature value."
    # 0. Preprocessing
    df = df.copy()  # avoid altering the original DataFrame
    target = f'is_missing_{feature}'

    # 1. Define the baseline model
    model = BASELINE_CLASSIFIER

    # 2. Create the new target
    df[target] = df[feature].isna()

    # 3. Train overall model
    x_orig, y_orig = df.drop([feature, target], axis=1), df[target]
    x_train, x_test, y_train, y_test = train_test_split(x_orig, y_orig, test_size=0.3, random_state=42)
    model.fit(x_train.select_dtypes('number'), y_train)

    # 4. Predict
    y_pred = model.predict_proba(x_test.select_dtypes('number'))[:, 1]

    # 5. Return the area under the roc curve
    return roc_auc_score(y_test, y_pred)


def standard_transform(df, dtypes, skip: Optional[list] = None, robust=False):
    """Applies standard transformation to the dataset (imputation, centering and scaling), returns transformed data
    and the fitted transformer.
    Numerical data is imputed with mean, centered and scaled by 4 standard deviations.
    Categorical data is imputed with mode. Encoding is not performed in this stage to preserve the same columns.
    If robust is passed as True, will truncate  numerical data before computing statistics.
    [1]From 1997 Wilson, D. Randall; Martinez, Tony R. -
        Improved Heterogeneous Distance Functions https://arxiv.org/pdf/cs/9701101.pdf
    """
    skip = [] if skip is None else skip
    numerical_features = [key for key, value in dtypes.items() if value == 'numerical' and key not in skip]
    categorical_features = [key for key, value in dtypes.items() if value == 'categorical' and key not in skip]
    assert len(numerical_features + categorical_features +
               skip) == len(df.columns), 'the union of dtypes keys with skip should be the same as the df columns'
    if robust:
        numeric_transformer = Pipeline([
            ('imputer', SimpleImputer()),
            ('scaler', RobustScaler(quantile_range=(5.0, 95.0)))])
    else:
        numeric_transformer = NUMERIC_TRANSFORMER
    preprocessor = ColumnTransformer(
        transformers=[  # Numerical vars are scaled by 4sd so that most of the data are fit in the [-1, 1] range
            ('num', Pipeline(numeric_transformer.steps + \
             [('divby4', FunctionTransformer(lambda x: x / 4))]), numerical_features),
            ('cat', Pipeline([('impute', SimpleImputer(strategy='most_frequent'))]), categorical_features)],
        remainder='passthrough')
    new_column_order = numerical_features + categorical_features + skip
    tdf = DataFrame(preprocessor.fit_transform(df), index=df.index, columns=new_column_order)
    return tdf, preprocessor


def performance_one_vs_rest(df: DataFrame, label_feat: str, _class: str, dtypes=None):
    """Train a classifier to predict a class in binary fashion against all other classes.
    A normalized dataframe should be passed for best results"""
    # 0. Preprocessing
    df = df.copy()  # avoid altering the original DataFrame

    # 1. Define the baseline model
    if not dtypes:
        dtypes = infer_dtypes(df)
    categorical_features = [key for key, value in dtypes.items() if value == 'categorical' and key != label_feat]
    preprocessor = ColumnTransformer(
        transformers=[('cat', CATEGORICAL_TRANSFORMER, categorical_features)])  # OHE categorical variables
    model = Pipeline([('preprocessing', preprocessor), ('classifier', LogisticRegression())])

    # 2. Train overall model
    x_orig, y_orig = df.drop(label_feat, axis=1), label_binarize(df[label_feat], classes=[_class]).squeeze()
    x_train, x_test, y_train, y_test = train_test_split(x_orig, y_orig, test_size=0.3, random_state=24)
    model.fit(x_train, y_train)

    # 3. Predict
    y_pred = model.predict_proba(x_test)[:, 1]

    # 4. Return the area under the roc curve
    return roc_auc_score(y_test, y_pred)


def center_of_mass_statistic(column: Series, col_dtype: str) -> Union[float, int, str]:
    "Returns a center of mass statistic of a column based on its dtype."
    return column.mean() if col_dtype == 'numerical' else column.mode()[0]  # only first mode


def estimate_centroid(df: DataFrame, dtypes: dict = None):
    """Makes a centroid estimation for a given dataframe.
    Will use provided dtypes or infer in order to use best statistic columnwise"""
    if dtypes:
        if not all((col in dtypes for col in df.columns)):
            dtypes = dtypes.update(infer_dtypes(df, skip=dtypes.columns))
    else:
        dtypes = infer_dtypes(df)
    centroid = Series(df.iloc[0])
    for col in centroid.index:
        centroid[col] = center_of_mass_statistic(df[col], dtypes[col])
    return centroid


def heom(x_df: DataFrame, y_df, dtypes):
    """Implements the Heterogeneous Euclidean-Overlap Metric between a sample x and a reference y.
    The data is assumed to already be preprocessed (normalized and imputed).
    [1]From 1997 Wilson, D. Randall; Martinez, Tony R. -
        Improved Heterogeneous Distance Functions https://arxiv.org/pdf/cs/9701101.pdf
    """
    distances = DataFrame(empty(x_df.shape), index=x_df.index, columns=x_df.columns)
    distance_funcs = {'categorical': lambda x, y: 0 if x == y else 1,
                      'numerical': lambda x, y: abs(x - y)}  # Here we are assuming the data to be previously scaled
    for col_idx, column in enumerate(distances.columns):
        distances[column] = x_df[column].apply(distance_funcs[dtypes[column]], args=[y_df[col_idx]])
    return distances


def estimate_sd(sample: DataFrame, reference=None, dtypes=None):
    """Estimates the standard deviation of a sample of records.
    A reference can be passed in order to avoid new computation of mean or to use distances to another reference point.
    The reference is expected as a (1, N) array where N is the number of columns in the sample.
    Returns:
        std_dev: the standard deviation of the distance vectors of the sample to the reference point
        std_distances: the distances of the sample points to the reference point scaled by std_dev
    """
    if dtypes:  # Ensure dtypes are compatible with sample
        if not all((col in dtypes for col in sample.columns)):
            dtypes = dtypes.update(infer_dtypes(sample, skip=dtypes.columns))
    else:
        dtypes = infer_dtypes(sample)
    if reference is None:
        reference = estimate_centroid(sample, dtypes)
    else:
        assert len(reference) == len(
            sample.columns), "The provided reference point does not have the same dimension as the sample records"
    distances = heom(x_df=sample, y_df=reference, dtypes=dtypes)
    euclidean_distances = (distances.apply(square).sum(axis=1) / len(sample.columns)).apply(sqrt)
    std_dev = std(euclidean_distances)
    std_distances = euclidean_distances / std_dev
    return std_dev, std_distances


def gmm_clustering(data, n_gaussians):
    """Produces a GMM model with n_gaussians to cluster provided data."""
    gmm_ = GaussianMixture(n_components=n_gaussians).fit(data)
    return gmm_.predict(data), gmm_.aic(data)


def normality_test(data, suite='full', p_th=5e-3):
    """Performs a normality test on the data. Null hypothesis, data comes from normal distribution.
    A transformations taken from a suite is applied to the data before each run of the normal test.
    The first transformation in the suite that passes the normalcy test is returned
    Returns:
        result: True if any transformation led to a positive normal test, False otherwise
        test: The first test in the suite to lead to positive normal test"""
    transforms = {None: lambda x: x,
                  'inverse': reciprocal,
                  'square root': sqrt,
                  'log': nplog,
                  'Box Cox': boxcox}
    if suite == 'full':
        suite = transforms.keys()
    else:
        suite = list(suite) if isinstance(suite, str) else suite
    for transform in suite:
        try:
            transformed_data = transforms[transform](data)
            _, p_stat = normaltest(transformed_data, nan_policy='raise')
        except (AttributeError, TypeError, ZeroDivisionError, ValueError):
            continue
        if p_stat > p_th:
            return True, transform, p_stat
    return False, None, None
