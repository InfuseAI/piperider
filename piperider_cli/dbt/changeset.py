import math
from typing import Dict, List

from dbt.contracts.graph.manifest import Manifest

from piperider_cli.dbt.list_task import (
    list_changes_in_unique_id,
    list_modified_with_downstream, list_resources_unique_id_from_manifest,
    load_manifest,
)


class SummaryOverview:
    resource_type: str
    total: int
    explicit_changes: int
    impacted: int
    implicit_changes: int

    added: int
    removed: int
    modified: int


class SummaryChangeSet:
    def __init__(self, base: Dict, target: Dict):
        self.base: Dict = base
        self.target: Dict = target
        self.base_manifest: Manifest = self._m(base)
        self.target_manifest: Manifest = self._m(target)

        # resources in this format [{unique_id, name, resource_type}]
        self.base_resources = list_resources_unique_id_from_manifest(self.base_manifest)
        self.target_resources = list_resources_unique_id_from_manifest(
            self.target_manifest
        )
        self.modified_models_and_metrics_with_downstream = list_modified_with_downstream(self.base_manifest,
                                                                                         self.target_manifest)

        self.models = SummaryOverview()
        self.models.resource_type = 'Models'
        self.metrics = SummaryOverview()
        self.metrics.resource_type = 'Metrics'

        self.models_modified: List = []
        self.models_added: List = []
        self.models_removed: List = []

        self.metrics_modified: List = []
        self.metrics_added: List = []
        self.metrics_removed: List = []

        self.models_implicit_changes: List = []
        self.update_models_explicit_changes()
        self.update_models_implicit_changes()

        self.metrics_implicit_changes: List = []
        self.update_metrics_explicit_changes()
        self.update_metrics_implicit_changes()

        self.execute()

    def _m(self, run: Dict):
        manifest = run.get("dbt", {}).get("manifest", {})
        if manifest == {}:
            raise ValueError("Cannot find .dbt.manifest in run data")
        return load_manifest(manifest)

    def execute(self):
        # update total
        self.models.total = len([x for x in self.target_resources if x.get('resource_type') == 'model'])
        self.metrics.total = len([x for x in self.target_resources if x.get('resource_type') == 'metric'])

        # update model explicit changes
        self.models.explicit_changes = sum(
            [len(self.models_added), len(self.models_removed), len(self.models_modified)])

        # update model impacted
        dbt_listed_modified_model_plus = [x.get('unique_id') for x in self.modified_models_and_metrics_with_downstream
                                          if
                                          x.get('resource_type') == 'model']

        # TODO discovery the downstream of added by "dbt list --select model_name+"
        models_impacted = set(
            dbt_listed_modified_model_plus + self.models_added + self.models_removed + self.models_modified)
        self.models.impacted = len(models_impacted)

        # update model implicit changes
        self.models.implicit_changes = len(self.models_implicit_changes)

        # update metrics explicit
        self.metrics.explicit_changes = sum(
            [len(self.metrics_added), len(self.metrics_removed), len(self.metrics_modified)])

        dbt_listed_modified_metrics_plus = [x.get('unique_id') for x in self.modified_models_and_metrics_with_downstream
                                            if
                                            x.get('resource_type') == 'metric']
        metrics_impacted = set(
            dbt_listed_modified_metrics_plus + self.metrics_added + self.metrics_removed + self.metrics_modified)
        self.metrics.impacted = len(metrics_impacted)
        self.metrics.implicit_changes = len(self.metrics_implicit_changes)
        pass

    def update_models_explicit_changes(self):
        (self.models_added, self.models_removed, self.models_modified) = self.find_explicit_changes('model')
        (self.models.added, self.models.removed, self.models.modified) = \
            [len(x) for x in [self.models_added, self.models_removed, self.models_modified]]

    def update_metrics_explicit_changes(self):
        (self.metrics_added, self.metrics_removed, self.metrics_modified) = self.find_explicit_changes('metric')
        (self.metrics.added, self.metrics.removed, self.metrics.modified) = \
            [len(x) for x in [self.metrics_added, self.metrics_removed, self.metrics_modified]]

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

        modified = list(set(modified).intersection(resource_in_both))
        added = list(set(target_resources) - set(base_resources))
        removed = list(set(base_resources) - set(target_resources))

        return added, removed, modified

    def update_models_implicit_changes(self):
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
                    if ref_id:
                        diffs.append(ref_id)
                    else:
                        resolved_id = self.resolve_unique_id(table_name, "model")
                        assert resolved_id is not None
                        diffs.append(resolved_id)
            else:
                if self.has_changed(b, t):
                    if ref_id:
                        diffs.append(ref_id)
                    else:
                        resolved_id = self.resolve_unique_id(table_name, "model")
                        assert resolved_id is not None
                        diffs.append(resolved_id)

        self.models_implicit_changes = list(
            set(diffs) - set(self.models_added) - set(self.models_removed) - set(self.models_modified))

    def update_metrics_implicit_changes(self):
        # exclude added and removed
        metrics_b = {x.get("name"): x for x in self.base.get("metrics", {})}
        metrics_t = {x.get("name"): x for x in self.target.get("metrics", {})}

        diffs = []
        for x in set(list(metrics_b.keys()) + list(metrics_t.keys())):
            if x in metrics_b and x in metrics_t:
                if metrics_b.get(x) != metrics_t.get(x):
                    ref_id = metrics_t.get(x).get("ref_id")
                    if ref_id:
                        diffs.append(ref_id)
                    else:
                        # resolve the unique id for the legacy report
                        metric_name = metrics_t.get(x).get("headers")[-1]
                        ref_id = self.resolve_unique_id(metric_name, "metric")
                        assert ref_id is not None
                        diffs.append(ref_id)

        implicit = list(set(diffs))
        self.metrics_implicit_changes = list(
            set(implicit) - set(self.metrics_added) - set(self.metrics_removed) - set(self.metrics_modified))

    def has_changed(self, p1: Dict, p2: Dict):
        """
        p1 and p2 are table profiled data
        """

        from piperider_cli.reports import ColumnChangeView

        base_cols: Dict[str, Dict] = p1.get("columns")
        target_cols: Dict[str, Dict] = p2.get("columns")

        for k in base_cols:
            if ColumnChangeView(base_cols.get(k)) != ColumnChangeView(
                    target_cols.get(k)
            ):
                return True

        return False

    def resolve_unique_id(self, resource_name: str, resource_type: str):
        for entry in self.base_resources + self.target_resources:
            if entry.get("resource_type") == resource_type and entry.get("name") == resource_name:
                return entry.get("unique_id")

    def generate_markdown(self):
        # ref: https://gist.github.com/popcornylu/7a9f68c1ea80f09ba9c780d2026ce71e

        # TODO generate summary table
        # TODO generate models list
        # TODO generate metrics list
        # TODO generate test overview

        pass


