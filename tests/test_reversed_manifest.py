import json
from typing import Callable, Dict

import pytest

from piperider_cli.dbt import dbt_version
from piperider_cli.dbt.reverse_manifest import reverse_to_run


@pytest.mark.skipif(
    dbt_version < "v1.5", reason="skip manifest test before dbt-core 1.5"
)
def test_reversed_manifest(
    sc_31711_run_data: Dict, piperider_schema_validate_func: Callable[[Dict], None]
):
    run_data: Dict = sc_31711_run_data
    manifest_data = run_data.get("dbt", {}).get("manifest")

    fake_run = reverse_to_run(manifest_data)
    piperider_schema_validate_func(fake_run)

    assert manifest_data == fake_run.get("dbt", {}).get("manifest")
    with open("sample.json", "w") as fh:
        fh.write(json.dumps(fake_run))

    # it is impossible to generate the same tables information without profiling
    # assert fake_run.get('tables') == run_data.get('tables')
