import argparse
from typing import Dict, List

import agate
import dbt.flags as flags_module
from dbt.adapters.base import BaseAdapter, BaseRelation
from dbt.adapters.base import Column as BaseColumn
from dbt.config.project import VarProvider
from dbt.config.runtime import RuntimeConfig
from dbt.contracts.connection import QueryComment
from dbt.contracts.graph.manifest import Manifest, WritableManifest
from dbt.contracts.project import PackageConfig, UserConfig
from dbt.contracts.state import PreviousState
from dbt.node_types import NodeType
from dbt.task.list import ListTask


def load_manifest_from_file(manifest_path: str):
    return WritableManifest.read_and_check_versions(manifest_path)


def load_manifest(manifest: Dict):
    from dbt.exceptions import IncompatibleSchemaError

    # return WritableManifest.read_and_check_versions(manifest_path)
    data = manifest

    # Check metadata version. There is a class variable 'dbt_schema_version', but
    # that doesn't show up in artifacts, where it only exists in the 'metadata'
    # dictionary.
    if hasattr(WritableManifest, "dbt_schema_version"):
        if "metadata" in data and "dbt_schema_version" in data["metadata"]:
            previous_schema_version = data["metadata"]["dbt_schema_version"]
            # cls.dbt_schema_version is a SchemaVersion object
            if not WritableManifest.is_compatible_version(previous_schema_version):
                raise IncompatibleSchemaError(
                    expected=str(WritableManifest.dbt_schema_version),
                    found=previous_schema_version,
                )

    return WritableManifest.upgrade_schema_version(data)


class _Adapter(BaseAdapter):
    class NobodyCaredConnectionManager:
        def __init__(self, arg0):
            pass

    ConnectionManager = NobodyCaredConnectionManager

    @classmethod
    def date_function(cls) -> str:
        pass

    @classmethod
    def is_cancelable(cls) -> bool:
        pass

    def list_schemas(self, database: str) -> List[str]:
        pass

    def drop_relation(self, relation: BaseRelation) -> None:
        pass

    def truncate_relation(self, relation: BaseRelation) -> None:
        pass

    def rename_relation(
        self, from_relation: BaseRelation, to_relation: BaseRelation
    ) -> None:
        pass

    def get_columns_in_relation(self, relation: BaseRelation) -> List[BaseColumn]:
        pass

    def expand_column_types(self, goal: BaseRelation, current: BaseRelation) -> None:
        pass

    def list_relations_without_caching(
        self, schema_relation: BaseRelation
    ) -> List[BaseRelation]:
        pass

    def create_schema(self, relation: BaseRelation):
        pass

    def drop_schema(self, relation: BaseRelation):
        pass

    @classmethod
    def quote(cls, identifier: str) -> str:
        pass

    @classmethod
    def convert_text_type(cls, agate_table: agate.Table, col_idx: int) -> str:
        pass

    @classmethod
    def convert_number_type(cls, agate_table: agate.Table, col_idx: int) -> str:
        pass

    @classmethod
    def convert_boolean_type(cls, agate_table: agate.Table, col_idx: int) -> str:
        pass

    @classmethod
    def convert_datetime_type(cls, agate_table: agate.Table, col_idx: int) -> str:
        pass

    @classmethod
    def convert_date_type(cls, agate_table: agate.Table, col_idx: int) -> str:
        pass

    @classmethod
    def convert_time_type(cls, agate_table: agate.Table, col_idx: int) -> str:
        pass


class _RuntimeConfig(RuntimeConfig):
    def __init__(self):
        data = {
            "profile_name": "piperider",
            "target_name": "piperider",
            "user_config": UserConfig(),
            "threads": 1,
            "credentials": {"database": "piperider-dbt-functions", "schema": "PUBLIC"},
            "profile_env_vars": {},
            "project_name": "jaffle_shop",
            "version": "0.1",
            "project_root": "",
            "model_paths": ["models"],
            "macro_paths": ["macros"],
            "seed_paths": ["seeds"],
            "test_paths": ["tests"],
            "analysis_paths": ["analysis"],
            "docs_paths": ["snapshots", "macros", "seeds", "models", "analysis"],
            "asset_paths": [],
            "target_path": "target",
            "snapshot_paths": ["snapshots"],
            "clean_targets": ["target", "dbt_modules", "logs"],
            "log_path": "None",
            "packages_install_path": "dbt_packages",
            "quoting": {"database": True, "schema": True, "identifier": True},
            "models": {
                "jaffle_shop": {
                    "materialized": "table",
                    "staging": {"materialized": "view"},
                }
            },
            "on_run_start": [],
            "on_run_end": [],
            "dispatch": [],
            "seeds": {},
            "snapshots": {},
            "sources": {},
            "tests": {},
            "metrics": {},
            "exposures": {},
            "vars": VarProvider({}),
            "dbt_version": [],
            "packages": {"packages": PackageConfig(packages=[])},
            "manifest_selectors": {},
            "selectors": {},
            "query_comment": QueryComment(),
            "config_version": 2,
            "unrendered": {
                "project_dict": {},
                "packages_dict": None,
                "selectors_dict": None,
            },
            "project_env_vars": {},
            "cli_vars": {},
            "dependencies": None,
        }

        super().__init__(args=None, **data)

    def validate(self):
        # skip validate
        pass


