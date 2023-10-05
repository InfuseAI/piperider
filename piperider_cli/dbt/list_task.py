import argparse
import json
import re
import tempfile
from dataclasses import fields
from pathlib import Path
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
from dbt.tracking import initialize_from_flags

from piperider_cli.dbt import dbt_version, disable_dbt_compile_stats


def create_temp_dir():
    return tempfile.mkdtemp()


def load_full_manifest(target_path: str, project_dir: str = None):
    from dbt.adapters.factory import register_adapter
    from dbt.parser.manifest import ManifestLoader

    runtime_config = PrepareRuntimeConfig(target_path, project_dir=project_dir)
    register_adapter(runtime_config)

    v = dbt_version
    if v == '1.5' or v == '1.6':
        return ManifestLoader.get_full_manifest(
            runtime_config, write_perf_info=False
        )
    elif v == '1.4' or v == '1.3':
        return ManifestLoader.get_full_manifest(
            runtime_config
        )
    raise NotImplementedError(f'dbt-core version: {v} is not supported')


def load_manifest(manifest: Dict):
    v = dbt_version
    if v == '1.3':
        return _load_manifest_version_13(manifest)

    if v == '1.4':
        return _load_manifest_version_14(manifest)

    if v == '1.5':
        return _load_manifest_version_15(manifest)

    if v == '1.6':
        return _load_manifest_version_16(manifest)

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
    data = manifest

    # Check metadata version. There is a class variable 'dbt_schema_version', but
    # that doesn't show up in artifacts, where it only exists in the 'metadata'
    # dictionary.
    if hasattr(WritableManifest, "dbt_schema_version"):
        if "metadata" in data and "dbt_schema_version" in data["metadata"]:
            previous_schema_version = data["metadata"]["dbt_schema_version"]
            # cls.dbt_schema_version is a SchemaVersion object
            if not WritableManifest.is_compatible_version(previous_schema_version):
                messages = [
                    f'Current dbt (version: {dbt_version}) could not recognize the schema in the manifest file. ',
                    f'  supported: "{WritableManifest.dbt_schema_version}"',
                    f'  unknown:   "{previous_schema_version}"',
                    'Please re-generate the manifest with the compatible version.',
                ]
                raise ValueError(messages)

    def patched_get_manifest_schema_version(dct: dict) -> int:
        schema_version = dct.get("metadata", {}).get("dbt_schema_version", None)
        if not schema_version:
            raise ValueError("Manifest doesn't have schema version")

        match = re.search(r'/v(\d+).json', schema_version)
        if match:
            return int(match.group(1))
        raise ValueError("Manifest doesn't have schema version")

    import dbt.contracts.graph.manifest
    origin_function = dbt.contracts.graph.manifest.get_manifest_schema_version
    dbt.contracts.graph.manifest.get_manifest_schema_version = patched_get_manifest_schema_version

    result = WritableManifest.upgrade_schema_version(data)
    dbt.contracts.graph.manifest.get_manifest_schema_version = origin_function
    return result


def _load_manifest_version_16(manifest: Dict):
    from dbt.contracts.graph.manifest import Manifest
    m = _load_manifest_version_15(manifest)
    data = m.__dict__
    all_fields = set([x.name for x in fields(Manifest)])
    new_data = {k: v for k, v in data.items() if k in all_fields}
    return Manifest(**new_data)


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


def PrepareRuntimeConfig(target_path: str, project_dir: str = None):
    from piperider_cli.configuration import FileSystem
    project_root = project_dir if project_dir is not None else FileSystem.WORKING_DIRECTORY
    profiles_dir = FileSystem.DBT_PROFILES_DIR

    def _get_v13_runtime_config(flags):
        setattr(flags, 'project_dir', project_root)
        setattr(flags, "SEND_ANONYMOUS_USAGE_STATS", False)
        initialize_from_flags()
        return ListTask.ConfigType.from_args(flags)

    def _get_v14_runtime_config(flags):
        setattr(flags, 'project_dir', project_root)
        setattr(flags, "SEND_ANONYMOUS_USAGE_STATS", False)
        initialize_from_flags()
        return ListTask.ConfigType.from_args(flags)

    def _get_v15_runtime_config(flags):
        from dbt.config.runtime import load_project, load_profile

        flags_module.set_flags(flags)
        initialize_from_flags(False, project_root)

        profile = load_profile(
            project_root=project_root,
            cli_vars={}
        )
        project = load_project(
            project_root=project_root,
            version_check=True,
            profile=profile,
            cli_vars={
            }
        )

        return RuntimeConfig.from_parts(
            project,
            profile,
            flags
        )

    flags = make_flag()

    setattr(flags, 'target_path', target_path)
    setattr(flags, "WRITE_JSON", None)
    setattr(flags, "exclude", None)
    setattr(flags, "output", "selector")
    setattr(flags, "models", None)
    setattr(flags, "INDIRECT_SELECTION", "eager")
    setattr(flags, "WARN_ERROR", False)
    _configure_warn_error_options(flags)
    setattr(flags, "MACRO_DEBUGGING", False)
    setattr(flags, "PROFILES_DIR", profiles_dir)
    setattr(flags, "cls", ListTask)
    setattr(flags, "profile", None)
    setattr(flags, "target", None)

    v = dbt_version
    if v == '1.5' or v == '1.6':
        return _get_v15_runtime_config(flags)
    elif v == '1.4':
        return _get_v14_runtime_config(flags)
    elif v == '1.3':
        return _get_v13_runtime_config(flags)

    raise NotImplementedError(f'dbt-core version: {v} is not supported')


