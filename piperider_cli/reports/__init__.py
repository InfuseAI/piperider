import abc
import math
import urllib.parse
from dataclasses import dataclass
from functools import total_ordering
from typing import Iterable, List

from dbt.contracts.graph.manifest import WritableManifest
from enum import Enum


def embed_url_cli(url: str, unique_id: str, resource_type: str, table_name: str, column_name: str = None):
    if column_name is None:
        # table
        return table_name
    else:
        # column
        return column_name


def embed_url_cloud(url: str, unique_id: str, resource_type: str, table_name: str, column_name: str = None):
    if column_name is None:
        # table
        return f'<a href="{url}#/{resource_type}s/{urllib.parse.quote(unique_id)}">{table_name}</a>'
    else:
        # column
        return f'<a href="{url}#/{resource_type}s/{urllib.parse.quote(unique_id)}/columns/{urllib.parse.quote(column_name)}">{column_name}</a>'


embed_url = None
try:
    from web import patch_sys_path_for_piperider_cli

    patch_sys_path_for_piperider_cli()
    from piperider_cli.dbt.list_task import load_manifest, compare_models_between_manifests

    embed_url = embed_url_cloud
except ImportError:
    from piperider_cli.dbt.list_task import load_manifest, compare_models_between_manifests

    embed_url = embed_url_cli
