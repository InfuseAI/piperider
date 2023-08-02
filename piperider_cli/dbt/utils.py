import math
from dataclasses import dataclass
from enum import Enum

from typing import Callable, Dict, Iterable, List, Optional


class ColumnChangeEntry:
    def __init__(self, column_name: str, base_column_data: Dict, target_column_data: Dict):
        self.column_name = column_name
        self.base_view = ColumnChangeView(base_column_data)
        self.target_view = ColumnChangeView(target_column_data)

    @property
    def changed(self) -> bool:
        return self.base_view != self.target_view


class ColumnChangeView:
    def __init__(self, data: Dict):
        self.data = data

    def __eq__(self, other: "ColumnChangeView"):
        if self.data is None:
            return False
        if other.data is None:
            return False

        # Edited -> types, duplicate, missing(nulls)
        if self.data.get("type") != other.data.get("type"):
            return False

        if self.data.get("duplicates") != other.data.get("duplicates"):
            return False

        if self.data.get("nulls") != other.data.get("nulls"):
            return False

        if self.data.get("distinct") != other.data.get("distinct"):
            return False

        return True


class JoinedTables:
    def __init__(self, base_run: Dict, target_run: Dict):
        self._joined_tables = self._join(base_run.get('tables'), target_run.get('tables'))

    def _merge_keys(self, base: List[str], target: List[str]):
        """
        Merge keys from base, target tables. Unlike default union, it preserves the order for column rename, added, removed.

        :param base: keys for base table
        :param target: keys for base table
        :return: merged keys
        """

        result = []
        while base and target:
            if base[0] == target[0]:
                result.append(base[0])
                base.pop(0)
                target.pop(0)
            elif base[0] in target:
                idx = target.index(base[0])
                for i in target[0:idx]:
                    if i not in result:
                        result.append(i)
                result.append(base[0])
                base.pop(0)
                target = target[idx + 1:]
            else:
                result.append(base[0])
                base.pop(0)

        for c in base:
            if c not in result:
                result.append(c)

        for c in target:
            if c not in result:
                result.append(c)

        return result

    def _join(self, base, target):
        """
        Join base and target to a dict which

        keys = (base keys) +  (target keys)
        result[keys] = {base: {...}, target: {...}

        :param base:
        :param target:
        :return:
        """
        if not base:
            base = dict()
        if not target:
            target = dict()

        keys = self._merge_keys(list(base.keys()), list(target.keys()))
        result = dict()
        for key in keys:
            value = dict()
            value["base"] = base.get(key, {})
            value["target"] = target.get(key, {})
            result[key] = value
        return result

    def columns_changed_iterator(self, ref_id: str) -> Iterable[ColumnChangeEntry]:
        all_column_keys, b, t = self._create_columns_and_their_metrics(ref_id)

        for column_name in all_column_keys:
            elem = ColumnChangeEntry(column_name, b.get(column_name), t.get(column_name))
            if not elem.changed:
                continue
            yield elem

    def _create_columns_and_their_metrics(self, ref_id):
        table = self.by_ref_id(ref_id)
        if table is None:
            return [], None, None
        b = table.get("base", {}).get("columns", {})
        t = table.get("target", {}).get("columns", {})
        all_column_keys = sorted(set(list(b.keys()) + list(t.keys())))
        return all_column_keys, b, t

    def row_counts(self, ref_id: str):
        table = self.by_ref_id(ref_id)
        if table is None:
            return math.nan, math.nan
        b = table.get("base", {}).get("row_count", math.nan)
        t = table.get("target", {}).get("row_count", math.nan)
        return b, t

    def by_ref_id(self, ref_id: str):
        if ref_id in self._joined_tables:
            return self._joined_tables.get(ref_id)
        table_name = ref_id.split('.')[-1]
        return self._joined_tables.get(table_name)

    def column_counts(self, ref_id: str):
        table = self.by_ref_id(ref_id)
        if table is None:
            return None, None
        b = table.get("base", {}).get("col_count")
        t = table.get("target", {}).get("col_count")
        return b, t

    def table_data_iterator(self):
        for table_name in self._joined_tables.keys():
            table_data = self._joined_tables.get(table_name)
            fallback = table_data.get('target') if table_data.get('target') else table_data.get('base')
            if fallback:
                yield table_name, fallback.get('ref_id'), table_data.get('base'), table_data.get('target')


class ChangeType(Enum):
    ADDED = "added"
    REMOVED = "removed"
    MODIFIED = "modified"
    IMPLICIT = "implicit"
    IGNORED = "ignored"

    @property
    def icon_url(self) -> str:
        base_url = "https://raw.githubusercontent.com/InfuseAI/piperider/main/images/icons"

        if self.value == 'added':
            return base_url + "/icon-diff-delta-plus%402x.png"
        if self.value == 'removed':
            return base_url + "/icon-diff-delta-minus%402x.png"
        if self.value == 'modified':
            return base_url + "/icon-diff-delta-explicit%402x.png"
        if self.value == 'implicit':
            return base_url + "/icon-diff-delta-implicit%402x.png"
        return ""

    @property
    def icon_image_tag(self) -> str:
        url = self.icon_url
        if url == "":
            return ""
        return f"""<img src="{url}" width="16px">"""

    def display_changes(self, b, t, format_text: str, *, converter: Callable = None, negative_change: bool = False):
        if self != self.MODIFIED:
            raise ValueError("Only modified type has display for changes")

        if b is None or t is None:
            if t is None:
                return str(b)
            else:
                return str(t)

        if negative_change:
            color = "red" if t > b else "green"
        else:
            color = "orange" if t > b else "orange"
        sign = "↑" if t > b else "↓"
        diff = t - b
        if math.isnan(diff):
            if math.isnan(t):
                return str(b)
            else:
                return str(t)

        if t == b:
            return str(b)

        if converter:
            return format_text % dict(value=converter(t), color=color, sign=sign, diff=diff)
        return format_text % dict(value=t, color=color, sign=sign, diff=diff)


class ResourceType(Enum):
    MODEL = "model"
    METRIC = "metric"
    SEED = "seed"

    @classmethod
    def of(cls, resource_type: str):
        if resource_type == cls.MODEL.value:
            return cls.MODEL
        if resource_type == cls.METRIC.value:
            return cls.METRIC
        if resource_type == cls.SEED.value:
            return cls.SEED
        raise NotImplementedError(f"no such type: {resource_type}")


@dataclass
class ChangeUnit:
    change_type: ChangeType
    resource_type: ResourceType
    unique_id: str

    @property
    def table_name(self) -> str:
        if self.resource_type == ResourceType.MODEL:
            return self.unique_id.split(".")[-1]
        raise ValueError("It is non sense to get table_name for a non-model resource")


class MetricsChangeView:
    def __init__(self, name: str):
        self.name = name
        self.metric_group: str = None
        self.base_data: Optional[List] = None
        self.target_data: Optional[List] = None
        self.change_type = None

    def update_status(self):
        # added, removed, edited, no changes
        if self.base_data is None and self.target_data is not None:
            self.change_type = "added"
            return

        if self.base_data is not None and self.target_data is None:
            self.change_type = "removed"
            return

        if self.base_data == self.target_data:
            self.change_type = "no-changes"
        else:
            self.change_type = "edited"
