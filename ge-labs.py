import os.path


def main():
    from great_expectations.data_context.types.base import DataContextConfig
    from great_expectations.data_context.types.base import DatasourceConfig

    # data_connectors:
    #   default_inferred_data_connector_name:
    #     class_name: InferredAssetFilesystemDataConnector
    #     module_name: great_expectations.datasource.data_connector
    #     default_regex:
    #       group_names:
    #         - data_asset_name
    #       pattern: (.*)
    #     base_directory: data
    #   default_runtime_data_connector_name:
    #     batch_identifiers:
    #       - default_identifier_name
    #     class_name: RuntimeDataConnector
    #     module_name: great_expectations.datasource.data_connector

    from great_expectations.data_context.types.base import FilesystemStoreBackendDefaults
    data_context_config = DataContextConfig(
        datasources={
            "my_datasource": DatasourceConfig(
                class_name="Datasource",
                execution_engine={
                    "class_name": "PandasExecutionEngine"
                },
                data_connectors={
                    "default_inferred_data_connector_name": {
                        "class_name": "InferredAssetFilesystemDataConnector",
                        "default_regex": {
                            "group_names": ["data_asset_name"],
                            "pattern": r"(.*)"
                        },
                        "base_directory": "data"
                    },
                    "default_runtime_data_connector_name": {
                        "class_name": "RuntimeDataConnector",
                        "batch_identifiers": ["default_identifier_name"]
                    }
                }
            )
        },
        store_backend_defaults=FilesystemStoreBackendDefaults(root_directory=os.path.abspath('./foo')),
        expectations_store_name="expectations_store",
        validations_store_name="validations_store",
        checkpoint_store_name="checkpoint_store",
        profiler_store_name="profiler_store",
        evaluation_parameter_store_name="evaluation_parameter_store",
        plugins_directory=None,
        data_docs_sites={}
    )

    from great_expectations.data_context import BaseDataContext
    context = BaseDataContext(project_config=data_context_config)

    # https://docs.greatexpectations.io/docs/guides/expectations/how_to_create_and_edit_expectations_with_a_profiler
    # TODO try create an expectation suite from SDK
    from great_expectations.core.batch import BatchRequest

    batch_request = {'datasource_name': 'my_datasource', 'data_connector_name': 'default_inferred_data_connector_name',
                     'data_asset_name': 'train.csv', 'limit': 1000}

    expectation_suite_name = "abc2"

    validator = context.get_validator(
        batch_request=BatchRequest(**batch_request),
        expectation_suite_name=expectation_suite_name
    )
    column_names = [f'"{column_name}"' for column_name in validator.columns()]
    print(f"Columns: {', '.join(column_names)}.")
    validator.head(n_rows=5, fetch_all=False)

    pass


if __name__ == '__main__':
    main()
