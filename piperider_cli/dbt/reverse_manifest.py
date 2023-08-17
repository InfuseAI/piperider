from typing import Dict


def build_columns(column_details: Dict):
    result = dict()
    for name, v in column_details.items():
        result[name] = dict(name=name, description=v.get('description'),
                            type='other', schema_type='other')
    return result


def reverse_to_run(manifest_data: Dict):
    from piperider_cli.dbt.list_task import list_resources_data_from_manifest, load_manifest
    base_data = dict(id="tmp-run", tables={}, created_at="2023-08-14T03:46:51.629668Z",
                     datasource=dict(name='empty', type='duckdb'))
    dbt = dict(manifest=manifest_data, run_results={})
    base_data['dbt'] = dbt

    tables = dict()
    nodes = manifest_data.get('nodes')

    for x in list_resources_data_from_manifest(load_manifest(manifest_data)):
        resource_type = x.get('resource_type')
        unique_id = x.get('unique_id')

        if unique_id not in nodes:
            continue

        if resource_type not in ['model', 'seed', 'source']:
            continue
        table_name = x.get('name')
        column_details: Dict[Dict] = nodes.get(unique_id).get('columns')
        tables[table_name] = dict(name=table_name, col_count=len(column_details), columns=build_columns(column_details),
                                  ref_id=unique_id)

    base_data["tables"] = tables
    return base_data
