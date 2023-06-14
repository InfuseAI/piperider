import json
import os

import pytest

from piperider_cli.dbt import disable_dbt_compile_stats
from piperider_cli.dbt.list_task import load_manifest


def _load_manifest(file_name):
    file_path = os.path.join(os.path.dirname(__file__), 'mock_dbt_data', 'compatible', file_name)
    with open(file_path, 'r') as file:
        content = file.read()
    return json.loads(content)


@pytest.fixture()
def dbt_1_4():
    return _load_manifest('dbt-duckdb-1.4.2-manifest.json')


@pytest.fixture()
def dbt_1_5():
    return _load_manifest('dbt-duckdb-1.5.1-manifest.json')


def test_load_dbt_14(dbt_1_4):
    load_manifest(dbt_1_4)


def test_load_dbt_15(dbt_1_5):
    load_manifest(dbt_1_5)


def test_log_functions():
    with disable_dbt_compile_stats():
        # make sure this not breaking in all dbt versions
        pass