class ChangeSet:
    def __init__(self, base: Dict, target: Dict):
        self.base: Dict = base
        self.target: Dict = target
        self.base_manifest: Manifest = self._m(base)
        self.target_manifest: Manifest = self._m(target)

        # resources in this format [{unique_id, name, resource_type}]
        self.base_resources = list_resources_unique_id_from_manifest(self.base_manifest)
        self.target_resources = list_resources_unique_id_from_manifest(
            self.target_manifest
        )

        self.explicit_changes = sorted(self._do_list_explicit_changes())

    def _m(self, run: Dict):
        manifest = run.get("dbt", {}).get("manifest", {})
        if manifest == {}:
            raise ValueError("Cannot find .dbt.manifest in run data")
        return load_manifest(manifest)

    def resolve_unique_id(self, resource_name: str, resource_type: str):
        for entry in self.base_resources + self.target_resources:
            if entry.get("resource_type") == resource_type and entry.get("name") == resource_name:
                return entry.get("unique_id")

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

        return output

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
                        diffs.append(ref_id)
                    else:
                        # resolve the unique id for the legacy report
                        metric_name = metrics_t.get(x).get("headers")[-1]
                        ref_id = self.resolve_unique_id(metric_name, "metric")
                        assert ref_id is not None
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
                    if ref_id:
                        diffs.append(ref_id)
                    else:
                        resolved_id = self.resolve_unique_id(table_name, "model")
                        assert resolved_id is not None
                        diffs.append(resolved_id)

        return diffs

    def list_implicit_changes(self):
        table_implicit = self._table_implicit_changes()
        metric_implicit = self._metrics_implicit_changes()
        filtered_explicit = sorted(
            list(set(table_implicit + metric_implicit) - set(self.explicit_changes))
        )
        return filtered_explicit

    def has_changed(self, p1: Dict, p2: Dict):
        """
        p1 and p2 are table profiled data
        """

        from piperider_cli.reports import ColumnChangeView

        base_cols: Dict[str, Dict] = p1.get("columns")
        target_cols: Dict[str, Dict] = p2.get("columns")

        for k in base_cols:
            if ColumnChangeView(base_cols.get(k)) != ColumnChangeView(
                    target_cols.get(k)
            ):
                return True

        return False