def make_flag():
    v = dbt_version
    if v == '1.3':
        flags = argparse.Namespace(USE_COLORS=True)
    else:
        flags = flags_module.get_flag_obj()
        setattr(flags, 'PARTIAL_PARSE_FILE_DIFF', True)

    return flags


def _configure_warn_error_options(flags):
    if dbt_version >= '1.4':
        from dbt.helper_types import WarnErrorOptions
        setattr(flags, "WARN_ERROR_OPTIONS", WarnErrorOptions([]))


class _RuntimeConfig(RuntimeConfig):
    def __init__(self):
        from piperider_cli.configuration import FileSystem
        data = {
            "profile_name": "piperider",
            "target_name": "piperider",
            "user_config": UserConfig(),
            "threads": 1,
            "credentials": {"database": "piperider-dbt-functions", "schema": "PUBLIC"},
            "profile_env_vars": {},
            "project_name": "jaffle_shop",
            "version": "0.1",
            "project_root": FileSystem.WORKING_DIRECTORY,
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

        def has_field(field_name):
            return field_name in {f.name for f in fields(RuntimeConfig)}

        if has_field('dbt_cloud'):
            data['dbt_cloud'] = None

        if has_field('restrict_access'):
            data['restrict_access'] = False

        if has_field('packages_specified_path'):
            data['packages_specified_path'] = "packages.yml"

        super().__init__(args=None, **data)

    def validate(self):
        # skip validate
        pass


class _DbtListTask(ListTask):
    def __init__(self):
        self.config = _RuntimeConfig()
        self.args = make_flag()
        self.previous_state = None

        if dbt_version >= '1.5' and hasattr(flags_module, 'set_flags'):
            flags_module.set_flags(self.args)

        # The graph compiler tries to make directories when it initialized itself
        # setattr(self.args, "target_path", "/tmp/piperider-list-task/target_path")
        setattr(self.args, "target_path", 'target')
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
        setattr(self.args, "WARN_ERROR", False)
        _configure_warn_error_options(self.args)
        self.args.args = argparse.Namespace()
        self.args.args.cls = ListTask

        # All nodes the compiler building
        self.node_results = []

        try:
            from dbt.task.contextvars import cv_project_root
            if self.config:
                cv_project_root.set(self.config.project_root)
        except Exception:
            # cv_project_root start to be defined since dbt-core v1.5.2
            pass

    def compile_manifest(self):
        if self.manifest is None:
            raise BaseException("compile_manifest called before manifest was loaded")

        adapter = _Adapter(self.config)
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


def list_resources_unique_id_from_manifest(manifest: Manifest, select: tuple = None, state: str = None) -> List[str]:
    result: List[Dict] = list_resources_data_from_manifest(manifest, select=select, state=state)
    return [x.get('unique_id') for x in result]


def list_resources_data_from_manifest(manifest: Manifest, select: tuple = None, state: str = None) -> List[Dict]:
    task = _DbtListTask()
    task.manifest = manifest

    dbt_flags = task.args

    setattr(dbt_flags, "output", "json")
    setattr(dbt_flags, "output_keys", "unique_id,name,resource_type,original_file_path")

    setattr(dbt_flags, "state", Path(state) if state else None)
    setattr(dbt_flags, "models", None)
    setattr(dbt_flags, "project_target_path", create_temp_dir())

    if dbt_version < '1.5':
        flags_module.INDIRECT_SELECTION = 'eager'

    setattr(dbt_flags, "selector_name", None)
    setattr(dbt_flags, "resource_types", [])
    setattr(dbt_flags, "selector", None)
    setattr(dbt_flags, "select", select)
    if state:
        if getattr(task, "set_previous_state", None) is None:
            # Since dbt v1.6.0 the method set_previous_state is not available anymore
            task.previous_state = PreviousState(
                state_path=state,
                target_path=Path(task.config.target_path),
                project_root=Path(task.config.project_root),
            )
        else:
            task.set_previous_state()

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

    if dbt_version < '1.5':
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

    if dbt_version >= '1.4':
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


def list_modified_with_downstream(
    base_manifest: Manifest,
    altered_manifest: Manifest,
):
    task = _DbtListTask()
    task.manifest = altered_manifest

    if dbt_version < '1.5':
        dbt_flags = task.args
        flags_module.INDIRECT_SELECTION = 'eager'
    else:
        dbt_flags = flags_module.get_flags()

    setattr(dbt_flags, "state", None)
    setattr(dbt_flags, "project_target_path", create_temp_dir())
    setattr(dbt_flags, "models", None)
    setattr(dbt_flags, "selector_name", None)
    setattr(dbt_flags, "output", "json")
    setattr(dbt_flags, "output_keys", "unique_id,name,resource_type,original_file_path")
    setattr(dbt_flags, "resource_types", {NodeType.Model, NodeType.Metric, NodeType.Seed})
    setattr(dbt_flags, "selector", None)

    task.previous_state = _InMemoryPreviousState(base_manifest)
    setattr(dbt_flags, "select", ("state:modified+",))

    if dbt_version >= '1.4':
        from dbt.exceptions import EventCompilationError as DbtCompilationErr
    else:
        from dbt.exceptions import CompilationException as DbtCompilationErr

    try:
        with disable_dbt_compile_stats():
            return [json.loads(x) for x in task.run()]
    except DbtCompilationErr as e:
        if "does not match any nodes" in e.msg:
            return []
        raise e


def list_changes_in_unique_id(
    base_manifest: Manifest,
    target_manifest: Manifest, show_modified_only=False) -> List[Dict[str, str]]:
    task = _DbtListTask()
    task.manifest = target_manifest

    if dbt_version < '1.5':
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

    if dbt_version >= '1.4':
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
