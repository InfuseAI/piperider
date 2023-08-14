import json
import os

import pytest


def load_mock_dbt_data(file_name):
    file_path = os.path.join(os.path.dirname(__file__), 'mock_dbt_data', file_name)
    with open(file_path, 'r') as file:
        content = file.read()
    return json.loads(content)


@pytest.fixture()
def sc_31711_run_data():
    return load_mock_dbt_data('sc-31711-run-dbt-1.5.4-no-profiled.json')


@pytest.fixture()
def piperider_schema_validate_func():
    import piperider_cli.profiler as p
    from jsonschema import validate

    schema_def = os.path.join(os.path.dirname(p.__file__), 'schema.json')
    with open(schema_def) as fh:
        schema = json.loads(fh.read())

        def func(data):
            from jsonschema.exceptions import ValidationError
            try:
                validate(instance=data, schema=schema)
            except ValidationError as e:
                print(f"error: {e.message}")
                print(f"path: {e.json_path}")
                assert False

        return func
