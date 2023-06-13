import argparse
from typing import Dict, List

import agate
import dbt.flags as flags_module
from dbt.adapters.base import BaseAdapter, BaseRelation, Column as BaseColumn
from dbt.config.project import VarProvider
from dbt.config.runtime import RuntimeConfig
from dbt.contracts.connection import QueryComment
from dbt.contracts.graph.manifest import Manifest, WritableManifest
from dbt.contracts.project import PackageConfig, UserConfig
from dbt.contracts.state import PreviousState
from dbt.exceptions import EventCompilationError
from dbt.node_types import NodeType

from dbt.task.list import ListTask


def dbt_version():
    from dbt import version
    try:
        version_string = ".".join(version.__version__.split(".")[0:2])
        return version_string
    except BaseException:
        return "unknown"


def dbt_version_obj():
    from packaging import version as v
    from dbt import version as dbt_version
    return v.parse(dbt_version.__version__)


def is_v1_4():
    from packaging import version as v
    dbt_v = dbt_version_obj()
    return v.parse('1.4.0') <= dbt_v < v.parse('v1.5.0')


def is_v1_5():
    from packaging import version as v
    dbt_v = dbt_version_obj()
    return v.parse('1.5.0') <= dbt_v < v.parse('v1.6.0')


def load_manifest(manifest: Dict):
    if dbt_version() == '1.4':
        return _load_manifest_version_14(manifest)

    # TODO ensure it is after v1.5.x
    return _load_manifest_version_15(manifest)


def get_manifest_schema_version(dct: dict) -> int:
    schema_version = dct.get("metadata", {}).get("dbt_schema_version", None)
    if not schema_version:
        raise ValueError("Manifest doesn't have schema version")
    return int(schema_version.split(".")[-2][-1])


def _load_manifest_version_14(data: Dict):
    from dbt.contracts.util import upgrade_manifest_json
    if get_manifest_schema_version(data) <= 7:
        data = upgrade_manifest_json(data)

    return WritableManifest.from_dict(data)  # type: ignore


def _load_manifest_version_15(manifest: Dict):
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

        if is_v1_5() and hasattr(flags_module, 'set_flags'):
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
        setattr(self.args, "output", "selector")
        setattr(self.args, "models", None)
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

    def load_manifest(self):
        adapter = _Adapter(self.args)
        compiler = adapter.get_compiler()
        self.graph = compiler.compile(self.manifest)
        return


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


def list_resources_from_manifest(manifest: Manifest, selector: ResourceSelector = None):
    task = _DbtListTask()
    task.manifest = manifest

    dbt_flags = task.args
    setattr(dbt_flags, "state", None)
    setattr(dbt_flags, "models", None)

    if is_v1_4():
        flags_module.INDIRECT_SELECTION = 'eager'

    setattr(dbt_flags, "output", "selector")
    setattr(dbt_flags, "selector_name", None)
    setattr(dbt_flags, "resource_types", [])
    if selector is not None:
        setattr(dbt_flags, "resource_types", selector.build_selected_set())

    setattr(dbt_flags, "selector", None)
    setattr(dbt_flags, "select", None)
    return task.run()


def compare_models_between_manifests(
        base_manifest: Manifest,
        altered_manifest: Manifest,
        include_downstream: bool = False,
):
    task = _DbtListTask()
    task.manifest = base_manifest

    #
    if is_v1_5() and hasattr(flags_module, 'get_flags'):
        dbt_flags = flags_module.get_flags()
    else:
        dbt_flags = task.args
        flags_module.INDIRECT_SELECTION = 'eager'

    setattr(dbt_flags, "state", None)
    setattr(dbt_flags, "models", None)
    setattr(dbt_flags, "selector_name", None)
    setattr(dbt_flags, "output", "selector")
    setattr(dbt_flags, "resource_types", {NodeType.Model})

    setattr(dbt_flags, "selector", None)

    task.previous_state = _InMemoryPreviousState(altered_manifest)
    if include_downstream:
        setattr(dbt_flags, "select", ("state:modified+",))
    else:
        setattr(dbt_flags, "select", ("state:modified",))

    try:
        # silence the dbt event logger
        import dbt.compilation as compilation
        original_print_compile_stats = compilation.print_compile_stats
        compilation.print_compile_stats = lambda x: None

        result = task.run()
        compilation.print_compile_stats = original_print_compile_stats

        return result
    except EventCompilationError as e:
        if "does not match any nodes" in e.msg:
            return []
        raise e
