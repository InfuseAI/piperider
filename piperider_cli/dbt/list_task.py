import argparse
import json
import math
import tempfile
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
from dbt.node_types import NodeType
from dbt.task.list import ListTask

from piperider_cli.dbt import disable_dbt_compile_stats


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


def is_v1_3():
    from packaging import version as v
    dbt_v = dbt_version_obj()
    return v.parse('1.3.0') <= dbt_v < v.parse('v1.4.0')


def is_v1_4():
    from packaging import version as v
    dbt_v = dbt_version_obj()
    return v.parse('1.4.0') <= dbt_v < v.parse('v1.5.0')


def is_lt_v1_5():
    from packaging import version as v
    dbt_v = dbt_version_obj()
    return dbt_v < v.parse('v1.5.0')


def is_v1_5():
    from packaging import version as v
    dbt_v = dbt_version_obj()
    return v.parse('1.5.0') <= dbt_v < v.parse('v1.6.0')


def is_ge_v1_4():
    from packaging import version as v
    dbt_v = dbt_version_obj()
    return dbt_v >= v.parse('1.4.0')


def create_temp_dir():
    return tempfile.mkdtemp()


def load_manifest(manifest: Dict):
    v = dbt_version()
    if v == '1.3':
        return _load_manifest_version_13(manifest)

    if v == '1.4':
        return _load_manifest_version_14(manifest)

    if v == '1.5':
        return _load_manifest_version_15(manifest)

    raise NotImplementedError(f'dbt-core version: {v} is not supported')


def get_manifest_schema_version(dct: dict) -> int:
    schema_version = dct.get("metadata", {}).get("dbt_schema_version", None)
    if not schema_version:
        raise ValueError("Manifest doesn't have schema version")
    return int(schema_version.split(".")[-2][-1])


def _load_manifest_version_13(data: Dict):
    from dbt.contracts.util import upgrade_manifest_json
    if get_manifest_schema_version(data) <= 6:
        data = upgrade_manifest_json(data)

    return WritableManifest.from_dict(data)  # type: ignore


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


def list_resources_from_manifest(manifest: Manifest, selector: ResourceSelector = None, select: tuple = None):
    task = _DbtListTask()
    task.manifest = manifest

    dbt_flags = task.args
    setattr(dbt_flags, "state", None)
    setattr(dbt_flags, "models", None)
    setattr(dbt_flags, "project_target_path", create_temp_dir())

    if is_lt_v1_5():
        flags_module.INDIRECT_SELECTION = 'eager'

    setattr(dbt_flags, "output", "selector")
    setattr(dbt_flags, "selector_name", None)
    setattr(dbt_flags, "resource_types", [])
    if selector is not None:
        setattr(dbt_flags, "resource_types", selector.build_selected_set())

    setattr(dbt_flags, "selector", None)
    setattr(dbt_flags, "select", select)
    with disable_dbt_compile_stats():
        return task.run()


def list_resources_unique_id_from_manifest(manifest: Manifest):
    task = _DbtListTask()
    task.manifest = manifest

    dbt_flags = task.args
    setattr(dbt_flags, "state", None)
    setattr(dbt_flags, "models", None)
    setattr(dbt_flags, "project_target_path", create_temp_dir())

    if is_lt_v1_5():
        flags_module.INDIRECT_SELECTION = 'eager'

    setattr(dbt_flags, "output", "json")
    setattr(dbt_flags, "output", "json")
    setattr(dbt_flags, "output_keys", "unique_id,name")
    setattr(dbt_flags, "selector_name", None)
    setattr(dbt_flags, "resource_types", [])

    setattr(dbt_flags, "selector", None)
    setattr(dbt_flags, "select", None)
    with disable_dbt_compile_stats():
        output = task.run()
        return [json.loads(x) for x in output]


def compare_models_between_manifests(
        base_manifest: Manifest,
        altered_manifest: Manifest,
        include_downstream: bool = False,
):
    task = _DbtListTask()
    task.manifest = altered_manifest

    if is_lt_v1_5():
        dbt_flags = task.args
        flags_module.INDIRECT_SELECTION = 'eager'
    else:
        dbt_flags = flags_module.get_flags()

    setattr(dbt_flags, "state", None)
    setattr(dbt_flags, "project_target_path", create_temp_dir())
    setattr(dbt_flags, "models", None)
    setattr(dbt_flags, "selector_name", None)
    setattr(dbt_flags, "output", "selector")
    setattr(dbt_flags, "resource_types", {NodeType.Model})

    setattr(dbt_flags, "selector", None)

    task.previous_state = _InMemoryPreviousState(base_manifest)
    if include_downstream:
        setattr(dbt_flags, "select", ("state:modified+",))
    else:
        setattr(dbt_flags, "select", ("state:modified",))

    if is_ge_v1_4():
        from dbt.exceptions import EventCompilationError as DbtCompilationErr
    else:
        from dbt.exceptions import CompilationException as DbtCompilationErr

    try:
        with disable_dbt_compile_stats():
            return task.run()
    except DbtCompilationErr as e:
        if "does not match any nodes" in e.msg:
            return []
        raise e


