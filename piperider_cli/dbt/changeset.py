import math
from typing import Dict

from dbt.contracts.graph.manifest import Manifest

from piperider_cli.dbt.list_task import (
    list_changes_in_unique_id,
    list_resources_unique_id_from_manifest,
    load_manifest,
)


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
            if (
                entry.get("resource_type") == resource_type
                and entry.get("name") == resource_name
            ):
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
