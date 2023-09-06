import math
import urllib.parse
from datetime import timedelta
from io import StringIO
from typing import Callable, Dict, List

from dbt.contracts.graph.manifest import Manifest

from piperider_cli.dbt import dbt_version
from piperider_cli.dbt.list_task import (
    list_changes_in_unique_id,
    list_modified_with_downstream, list_resources_data_from_manifest,
    load_manifest,
)
from piperider_cli.dbt.markdown import MarkdownTable
from piperider_cli.dbt.utils import ChangeType, ChangeUnit, ColumnChangeEntry, ColumnChangeView, JoinedTables, \
    MetricsChangeView, ResourceType


def embed_url_cli(content: str, url: str, unique_id: str, resource_type: str):
    return content


def embed_url_cloud(content: str, url: str, unique_id: str, resource_type: str):
    return f"[{content}]({url}?utm_source=pr#/{resource_type}s/{urllib.parse.quote(unique_id)})"


embed_url = None
try:
    from web import patch_sys_path_for_piperider_cli

    patch_sys_path_for_piperider_cli()
    embed_url = embed_url_cloud
except ImportError:
    embed_url = embed_url_cli


class DefaultChangeSetOpMixin:
    __slots__ = ()

    def load_run_as_manifest(self, run: Dict):
        manifest = run.get("dbt", {}).get("manifest", {})
        if manifest == {}:
            raise ValueError("Cannot find .dbt.manifest in run data")
        return load_manifest(manifest)

    def resolve_unique_id(self, resource_name: str, resource_type: str):
        for entry in self.base_resources + self.target_resources:
            if entry.get("resource_type") == resource_type and entry.get("name") == resource_name:
                return entry.get("unique_id")

    def has_changed(self, p1: Dict, p2: Dict):
        """
        p1 and p2 are table profiled data
        """

        base_cols: Dict[str, Dict] = p1.get("columns")
        target_cols: Dict[str, Dict] = p2.get("columns")

        if base_cols is None or target_cols is None:
            return True

        for k in base_cols:
            if ColumnChangeView(base_cols.get(k)) != ColumnChangeView(
                target_cols.get(k)
            ):
                return True

        for k in target_cols:
            if ColumnChangeView(base_cols.get(k)) != ColumnChangeView(
                target_cols.get(k)
            ):
                return True

        return False


class SummaryAggregate:
    display_name: str
    resource_type: str
    total: int

    explicit_changeset: List[ChangeUnit] = None

    # TODO discovery the downstream of added by "dbt list --select model_name+"
    # it mixed resources with "model" and "metric"
    modified_with_downstream: List[ChangeUnit] = None

    # value changes from profiling data
    diffs: List[str] = None
    no_diffs: List[str] = None
    skipped: List[str] = None

    def __init__(self, display_name: str):
        self.display_name = display_name
        if self.display_name == 'Models':
            self.resource_type = 'model'
        elif self.display_name == 'Metrics':
            self.resource_type = 'metric'
        elif self.display_name == 'Seeds':
            self.resource_type = 'seed'
        else:
            raise ValueError(f'Unknown type for {display_name}')

    @property
    def explicit_changes(self) -> int:
        """
        the code changes
        """
        self._ensure_initialized()
        return len(self.explicit_changeset)

    @property
    def impacted(self) -> int:
        """
        any code changes and all downstream
        """
        self._ensure_initialized()

        # TODO discovery the downstream of added by "dbt list --select model_name+"

        code_changes: List[str] = [x.unique_id for x in self.explicit_changeset]
        modified: List[str] = [x.unique_id for x in self.modified_with_downstream if
                               x.resource_type.value == self.resource_type]
        return len(set(modified + code_changes))

    @property
    def implicit_changes(self) -> int:
        """
        all value changes excluding the code changes
        """
        self._ensure_initialized()
        code_changes: List[str] = [x.unique_id for x in self.explicit_changeset]
        return len(set(self.diffs) - set(code_changes))

    @property
    def implicit_changeset(self) -> List[ChangeUnit]:
        self._ensure_initialized()
        code_changes: List[str] = [x.unique_id for x in self.explicit_changeset]
        ids = set(self.diffs) - set(code_changes)

        def _t(x: ChangeUnit):
            x.change_type = ChangeType.IMPLICIT
            return x

        return [_t(x) for x in self.modified_with_downstream if x.unique_id in ids]

    def _ensure_initialized(self):
        if self.explicit_changeset is None:
            raise ValueError('explicit_changeset is not initialized')
        if self.modified_with_downstream is None:
            raise ValueError('modified_with_downstream is not initialized')