def list_changes_in_unique_id(
        base_manifest: Manifest,
        target_manifest: Manifest, show_modified_only=False) -> List[Dict[str, str]]:
    task = _DbtListTask()
    task.manifest = target_manifest

    if is_lt_v1_5():
        dbt_flags = task.args
        flags_module.INDIRECT_SELECTION = 'eager'
    else:
        dbt_flags = flags_module.get_flags()

    setattr(dbt_flags, "project_target_path", create_temp_dir())
    setattr(dbt_flags, "state", None)
    setattr(dbt_flags, "models", None)
    setattr(dbt_flags, "selector_name", None)
    setattr(dbt_flags, "output", "json")
    setattr(dbt_flags, "output_keys", "unique_id,name")
    setattr(dbt_flags, "resource_types", None)
    setattr(dbt_flags, "selector", None)

    task.previous_state = _InMemoryPreviousState(base_manifest)

    if show_modified_only:
        setattr(dbt_flags, "select", ("state:modified",))
    else:
        setattr(dbt_flags, "select", None)

    if is_ge_v1_4():
        from dbt.exceptions import EventCompilationError as DbtCompilationErr
    else:
        from dbt.exceptions import CompilationException as DbtCompilationErr

    try:
        with disable_dbt_compile_stats():
            outputs = task.run()
            outputs = [json.loads(x) for x in outputs]
            return outputs
    except DbtCompilationErr as e:
        if "does not match any nodes" in e.msg:
            return []
        raise e


class ChangeSet:

    def __init__(self, base: Dict, target: Dict):
        self.base: Dict = base
        self.target: Dict = target
        self.base_manifest: Manifest = self._m(base)
        self.target_manifest: Manifest = self._m(target)
        self.explicit_changes = sorted(self._do_list_explicit_changes())

    def _m(self, run: Dict):
        manifest = run.get('dbt', {}).get('manifest', {})
        if manifest == {}:
            raise ValueError('Cannot find .dbt.manifest in run data')
        return load_manifest(manifest)

    def _do_list_explicit_changes(self):
        base_resources = [x.get('unique_id') for x in list_resources_unique_id_from_manifest(self.base_manifest)]
        target_resources = [x.get('unique_id') for x in list_resources_unique_id_from_manifest(self.target_manifest)]

        # exclude added and removed
        resource_in_both = list(set(base_resources).intersection(target_resources))
        output = [x.get('unique_id') for x in list_changes_in_unique_id(self.base_manifest, self.target_manifest, True)]
        output = list(set(output).intersection(resource_in_both))
        return output

    def list_explicit_changes(self):
        return self.explicit_changes

    def _metrics_implicit_changes(self):
        # exclude added and removed
        metrics_b = {x.get('name'): x for x in self.base.get('metrics')}
        metrics_t = {x.get('name'): x for x in self.target.get('metrics')}

        diffs = []
        for x in set(list(metrics_b.keys()) + list(metrics_t.keys())):
            if x in metrics_b and x in metrics_t:
                if metrics_b.get(x) != metrics_t.get(x):
                    ref_id = metrics_t.get(x).get('ref_id')
                    if ref_id:
                        diffs.append(ref_id)

        implicit = list(set(diffs))
        return list(set(implicit) - set(self.explicit_changes))

    def _table_implicit_changes(self):
        # list implicit changes and exclude added and removed tables
        from piperider_cli.reports import JoinedTables

        diffs = []

        tables = JoinedTables(self.base, self.target)
        for table_name, ref_id, b, t in tables.table_data_iterator():
            r1, r2 = tables.row_counts(table_name)
            c1, c2 = tables.column_counts(table_name)
            both_profiled = not math.isnan(r1) and not math.isnan(r2)
            if both_profiled:
                if r1 == r2 and c1 == c2 and not self.has_changed(b, t):
                    pass
                else:
                    diffs.append(ref_id)

        return diffs

    def list_implicit_changes(self):
        table_implicit = self._table_implicit_changes()
        metric_implicit = self._metrics_implicit_changes()
        filtered_explicit = sorted(list(set(table_implicit + metric_implicit) - set(self.explicit_changes)))
        return filtered_explicit

    def has_changed(self, p1: Dict, p2: Dict):
        """
        p1 and p2 are table profiled data
        """

        from piperider_cli.reports import ColumnChangeView

        base_cols: Dict[str, Dict] = p1.get('columns')
        target_cols: Dict[str, Dict] = p2.get('columns')

        for k in base_cols:
            if ColumnChangeView(base_cols.get(k)) != ColumnChangeView(target_cols.get(k)):
                return True

        return False