class _DbtListTask(ListTask):
    def __init__(self):
        self.config = _RuntimeConfig()
        self.args = flags_module.get_flag_obj()
        self.previous_state = None
        flags_module.set_flags(self.args)

        # The graph compiler tries to make directories when it initialized itself
        setattr(self.args, "target_path", "/tmp/piperider-list-task/target_path")
        setattr(
            self.args,
            "packages_install_path",
            "/tmp/piperider-list-task/packages_install_path",
        )

        # Args for ListTask
        setattr(self.args, "WRITE_JSON", None)
        setattr(self.args, "exclude", None)
        setattr(self.args, "INDIRECT_SELECTION", "eager")
        setattr(self.args, "WARN_ERROR", True)
        self.args.args = argparse.Namespace()
        self.args.args.cls = ListTask

        # All nodes the compiler building
        self.node_results = []

    def compile_manifest(self):
        if self.manifest is None:
            raise BaseException("compile_manifest called before manifest was loaded")

        adapter = _Adapter(self.args)
        compiler = adapter.get_compiler()
        self.graph = compiler.compile(self.manifest)

    def output_results(self, results):
        # overrider super method: dont print messages or logs
        for result in results:
            self.node_results.append(result)
        return self.node_results


class _PreviousState(PreviousState):
    def __init__(self, manifest_path: str):
        self.manifest = load_manifest_from_file(manifest_path)


class _InMemoryPreviousState(PreviousState):
    def __init__(self, manifest: Manifest):
        self.manifest = manifest


class ResourceSelector:
    def __init__(self):
        self.selected_node_types = []

    def model(self):
        self.selected_node_types.append(NodeType.Model)
        return self

    def test(self):
        self.selected_node_types.append(NodeType.Test)
        return self

    def seed(self):
        self.selected_node_types.append(NodeType.Seed)
        return self

    def source(self):
        self.selected_node_types.append(NodeType.Source)
        return self

    def metric(self):
        self.selected_node_types.append(NodeType.Metric)
        return self

    def build_selected_set(self):
        return set(
            [x for x in self.selected_node_types if x and isinstance(x, NodeType)]
        )


def list_resources_from_manifest_file(
    manifest_file: str, selector: ResourceSelector = None
):
    return list_resources_from_manifest(
        load_manifest_from_file(manifest_file), selector
    )


def list_resources_from_manifest(manifest: Manifest, selector: ResourceSelector = None):
    task = _DbtListTask()
    task.manifest = manifest

    dbt_flags = flags_module.get_flags()
    setattr(dbt_flags, "state", None)
    setattr(dbt_flags, "models", None)

    setattr(dbt_flags, "output", "selector")
    setattr(dbt_flags, "resource_types", None)
    if selector is not None:
        setattr(dbt_flags, "resource_types", selector.build_selected_set())

    setattr(dbt_flags, "selector", None)
    setattr(dbt_flags, "select", None)
    return task.run()


def compare_models_between_manifests_files(
    base_manifest_file: str,
    altered_manifest_file: str,
    include_downstream: bool = False,
):
    task = _DbtListTask()
    task.manifest = load_manifest_from_file(base_manifest_file)

    dbt_flags = flags_module.get_flags()
    setattr(dbt_flags, "state", None)
    setattr(dbt_flags, "models", None)

    setattr(dbt_flags, "output", "selector")
    setattr(dbt_flags, "resource_types", {NodeType.Model})

    setattr(dbt_flags, "selector", None)

    task.previous_state = _PreviousState(altered_manifest_file)
    if include_downstream:
        setattr(dbt_flags, "select", ("state:modified+",))
    else:
        setattr(dbt_flags, "select", ("state:modified",))
    return task.run()


def compare_models_between_manifests(
    base_manifest: Manifest,
    altered_manifest: Manifest,
    include_downstream: bool = False,
):
    task = _DbtListTask()
    task.manifest = base_manifest

    dbt_flags = flags_module.get_flags()
    setattr(dbt_flags, "state", None)
    setattr(dbt_flags, "models", None)

    setattr(dbt_flags, "output", "selector")
    setattr(dbt_flags, "resource_types", {NodeType.Model})

    setattr(dbt_flags, "selector", None)

    task.previous_state = _InMemoryPreviousState(altered_manifest)
    if include_downstream:
        setattr(dbt_flags, "select", ("state:modified+",))
    else:
        setattr(dbt_flags, "select", ("state:modified",))
    return task.run()
