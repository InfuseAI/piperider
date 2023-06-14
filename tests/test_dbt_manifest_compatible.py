import json
import os

import pytest
from dbt.contracts.graph.manifest import WritableManifest

from piperider_cli.dbt import disable_dbt_compile_stats
from piperider_cli.dbt.list_task import dbt_version_obj, load_manifest
from packaging import version

v = dbt_version_obj()


def _load_manifest(file_name):
    file_path = os.path.join(os.path.dirname(__file__), 'mock_dbt_data', 'compatible', file_name)
    with open(file_path, 'r') as file:
        content = file.read()
    return json.loads(content)


@pytest.fixture()
def manifest_from_1_3():
    return _load_manifest('dbt-postgres-1.3.4-manifest.json')


@pytest.fixture()
def manifest_from_1_4():
    return _load_manifest('dbt-duckdb-1.4.2-manifest.json')


@pytest.fixture()
def manifest_from_1_5():
    return _load_manifest('dbt-duckdb-1.5.1-manifest.json')


def test_load_manifest_v7(manifest_from_1_3):
    assert isinstance(load_manifest(manifest_from_1_3), WritableManifest)


@pytest.mark.skipif(v < version.parse('v1.4'), reason='skip manifest test before dbt-core 1.4')
def test_load_manifest_v8(manifest_from_1_4):
    assert isinstance(load_manifest(manifest_from_1_4), WritableManifest)


@pytest.mark.skipif(v < version.parse('v1.5'), reason='skip manifest test before dbt-core 1.5')
def test_load_manifest_v9(manifest_from_1_5):
    assert isinstance(load_manifest(manifest_from_1_5), WritableManifest)


def test_log_functions():
    with disable_dbt_compile_stats():
        # make sure this not breaking in all dbt versions
        pass