class LookUpTable:

    def __init__(self, c: "SummaryChangeSet"):
        self.c: "SummaryChangeSet" = c

        self.path_mapping = self._build_path_mapping()
        self.base_execution, self.target_execution = self._build_dbt_time_mapping()
        self.base_tests, self.target_tests = self._build_tests_mapping()
        self.label_mapping = self._build_metric_label_mapping()
        self.grain_metric_mapping = self._build_grain_metric_mapping()
        self._sorted_weights: Dict[str, int] = self._build_sorting_parameters()

    def _build_path_mapping(self) -> Dict[str, str]:
        m = dict()
        for x in self.c.target_resources + self.c.base_resources:
            unique_id, resource_path = x.get('unique_id'), x.get('original_file_path')
            if unique_id not in m:
                m[unique_id] = resource_path

        return m

    def path(self, unique_id: str):
        p = self.path_mapping.get(unique_id)
        limit = 28
        if p is not None and len(p) >= limit:
            return f"..{p[len(p) - limit:]}"
        return p

    def tests(self, unique_id: str):
        return sum(self.base_tests.get(unique_id, dict(passed=0, failed=0)).values()), \
               sum(self.target_tests.get(unique_id, dict(passed=0, failed=0)).values())

    def failed_tests(self, unique_id: str):
        return self.base_tests.get(unique_id, dict(passed=0, failed=0)).get('failed'), \
               self.target_tests.get(unique_id, dict(passed=0, failed=0)).get('failed')

    def _build_dbt_time_mapping(self):
        base_execution = {x.get('unique_id'): x.get('execution_time') for x in
                          self.c.base.get('dbt', {}).get('run_results', {}).get('results', [])}
        target_execution = {x.get('unique_id'): x.get('execution_time') for x in
                            self.c.target.get('dbt', {}).get('run_results', {}).get('results', [])}

        return base_execution, target_execution

    def execution_time(self, unique_id: str):
        return self.base_execution.get(unique_id), self.target_execution.get(unique_id)

    @staticmethod
    def to_human_readable(seconds: float):
        if seconds is None:
            return "-"

        return str(timedelta(seconds=seconds))[:-4]

    def _build_tests_mapping(self):
        # TODO the test should be ref by the unique_id
        from collections import Counter
        # convert test results to (table_name, pass_or_not): count form
        b = Counter([(x.get('table'), x.get('status')) for x in self.c.base.get('tests', [])])
        t = Counter([(x.get('table'), x.get('status')) for x in self.c.target.get('tests', [])])

        def as_dict(c: Counter):
            m = dict()
            for (table, status), v in c.items():
                if table not in m:
                    m[table] = dict(passed=0, failed=0)

                if status == 'passed':
                    m[table]['passed'] += v
                else:
                    m[table]['failed'] += v
            return m

        return as_dict(b), as_dict(t)

    def _build_metric_label_mapping(self) -> Dict[str, str]:
        m = dict()
        for unique_id, v in self.c.base_manifest.metrics.items():
            m[unique_id] = v.label

        for unique_id, v in self.c.target_manifest.metrics.items():
            m[unique_id] = v.label

        return m

    def _build_grain_metric_mapping(self):
        mapping = dict()

        base_run_metrics = self.c.base.get('metrics', [])
        target_run_metrics = self.c.target.get('metrics', [])

        for unique_id in self.c.base_manifest.metrics:
            if unique_id not in mapping:
                mapping[unique_id] = dict()
            metrics_group = '.'.join(unique_id.split('.')[2:])
            for metric in base_run_metrics:
                if metrics_group == metric.get("headers")[1]:
                    name = metric.get("name")
                    if name not in mapping[unique_id]:
                        mapping[unique_id][name] = MetricsChangeView(name)
                    m = mapping[unique_id][name]
                    m.metric_group = metrics_group
                    m.base_data = metric.get("data")

        for unique_id in self.c.target_manifest.metrics:
            if unique_id not in mapping:
                mapping[unique_id] = dict()
            metrics_group = '.'.join(unique_id.split('.')[2:])
            for metric in target_run_metrics:
                if metrics_group == metric.get("headers")[1]:
                    name = metric.get("name")
                    if name not in mapping[unique_id]:
                        mapping[unique_id][name] = MetricsChangeView(name)
                    m = mapping[unique_id][name]
                    m.metric_group = metrics_group
                    m.target_data = metric.get("data")

        return mapping

    def _build_sorting_parameters(self):
        from piperider_cli import dbtutil
        from piperider_cli.dbt.sorting import topological_sort

        g1 = dbtutil.prepare_topological_graph(self.c.base.get('dbt', {}).get('manifest', {}))
        g2 = dbtutil.prepare_topological_graph(self.c.target.get('dbt', {}).get('manifest', {}))

        g = dict()
        for k in set(list(g1.keys()) + list(g2.keys())):
            if k in g1 and k in g2:
                g[k] = list(set(g1[k] + g2[k]))
                continue

            if k in g1:
                g[k] = g1[k]
            if k in g2:
                g[k] = g2[k]

        sorted_parameters = topological_sort(g, len(list(g.keys())))
        weights = dict()
        for x in sorted_parameters:
            weights[x] = len(weights)
        return weights

    def sort(self, changeset: List[ChangeUnit]) -> List[ChangeUnit]:
        from functools import cmp_to_key

        def callback(a: ChangeUnit, b: ChangeUnit) -> int:
            av = self._sorted_weights[a.unique_id]
            bv = self._sorted_weights[b.unique_id]

            if av == bv:
                return 0

            if av < bv:
                return -1

            if av > bv:
                return 1

        return sorted(changeset, key=cmp_to_key(callback))


