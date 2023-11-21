import json
import os

import pytest
from piperider_cli.dbt import dbt_version, disable_dbt_compile_stats
from piperider_cli.dbt.list_task import load_manifest
from packaging import version


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


@pytest.fixture()
def manifest_from_1_6():
    return _load_manifest('dbt-duckdb-1.6.0-manifest.json')


@pytest.fixture()
def manifest_from_1_7():
    return _load_manifest('dbt-duckdb-1.7.0-manifest.json')


def check_manifest_type(m):
    from dbt.contracts.graph.manifest import Manifest, WritableManifest
    assert isinstance(m, Manifest) or isinstance(m, WritableManifest)


def test_load_manifest_v7(manifest_from_1_3):
    m = load_manifest(manifest_from_1_3)
    check_manifest_type(m)


@pytest.mark.skipif(dbt_version < version.parse('v1.4'), reason='skip manifest test before dbt-core 1.4')
def test_load_manifest_v8(manifest_from_1_4):
    m = load_manifest(manifest_from_1_4)
    check_manifest_type(m)


@pytest.mark.skipif(dbt_version < version.parse('v1.5'), reason='skip manifest test before dbt-core 1.5')
def test_load_manifest_v9(manifest_from_1_5):
    m = load_manifest(manifest_from_1_5)
    check_manifest_type(m)


@pytest.mark.skipif(dbt_version < version.parse('v1.6'), reason='skip manifest test before dbt-core 1.6')
def test_load_manifest_10(manifest_from_1_6):
    m = load_manifest(manifest_from_1_6)
    check_manifest_type(m)


@pytest.mark.skipif(dbt_version < version.parse('v1.7'), reason='skip manifest test before dbt-core 1.7')
def test_load_manifest_11(manifest_from_1_7):
    m = load_manifest(manifest_from_1_7)
    check_manifest_type(m)


def test_log_functions():
    with disable_dbt_compile_stats():
        # make sure this not breaking in all dbt versions
        pass
