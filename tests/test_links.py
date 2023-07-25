import json
import os
import shutil

import pytest
from dbt.contracts.graph.manifest import WritableManifest

from piperider_cli.dbt import disable_dbt_compile_stats
from piperider_cli.dbt.list_task import dbt_version_obj, load_manifest
from packaging import version

from piperider_cli.utils import create_link


def test_create_link():
    dirname = os.path.join(os.getcwd(), "__create_link__")
    dirname_latest = os.path.join(os.getcwd(), "__create_link__latest")

    def cleanup():
        if os.path.exists(dirname_latest):
            os.unlink(dirname_latest)
        if os.path.exists(dirname):
            shutil.rmtree(dirname, ignore_errors=True)

    cleanup()

    try:
        os.makedirs(dirname, exist_ok=True)
        create_link(dirname, dirname_latest)
    finally:
        cleanup()