class SummaryChangeSet(DefaultChangeSetOpMixin):
    def __init__(self, base: Dict, target: Dict):
        self.base: Dict = base
        self.target: Dict = target
        self.base_manifest: Manifest = self.load_run_as_manifest(base)
        self.target_manifest: Manifest = self.load_run_as_manifest(target)
        self.tables = JoinedTables(self.base, self.target)

        # resources in this format [{unique_id, name, resource_type}]
        self.base_resources = list_resources_data_from_manifest(self.base_manifest)
        self.target_resources = list_resources_data_from_manifest(self.target_manifest)

        self.mapper = LookUpTable(self)

        self.modified_models_and_metrics_with_downstream = \
            list_modified_with_downstream(self.base_manifest, self.target_manifest)

        self.models = SummaryAggregate('Models')
        self.metrics = SummaryAggregate('Metrics')
        self.seeds = SummaryAggregate('Seeds')

        # TODO the execute should be merged into each aggregate
        self.execute()

    def get_url(self):
        if hasattr(self, 'url'):
            return self.url
        return ""

    def execute(self):
        self.models.explicit_changeset = self.find_explicit_changes('model')
        self.update_models_value_changes()

        self.metrics.explicit_changeset = self.find_explicit_changes('metric')
        self.update_metrics_value_changes()

        self.seeds.explicit_changeset = self.find_explicit_changes('seed')
        self.update_seeds_value_changes()

        # configure the modified + downstream
        modified_with_downstream = [ChangeUnit(unique_id=x.get('unique_id'), change_type=ChangeType.IGNORED,
                                               resource_type=ResourceType.of(x.get('resource_type')))
                                    for x in self.modified_models_and_metrics_with_downstream]
        self.models.modified_with_downstream = modified_with_downstream
        self.metrics.modified_with_downstream = modified_with_downstream
        self.seeds.modified_with_downstream = modified_with_downstream
        self.update_modified_with_downstream(modified_with_downstream)

        # update total values
        self.models.total = len([x for x in self.target_resources if x.get('resource_type') == 'model'])
        self.metrics.total = len([x for x in self.target_resources if x.get('resource_type') == 'metric'])

    def find_explicit_changes(self, resource_type_filter: str):
        base_resources = [x.get("unique_id") for x in self.base_resources if
                          x.get('resource_type') == resource_type_filter]
        target_resources = [x.get("unique_id") for x in self.target_resources if
                            x.get('resource_type') == resource_type_filter]

        resource_in_both = list(set(base_resources).intersection(target_resources))
        # exclude added and removed by intersection with common resources
        modified = [
            x.get("unique_id")
            for x in list_changes_in_unique_id(
                self.base_manifest, self.target_manifest, True
            )
        ]

        def as_unit(unique_id: str, change_type: ChangeType):
            return ChangeUnit(unique_id=unique_id, change_type=change_type,
                              resource_type=ResourceType.of(resource_type_filter))

        modified = [as_unit(x, ChangeType.MODIFIED) for x in list(set(modified).intersection(resource_in_both))]
        added = [as_unit(x, ChangeType.ADDED) for x in list(set(target_resources) - set(base_resources))]
        removed = [as_unit(x, ChangeType.REMOVED) for x in list(set(base_resources) - set(target_resources))]
        return added + removed + modified

    def update_models_value_changes(self):
        # list implicit changes and exclude added and removed tables
        diffs = []
        no_diffs = []
        skipped = []

        def _resolve_id(ref_id: str, table_name: str):
            if ref_id:
                if not ref_id.startswith("model."):
                    return None
                return ref_id
            else:
                resolved_id = self.resolve_unique_id(table_name, "model")
                assert resolved_id is not None
                return resolved_id

        for table_name, ref_id, b, t in self.tables.table_data_iterator():
            r1, r2 = self.tables.row_counts(table_name)
            c1, c2 = self.tables.column_counts(table_name)
            both_profiled = not math.isnan(r1) and not math.isnan(r2)
            if both_profiled:
                if r1 == r2 and c1 == c2 and not self.has_changed(b, t):
                    resolved_id = _resolve_id(ref_id, table_name)
                    if resolved_id:
                        no_diffs.append(resolved_id)
                else:
                    resolved_id = _resolve_id(ref_id, table_name)
                    if resolved_id:
                        diffs.append(resolved_id)
            else:
                if b and t and self.has_changed(b, t):
                    resolved_id = _resolve_id(ref_id, table_name)
                    if resolved_id:
                        diffs.append(resolved_id)
                else:
                    resolved_id = _resolve_id(ref_id, table_name)
                    if resolved_id:
                        if not math.isnan(r2):
                            no_diffs.append(resolved_id)
                        else:
                            skipped.append(resolved_id)

        self.models.diffs = list(set(diffs))
        self.models.no_diffs = list(set(no_diffs))
        self.models.skipped = list(set(skipped))

    def update_seeds_value_changes(self):
        # list implicit changes and exclude added and removed tables
        diffs = []
        no_diffs = []
        skipped = []

        def _resolve_id(ref_id: str, table_name: str):
            if ref_id:
                if not ref_id.startswith("seed."):
                    return None
                return ref_id
            else:
                resolved_id = self.resolve_unique_id(table_name, "seed")
                assert resolved_id is not None
                return resolved_id

        for table_name, ref_id, b, t in self.tables.table_data_iterator():
            r1, r2 = self.tables.row_counts(table_name)
            c1, c2 = self.tables.column_counts(table_name)
            both_profiled = not math.isnan(r1) and not math.isnan(r2)
            if both_profiled:
                if r1 == r2 and c1 == c2 and not self.has_changed(b, t):
                    resolved_id = _resolve_id(ref_id, table_name)
                    if resolved_id:
                        no_diffs.append(resolved_id)
                else:
                    resolved_id = _resolve_id(ref_id, table_name)
                    if resolved_id:
                        diffs.append(resolved_id)
            else:
                if b and t and self.has_changed(b, t):
                    resolved_id = _resolve_id(ref_id, table_name)
                    if resolved_id:
                        diffs.append(resolved_id)
                else:
                    resolved_id = _resolve_id(ref_id, table_name)
                    if resolved_id:
                        if not math.isnan(r2):
                            no_diffs.append(resolved_id)
                        else:
                            skipped.append(resolved_id)

        self.seeds.diffs = list(set(diffs))
        self.seeds.no_diffs = list(set(no_diffs))
        self.seeds.skipped = list(set(skipped))

    def update_metrics_value_changes(self):
        # exclude added and removed
        metrics_b = {x.get("name"): x for x in self.base.get("metrics", {})}
        metrics_t = {x.get("name"): x for x in self.target.get("metrics", {})}

        diffs = []
        no_diffs = []
        # NOTE: The non-queried metrics are not included in the skipped list, because they are not in run.json
        # TODO: it would be nice to include them in the skipped list
        skipped = []

        def _resolve_id(ref_id: str, metric):
            if ref_id:
                if not ref_id.startswith("metric."):
                    return None
                return ref_id
            else:
                # resolve the unique id for the legacy report
                metric_name = metric.get(x).get("headers")[-1]
                ref_id = self.resolve_unique_id(metric_name, "metric")
                assert ref_id is not None
                return ref_id

        for x in set(list(metrics_b.keys()) + list(metrics_t.keys())):
            if x in metrics_b and x in metrics_t:
                if metrics_b.get(x) != metrics_t.get(x):
                    ref_id = metrics_t.get(x).get("ref_id")
                    resolved_id = _resolve_id(ref_id, metrics_t)
                    if resolved_id:
                        diffs.append(ref_id)
                else:
                    ref_id = metrics_t.get(x).get("ref_id")
                    resolved_id = _resolve_id(ref_id, metrics_t)
                    if resolved_id:
                        no_diffs.append(ref_id)
            else:
                if x in metrics_t:
                    ref_id = metrics_t.get(x).get("ref_id")
                    ref_id = _resolve_id(ref_id, metrics_t)
                    if ref_id:
                        no_diffs.append(ref_id)
                elif x in metrics_b:
                    ref_id = metrics_b.get(x).get("ref_id")
                    ref_id = _resolve_id(ref_id, metrics_b)
                    if ref_id:
                        skipped.append(ref_id)

        self.metrics.diffs = list(set(diffs))
        self.metrics.no_diffs = list(set(no_diffs) - set(diffs))
        self.metrics.skipped = list(set(skipped) - set(diffs) - set(no_diffs))

    def update_modified_with_downstream(self, units: List[ChangeUnit]):
        explicit_changes = self.models.explicit_changeset + self.metrics.explicit_changeset + self.seeds.explicit_changeset
        implicit_changes = self.models.implicit_changeset + self.metrics.implicit_changeset + self.seeds.implicit_changeset
        changes = explicit_changes + implicit_changes

        for unit in units:
            for c in changes:
                if unit.unique_id == c.unique_id:
                    unit.change_type = c.change_type
                    break

    def generate_markdown(self):
        # ref: https://gist.github.com/popcornylu/7a9f68c1ea80f09ba9c780d2026ce71e
        output = StringIO()

        def out_func(message: str):
            print(message, file=output)

        out_func("")

        self.generate_impact_summary_section(out_func)
        self.generate_resource_impact_section(out_func)

        return output.getvalue()

    def generate_impact_summary_section(self, out: Callable[[str], None]) -> None:
        out("# Impact Summary")
        if self.get_url():
            out(f"[PipeRider Report]({self.get_url()}?utm_source=pr)")
        out("### Code Changes")
        mt = MarkdownTable(headers=['Added', 'Removed', 'Modified'])
        explicit_changes = self.models.explicit_changeset + self.metrics.explicit_changeset + self.seeds.explicit_changeset
        added = [x for x in explicit_changes if x.change_type == ChangeType.ADDED]
        removed = [x for x in explicit_changes if x.change_type == ChangeType.REMOVED]
        modified = [x for x in explicit_changes if x.change_type == ChangeType.MODIFIED]
        mt.add_row([len(added), len(removed), len(modified)])
        out(mt.build())

        out("### Resource Impact")
        mt = MarkdownTable(headers=['Potentially Impacted', 'Assessed', 'Impacted'])
        potentially_impacted = [x.unique_id for x in (self.models.modified_with_downstream + removed)]
        impacted = [x for x in list(set(self.models.diffs + self.metrics.diffs + self.seeds.diffs)) if
                    x in potentially_impacted]
        assessed_no_impacted = [x for x in list(set(self.models.no_diffs + self.metrics.no_diffs + self.seeds.no_diffs))
                                if x in potentially_impacted]

        mt.add_row([len(potentially_impacted),
                    f"{len(impacted) + len(assessed_no_impacted)} assessed, "
                    f"{len(potentially_impacted) - len(impacted) - len(assessed_no_impacted)} skipped",
                    len(impacted)])
        out(mt.build())

    def generate_resource_impact_section(self, out: Callable[[str], None]) -> None:
        out("# Resource Impact")
        self.generate_models_section(out)
        self.generate_metrics_section(out)

    def generate_models_section(self, out: Callable[[str], None]) -> None:
        out("### Models")
        m = self.models
        modified_with_downstream = [x for x in m.modified_with_downstream if x.resource_type == ResourceType.MODEL]
        removed = [x for x in m.explicit_changeset if x.change_type == ChangeType.REMOVED]
        changeset = self.mapper.sort(modified_with_downstream + removed)
        if not changeset:
            out("No changes detected")
            return

        column_header = """
        Columns <br> <img src="https://raw.githubusercontent.com/InfuseAI/piperider/main/images/icons/icon-diff-delta-plus%402x.png" width="10px"> <img src="https://raw.githubusercontent.com/InfuseAI/piperider/main/images/icons/icon-diff-delta-minus%402x.png" width="10px"> <img src="https://raw.githubusercontent.com/InfuseAI/piperider/main/images/icons/icon-diff-delta-explicit%402x.png" width="10px">
        """.strip()

        mt = MarkdownTable(
            headers=['&nbsp;&nbsp;&nbsp;', 'Model', 'Impact', column_header, 'Rows', 'Dbt Time', 'Failed Tests',
                     'All Tests'])

        def impact(c: ChangeUnit):
            impacted = self.models.diffs
            skipped = self.models.skipped
            assessed_no_impacted = self.models.no_diffs
            if c.unique_id in impacted:
                return "Impacted"
            elif c.unique_id in skipped:
                return "Skipped"
            elif c.unique_id in assessed_no_impacted:
                return "Assessed not impacted"

        def cols(c: ChangeUnit):
            counts = self.tables.column_counts(c.unique_id)
            if c.change_type == ChangeType.ADDED:
                _, t = counts
                return t
            if c.change_type == ChangeType.REMOVED:
                b, _ = counts
                return f"~~{b}~~"
            if c.change_type == ChangeType.MODIFIED or c.change_type == ChangeType.IMPLICIT:
                b, t = counts
                """
                example:
                16 ($\color{green}{\text{ 1 }}$ / $\color{red}{\text{ 1 }}$ / $\color{orange}{\text{ 5 }}$)
                """

                changes = list(self.tables.columns_changed_iterator(c.unique_id))

                def col_state(c: ColumnChangeEntry):
                    if c.base_view.data is not None and c.target_view.data is not None:
                        return ChangeType.MODIFIED
                    if c.base_view.data is None:
                        return ChangeType.ADDED
                    if c.target_view.data is None:
                        return ChangeType.REMOVED
                    raise ValueError("Cannot be here")

                stat = [col_state(x) for x in changes]
                from collections import Counter
                counter = Counter(stat)
                param = dict(value=t,
                             added=counter.get(ChangeType.ADDED, 0),
                             removed=counter.get(ChangeType.REMOVED, 0),
                             modified=counter.get(ChangeType.MODIFIED, 0),
                             )

                output = r"%(value)s ($\color{green}{\text{ %(added)s }}$ /" \
                         r" $\color{red}{\text{ %(removed)s }}$ /" \
                         r" $\color{orange}{\text{ %(modified)s }}$)" % param
                return output
            if c.change_type == ChangeType.IGNORED:
                b, t = counts
                return t

            return '-'

        def rows(c: ChangeUnit):
            rows = self.tables.row_counts(c.unique_id)
            if c.change_type == ChangeType.ADDED:
                _, t = rows
                return t
            if c.change_type == ChangeType.REMOVED:
                b, _ = rows
                return f"~~{b}~~"
            if c.change_type == ChangeType.MODIFIED or c.change_type == ChangeType.IMPLICIT:
                b, t = rows
                """
                example:
                997 $\color{green}{\text{ (↑ 20) }}$
                97 $\color{red}{\text{ (↓ -2) }}$
                """
                text = r'%(value)s $\color{%(color)s}{\text{ (%(sign)s %(diff)s) }}$'
                return ChangeType.MODIFIED.display_changes(b, t, text)
            if c.change_type == ChangeType.IGNORED:
                b, t = rows
                return t
            return '-'

        def dbt_time(c: ChangeUnit):
            b, t = self.mapper.execution_time(c.unique_id)
            if c.change_type == ChangeType.ADDED:
                return LookUpTable.to_human_readable(t)

            if c.change_type == ChangeType.REMOVED:
                return ""
            if c.change_type == ChangeType.MODIFIED or c.change_type == ChangeType.IMPLICIT or c.change_type == ChangeType.IGNORED:
                """
                example:
                0:00:00.16 $\color{green}{\text{ (↓ 0.05) }}$
                """
                text = r'%(value)s $\color{%(color)s}{\text{ (%(sign)s %(diff).2f) }}$'
                return ChangeType.MODIFIED.display_changes(b, t, text, converter=LookUpTable.to_human_readable,
                                                           negative_change=True)

            return '-'

        def failed_tests(c: ChangeUnit):
            _, all_t = self.mapper.tests(c.table_name)
            b, t = self.mapper.failed_tests(c.table_name)
            if c.change_type == ChangeType.ADDED:
                if all_t == 0:
                    return "-"
                return t
            if c.change_type == ChangeType.REMOVED:
                return ""
            if c.change_type == ChangeType.MODIFIED or c.change_type == ChangeType.IMPLICIT or c.change_type == ChangeType.IGNORED:
                if all_t == 0:
                    return "-"
                if b == t:
                    return f"{t}"
                text = r'%(value)s ($\color{%(color)s}{\text{ (%(sign)s %(diff)s) }}$)'
                return ChangeType.MODIFIED.display_changes(b, t, text, negative_change=True)
            return "-"

        def all_tests(c: ChangeUnit):
            b, t = self.mapper.tests(c.table_name)
            if c.change_type == ChangeType.ADDED:
                if t == 0:
                    return "-"
                return t
            if c.change_type == ChangeType.REMOVED:
                return ""
            if c.change_type == ChangeType.MODIFIED or c.change_type == ChangeType.IMPLICIT or c.change_type == ChangeType.IGNORED:
                if t == 0:
                    return "-"
                if b == t:
                    return f"{t}"
                text = r'%(value)s ($\color{%(color)s}{\text{ (%(sign)s %(diff)s) }}$)'
                return ChangeType.MODIFIED.display_changes(b, t, text)
            return "-"

        for c in changeset[:50]:
            mt.add_row(
                [c.change_type.icon_image_tag,
                 embed_url(self.mapper.path(c.unique_id), self.get_url(), c.unique_id, c.resource_type.value),
                 impact(c), cols(c), rows(c), dbt_time(c), failed_tests(c),
                 all_tests(c)])

        if len(changeset) > 50:
            remainings = len(changeset) - 50
            footer = ['', f'{remainings} more potentially impacted models']
            if mt.num_of_columns > 2:
                footer += [''] * (mt.num_of_columns - 2)

            mt.add_row(footer)

        out(mt.build())

    def generate_metrics_section(self, out: Callable[[str], None]) -> None:
        out("### Metrics")
        m = self.metrics
        modified_with_downstream = [x for x in m.modified_with_downstream if x.resource_type == ResourceType.METRIC]
        removed = [x for x in m.explicit_changeset if x.change_type == ChangeType.REMOVED]
        changeset = self.mapper.sort(modified_with_downstream + removed)
        if not changeset:
            out("No changes detected")
            return

        grain_metrics = self.mapper.grain_metric_mapping
        labels = self.mapper.label_mapping

        for c in changeset:
            for gm in grain_metrics[c.unique_id].values():
                gm.update_status()

        metrics_summary = {}
        for c in changeset[:50]:
            label = labels[c.unique_id]
            metrics_summary[label] = {
                'total': 0, 'no-changes': 0, 'edited': 0, 'added': 0, 'removed': 0,
                'state_icon': c.change_type.icon_image_tag,
            }

            for gm in grain_metrics[c.unique_id].values():
                metrics_summary[label][gm.change_type] += 1
                metrics_summary[label]['total'] += 1

        if not metrics_summary:
            out("")

        def latex_orange(text):
            if text is None:
                return ""
            if isinstance(text, str) and '%' in text:
                text = text.replace('%', '\%')
            return r'$\color{orange}{\text{ %s }}$' % str(text)

        mt = MarkdownTable(
            headers=['&nbsp;&nbsp;&nbsp;', 'Metric', 'Impact', f"Queries <br> total ({latex_orange('change')})"])

        def impact(c: ChangeUnit):
            impacted = self.metrics.diffs
            skipped = self.metrics.skipped
            assessed_no_impacted = self.metrics.no_diffs
            if c.unique_id in impacted:
                return "Impacted"
            elif c.unique_id in skipped:
                return "Skipped"
            elif c.unique_id in assessed_no_impacted:
                return "Assessed not impacted"
            else:
                return "Skipped"

        for c in changeset[:50]:
            label = labels[c.unique_id]
            entry = metrics_summary[label]
            chagned = f"({latex_orange(str(entry['edited']))})" if entry['edited'] > 0 else ""
            mt.add_row([
                entry['state_icon'],
                embed_url(label, self.get_url(), c.unique_id, c.resource_type.value),
                impact(c),
                f"{entry['total'] if entry['total'] > 0 else '-'} {chagned}"
            ])

        if len(changeset) > 50:
            remainings = len(changeset) - 50
            footer = ['', f'{remainings} more potentially impacted metrics']
            if mt.num_of_columns > 2:
                footer += [''] * (mt.num_of_columns - 2)

            mt.add_row(footer)

        out(mt.build())

    def build_path_mapping(self) -> Dict[str, str]:
        m = dict()

        for x in self.target_resources + self.base_resources:
            unique_id, resource_path = x.get('unique_id'), x.get('original_file_path')
            if unique_id not in m:
                m[unique_id] = resource_path

        return m


