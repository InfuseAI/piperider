import os
from pathlib import PosixPath

import dbt.flags as flags_module
import dbt.tracking
from dbt.adapters.factory import register_adapter
from dbt.config.profile import Profile, read_profile
from dbt.config.project import load_raw_project
from dbt.config.renderer import ProfileRenderer
from dbt.config.runtime import RuntimeConfig, load_project
from dbt.node_types import NodeType
from dbt.parser.manifest import ManifestLoader
from dbt.task.list import ListTask
from dbt.cli.resolvers import default_project_dir, default_profiles_dir


class DbtFunctions:

    def __init__(self, base_path: str, target_path: str):
        self.dbt_flags = None
        self.init_flags()
        self.base_path = base_path
        self.target_path = target_path

    def init_flags(self):
        dbt_flags = flags_module.get_flag_obj()
        flags_module.set_flags(dbt_flags)
        user = dbt.tracking.User("")
        dbt.tracking.active_user = user

        setattr(dbt_flags, 'MACRO_DEBUGGING', False)
        # note: doing partial parsing
        setattr(dbt_flags, 'PARTIAL_PARSE', False)
        setattr(dbt_flags, 'PROFILES_DIR', default_profiles_dir())
        self.dbt_flags = dbt_flags

    def list(self, resource_type: str, include_downstream: bool = False):
        raw_project = load_raw_project(str(default_project_dir()))
        raw_profile = read_profile(str(default_profiles_dir()))
        profile_renderer = ProfileRenderer({})
        profile = Profile.from_raw_profiles(raw_profile, raw_project.get("profile"), profile_renderer)
        project = load_project(str(default_project_dir()), True, profile)
        project.target_path = self.target_path
        setattr(self.dbt_flags, 'profile', profile.profile_name)
        setattr(self.dbt_flags, 'target', profile.target_name)
        runtime_config = RuntimeConfig.from_parts(project, profile, self.dbt_flags)
        runtime_config.target_path = self.target_path
        register_adapter(runtime_config)
        manifest = ManifestLoader.get_full_manifest(runtime_config)

        # --state args

        setattr(self.dbt_flags, 'models', None)
        setattr(self.dbt_flags, 'WRITE_JSON', None)
        setattr(self.dbt_flags, 'cls', ListTask)
        setattr(self.dbt_flags, 'output', 'selector')
        setattr(self.dbt_flags, 'exclude', None)
        setattr(self.dbt_flags, 'selector', None)
        setattr(self.dbt_flags, 'INDIRECT_SELECTION', 'eager')
        setattr(self.dbt_flags, 'LOG_FORMAT', 'json')
        setattr(self.dbt_flags, 'state', PosixPath(self.base_path))

        resource_type_map = {
            'model': NodeType.Model,
            'metric': NodeType.Metric,
        }
        setattr(self.dbt_flags, 'resource_types', {resource_type_map[resource_type]})

        select_stmt = 'state:modified'
        if include_downstream:
            select_stmt += '+'
        setattr(self.dbt_flags, 'select', (select_stmt,))

        task = ListTask(self.dbt_flags, runtime_config, manifest)

        return task.run()


if __name__ == '__main__':
    from click.core import Context, Command
    from dbt.cli.flags import Flags

    # Flags(Context(Command("list")))

    dbt_funcs = DbtFunctions(os.path.join(os.getcwd(), 'base'), os.path.join(os.getcwd(), 'target'))
    dbt_funcs.list('model')
