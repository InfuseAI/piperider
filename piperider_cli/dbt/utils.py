import math

from typing import Dict, Iterable, List


class ChangedColumnsTableEntryElement:
    def __init__(self, column_name: str, base_column_data: Dict, target_column_data: Dict):
        self.column_name = column_name
        self.base_column_data = base_column_data
        self.target_column_data = target_column_data

        self.base_view = ColumnChangeView(self.base_column_data)
        self.target_view = ColumnChangeView(self.target_column_data)
        self.changed = self.base_view != self.target_view


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

        if self.data.get("distincts") != other.data.get("distincts"):
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

    def columns_changed_iterator(self, table_name: str) -> Iterable[ChangedColumnsTableEntryElement]:
        all_column_keys, b, t = self._create_columns_and_their_metrics(table_name)

        for column_name in all_column_keys:
            elem = ChangedColumnsTableEntryElement(column_name, b.get(column_name), t.get(column_name))
            if not elem.changed:
                continue
            yield elem

    def _create_columns_and_their_metrics(self, table_name):
        table = self._joined_tables[table_name]
        b = table.get("base", {}).get("columns", {})
        t = table.get("target", {}).get("columns", {})
        all_column_keys = sorted(set(list(b.keys()) + list(t.keys())))
        return all_column_keys, b, t

    def row_counts(self, table_name):
        table = self._joined_tables[table_name]
        b = table.get("base", {}).get("row_count", math.nan)
        t = table.get("target", {}).get("row_count", math.nan)
        return b, t

    def column_counts(self, table_name):
        table = self._joined_tables[table_name]
        b = table.get("base", {}).get("col_count")
        t = table.get("target", {}).get("col_count")
        return b, t

    def table_data_iterator(self):
        for table_name in self._joined_tables.keys():
            table_data = self._joined_tables[table_name]
            fallback = table_data.get('target') if table_data.get('target') else table_data.get('base')
            if fallback:
                yield table_name, fallback.get('ref_id'), table_data.get('base'), table_data.get('target')