class GraphDataChangeSet(DefaultChangeSetOpMixin):
    def __init__(self, base: Dict, target: Dict):
        self.base: Dict = base
        self.target: Dict = target
        self.base_manifest: Manifest = self.load_run_as_manifest(base)
        self.target_manifest: Manifest = self.load_run_as_manifest(target)

        # resources in this format [{unique_id, name, resource_type}]
        self.base_resources = list_resources_data_from_manifest(self.base_manifest)
        self.target_resources = list_resources_data_from_manifest(self.target_manifest)

        self.explicit_changes = sorted(self._do_list_explicit_changes())

    def _do_list_explicit_changes(self):
        base_resources = [x.get("unique_id") for x in self.base_resources]
        target_resources = [x.get("unique_id") for x in self.target_resources]

        resource_in_both = list(set(base_resources).intersection(target_resources))
        # exclude added and removed by intersection with common resources
        output = [
            x.get("unique_id")
            for x in list_changes_in_unique_id(
                self.base_manifest, self.target_manifest, True
            )
        ]
        output = list(set(output).intersection(resource_in_both))

        return [x for x in output if not x.startswith('test.')]

    def list_explicit_changes(self):
        return self.explicit_changes

    def _metrics_implicit_changes(self):
        # exclude added and removed
        metrics_b = {x.get("name"): x for x in self.base.get("metrics", {})}
        metrics_t = {x.get("name"): x for x in self.target.get("metrics", {})}

        diffs = []
        for x in set(list(metrics_b.keys()) + list(metrics_t.keys())):
            if x in metrics_b and x in metrics_t:
                if metrics_b.get(x) != metrics_t.get(x):
                    ref_id = metrics_t.get(x).get("ref_id")
                    if ref_id:
                        if not ref_id.startswith("metric."):
                            continue
                        diffs.append(ref_id)
                    else:
                        # resolve the unique id for the legacy report
                        metric_name = metrics_t.get(x).get("headers")[-1]
                        ref_id = self.resolve_unique_id(metric_name, "metric")
                        assert ref_id is not None
                        diffs.append(ref_id)

        implicit = list(set(diffs))
        return implicit

    def _table_implicit_changes(self):
        # list implicit changes and exclude added and removed tables

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
                    if ref_id:
                        if not ref_id.startswith("model.") and not ref_id.startswith("seed."):
                            continue
                        diffs.append(ref_id)
                    else:
                        resolved_id = self.resolve_unique_id(table_name, "model")
                        if not resolved_id:
                            resolved_id = self.resolve_unique_id(table_name, "seed")
                        assert resolved_id is not None
                        diffs.append(resolved_id)

        return diffs

    def list_implicit_changes(self):
        table_implicit = self._table_implicit_changes()
        metric_implicit = self._metrics_implicit_changes()

        return sorted(table_implicit + metric_implicit)
