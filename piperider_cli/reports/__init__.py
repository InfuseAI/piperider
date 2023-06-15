import abc
import collections
import math
import urllib.parse
from dataclasses import dataclass
from datetime import datetime, timedelta
from functools import cmp_to_key, total_ordering
from typing import Dict, Iterable, List, Optional, Tuple

from dbt.contracts.graph.manifest import WritableManifest
from enum import Enum

from piperider_cli import is_executed_manually


@total_ordering
class CapControlLevel(Enum):
    NONE = 0
    LOW = 1
    HIGH = 2
    EXTREME = 3

    # __eq__ is provided by Enum

    def __lt__(self, other):
        if self.__class__ is other.__class__:
            return self.value < other.value
        return NotImplemented


@dataclass
class CapControl:
    """A singleton dataclass."""

    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super().__new__(cls, *args, **kwargs)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.max_summary_report_length = 65535
        self.cap_control_level = CapControlLevel.NONE


def embed_url_cli(url: str, unique_id: str, resource_type: str, table_name: str, column_name: str = None):
    if column_name is None:
        # table
        return table_name
    else:
        # column
        return column_name


def embed_url_cloud(url: str, unique_id: str, resource_type: str, table_name: str, column_name: str = None):
    if column_name is None:
        # table
        return f'<a href="{url}#/{resource_type}s/{urllib.parse.quote(unique_id)}">{table_name}</a>'
    else:
        # column
        return f'<a href="{url}#/{resource_type}s/{urllib.parse.quote(unique_id)}/columns/{urllib.parse.quote(column_name)}">{column_name}</a>'


embed_url = None
try:
    from web import patch_sys_path_for_piperider_cli

    patch_sys_path_for_piperider_cli()
    from piperider_cli.dbt.list_task import load_manifest, compare_models_between_manifests

    embed_url = embed_url_cloud
except ImportError:
    from piperider_cli.dbt.list_task import load_manifest, compare_models_between_manifests

    embed_url = embed_url_cli


class DataChangeState(Enum):
    ADDED = "added"
    REMOVED = "removed"
    NO_CHANGES = "no changes"
    EDITED = "edited"
    UNKNOWN = "unknown"

    def to_path_state(self):
        return self.value.capitalize()


iconBaseUrl = 'https://raw.githubusercontent.com/InfuseAI/piperider/main/images/icons'


class ModelType(Enum):
    EXPLICT_CHANGED_MODELS = "Explicit Changed Models"
    IMPLICIT_CHANGED_MODELS = "Implicit Changed Models"


def change_rate(base: int, target: int):
    if isinstance(base, str) or isinstance(target, str):
        return math.nan
    if base is not None and target is not None:
        if base == 0:
            return math.inf
        else:
            return (target - base) / base
    return math.nan


class Styles:

    @staticmethod
    def latex_orange(text):
        if text is None:
            return ""
        if isinstance(text, str) and '%' in text:
            text = text.replace('%', '\%')
        return r'$\color{orange}{\text{ %s }}$' % str(text)

    @staticmethod
    def all_columns_highlight(text):
        return f"⚠️ <b>{text}</b>"

    @staticmethod
    def latex_grey(text):
        # if text is None:
        #     return ""
        # if isinstance(text, str) and '%' in text:
        #     text = text.replace('%', '\%')
        # return r'$\color{grey}{\text{ %s }}$' % str(text)
        # return f"<code>{text}</code>"
        return f"{text}"

    @staticmethod
    def latex_black(text):
        if text is None:
            return ""
        if isinstance(text, str) and '%' in text:
            text = text.replace('%', '\%')
        return r'$\color{black}{\text{ %s }}$' % str(text)

    @staticmethod
    def html_bold(text):
        if text is None:
            return ""
        return "<b>" + str(text) + "</b>"

    @staticmethod
    def html_grey(text):
        return text


class Image:
    class ModelOverView:
        # materialization
        table = f"""<img src="{iconBaseUrl}/model-icon-table%402x.png" width="27px">"""
        view = f"""<img src="{iconBaseUrl}/model-icon-view%402x.png" width="27px">"""
        incremental = f"""<img src="{iconBaseUrl}/model-icon-incremental%402x.png" width="27px">"""
        ephemeral = f"""<img src="{iconBaseUrl}/model-icon-ephemeral%402x.png" width="27px">"""

        # diff-type
        explicit = f"""<img src="{iconBaseUrl}/icon-diff-delta-explicit%402x.png" width="27px">"""
        implicit = f"""<img src="{iconBaseUrl}/icon-diff-delta-implicit%402x.png" width="27px">"""

        # change icons
        triangle = f"""<img src="{iconBaseUrl}/icon-triangle-yellow%402x.png" width="18px">"""
        checked = f"""<img src="{iconBaseUrl}/icon-bs-check2-gray%402x.png" width="18px">"""

        @classmethod
        def materialization(cls, materialization_type: str):
            try:
                return getattr(cls, materialization_type)
            except Exception:
                return ""

        @classmethod
        def diff_icon(cls, model_type: ModelType):
            if model_type == ModelType.EXPLICT_CHANGED_MODELS:
                return cls.explicit
            if model_type == ModelType.IMPLICIT_CHANGED_MODELS:
                return cls.implicit
            return ""

        @classmethod
        def change_of_total_rows_or_execution_time(cls, b: int, t: int):
            if abs(change_rate(b, t)) > 0.05:
                return cls.triangle
            return ""

        @classmethod
        def change_of_total_columns(cls, b: int, t: int):
            if b != t:
                return cls.triangle
            return cls.checked

    class ModelOverviewStat:
        hover_diff_plus = f"""<img src="{iconBaseUrl}/icon-diff-delta-plus%402x.png" width="10px">"""
        hover_diff_minus = f"""<img src="{iconBaseUrl}/icon-diff-delta-minus%402x.png" width="10px">"""
        hover_diff_explicit = f"""<img src="{iconBaseUrl}/icon-diff-delta-explicit%402x.png" width="10px">"""

    class ColumnChangeView:
        column_change_diff_plus = f"""<img src="{iconBaseUrl}/icon-diff-delta-plus%402x.png" width="18px">"""
        column_change_diff_minus = f"""<img src="{iconBaseUrl}/icon-diff-delta-minus%402x.png" width="18px">"""
        column_change_diff_explicit = f"""<img src="{iconBaseUrl}/icon-diff-delta-explicit%402x.png" width="18px">"""

    class DbtMetric:
        triangle_icon = f"""<img src="{iconBaseUrl}/icon-triangle-yellow%402x.png" width="18px">"""
        shield_icon = f"""<img src="{iconBaseUrl}/icon-bs-shield%402x.png" width="18px">"""
        cross_shield_icon = f"""<img src="{iconBaseUrl}/icon-bs-shield-cross-yellow%402x.png" width="18px">"""
        implicit_icon = f"""<img src="{iconBaseUrl}/icon-diff-delta-implicit%402x.png" width="18px">"""


#
def model_selectors_to_table_names(selector_list: List[str]) -> Iterable[str]:
    # selector from dbt will like xxx.yyy.zzz
    # we only care the last part: zzz
    for x in selector_list:
        yield x.split(".")[-1]


def _build_list(elements: List["_Element"], line_sep="\n\n"):
    result = line_sep.join([x.build() for x in elements])
    return f"{result}\n"


class _Element(metaclass=abc.ABCMeta):
    def __init__(self, root: "_Element"):
        self.root = root

    @abc.abstractmethod
    def build(self):
        ...

    def add_indent(self, text, indent=4):
        lines = text.split("\n")
        indented_lines = [f'{" " * indent}{line.strip()}' for line in lines]
        indented_text = "\n".join(indented_lines)
        return indented_text

    def find_target_node(self, model_selector: str):
        return self._find_node("target_manifest", model_selector)

    def find_base_node(self, model_selector: str):
        return self._find_node("base_manifest", model_selector)

    def _find_node(self, by_manifest: str, model_selector: str):
        node = self
        while True:
            if hasattr(node, by_manifest):
                selected = model_selector.split(".")
                m: WritableManifest = getattr(node, by_manifest)
                for n in m.nodes.values():
                    if n.fqn == selected:
                        return n
            node = node.root
            if node is None:
                break

    def find_table_name(self, model_selector: str):
        # TODO do we need find it at base_manifest, too?
        return self.find_target_node(model_selector).name

    def _get_field(self, name: str):
        node = self
        while True:
            if hasattr(node, name):
                return getattr(node, name)
            node = node.root
            if node is None:
                break

    def get_target_manifest(self):
        return self._get_field("target_manifest")

    def get_base_manifest(self):
        return self._get_field("base_manifest")

    def get_base_run_results(self):
        return self._get_field("base_run_results")

    def get_target_run_results(self):
        return self._get_field("target_run_results")

    def joined_tables(self) -> "JoinedTables":
        return self._get_field("_joined_tables")

    def get_model_type(self):
        return self._get_field("model_type")

    def get_model_selector(self):
        return self._get_field("model_selector")

    def get_url(self):
        return self._get_field("url")


@dataclass
class ChangeStatus:
    change_type: str
    base_view: "ColumnChangeView"
    target_view: "ColumnChangeView"
    state: DataChangeState
    icon: str

    def is_added_or_removed(self):
        return self.change_type in ["Added.", "Removed."]

    def display(self):
        if self.target_view is not None and self.target_view.data is not None:
            return self.target_view
        return self.base_view

    def name(self):
        return self.display().data.get('name')

    @classmethod
    def count_added(cls, views: List["ChangeStatus"]):
        return len([x for x in views if x.change_type == "Added."])

    @classmethod
    def count_removed(cls, views: List["ChangeStatus"]):
        return len([x for x in views if x.change_type == "Removed."])

    @classmethod
    def count_edited(cls, views: List["ChangeStatus"]):
        return len([x for x in views if x.change_type == "Edited."])

    @staticmethod
    def _sort_func(m1: "ChangeStatus", m2: "ChangeStatus"):
        change_state_order = [
            DataChangeState.EDITED,
            DataChangeState.REMOVED,
            DataChangeState.ADDED,
            DataChangeState.NO_CHANGES,
            DataChangeState.UNKNOWN,
        ]
        if m1.state == m2.state:
            return (m1.name() > m2.name()) - (
                    m1.name() < m2.name())
        else:
            return (
                    change_state_order.index(m1.state) - change_state_order.index(m2.state)
            )

    @classmethod
    def sorted(cls, change_status_list: List["ChangeStatus"]):
        return sorted(change_status_list, key=cmp_to_key(cls._sort_func))


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

        return True

    @property
    def duplicates_p(self):
        if not self.data:
            return "-"
        if self.data.get("duplicates_p") is None:
            return "-"
        return f"{self.data.get('duplicates_p'):.1%}"

    @property
    def duplicates(self):
        if not self.data:
            return None
        return self.data.get("duplicates")

    @property
    def nulls_p(self):
        if not self.data:
            return "-"
        if self.data.get("nulls_p") is None:
            return "-"

        return f"{self.data.get('nulls_p'):.1%}"

    @property
    def nulls(self):
        if not self.data:
            return None
        return self.data.get("nulls")

    def get_type(self, compared_type: str = None):
        if self.data is None:
            return None
        if compared_type is not None:
            if self.data.get("type") != compared_type:
                return f"{self.data.get('type')} <kbd>changed</kbd>"
            return self.data.get("type")
        return self.data.get("type")

    def explain(self, target_view: "ColumnChangeView"):
        # assume self is base_view, another is target_view
        # put change reason in this order:
        # type, duplicate, missing, invalid
        reasons = []
        if self.get_type() != target_view.get_type():
            reasons.append("Type Changed.")

        def add_reason_for(metric_name: str, display_label: str):
            percentage = f"{metric_name}_p"
            metric_base_value = self.data.get(metric_name, math.nan)
            metric_target_value = target_view.data.get(metric_name, math.nan)
            if metric_base_value is math.nan:
                if 'base is not profiled' not in reasons:
                    reasons.append('base is not profiled')
                return
            if metric_target_value is math.nan:
                if 'target is not profiled' not in reasons:
                    reasons.append('target is not profiled')
                return

            if metric_base_value != metric_target_value:
                metric_base_p = self.data.get(percentage, math.nan)
                metric_target_p = target_view.data.get(percentage, math.nan)

                delta = change_rate(metric_base_p, metric_target_p)
                if delta is math.inf:
                    delta = "↑∞"
                elif delta > 0:
                    delta = f"↑{delta:.1%}"
                elif delta < 0:
                    delta = f"↓{abs(delta):.1%}"
                elif delta is math.nan:
                    delta = "nan"
                else:
                    delta = ""

                title = f"B: {metric_base_value}, T: {metric_target_value}&#10;B: {metric_base_p :.1%}, T: {metric_target_p :.1%}"
                annotation = f"({delta})"
                annotation = (
                        r'<span title="%s">%s</span>'
                        % (title, Styles.latex_orange(annotation))
                )
                reasons.append(
                    f"{metric_target_p :.1%} {display_label} {annotation}."
                )

        add_reason_for("duplicates", "Duplicates")
        add_reason_for("nulls", "Missing")

        return " ".join(reasons)

    @classmethod
    def create_change_status(
            cls, base_view: "ColumnChangeView", target_view: "ColumnChangeView"
    ) -> ChangeStatus:
        if base_view.data is None and target_view.data is not None:
            return ChangeStatus(
                change_type="Added.",
                base_view=base_view,
                target_view=target_view,
                icon=Image.ColumnChangeView.column_change_diff_plus,
                state=DataChangeState.ADDED
            )
        if base_view.data is not None and target_view.data is None:
            return ChangeStatus(
                change_type="Removed.",
                base_view=base_view,
                target_view=target_view,
                icon=Image.ColumnChangeView.column_change_diff_minus,
                state=DataChangeState.REMOVED
            )
        if base_view == target_view:
            return ChangeStatus(
                change_type="No changes.",
                base_view=base_view,
                target_view=target_view,
                icon="",
                state=DataChangeState.NO_CHANGES
            )
        else:
            return ChangeStatus(
                change_type="Edited.",
                base_view=base_view,
                target_view=target_view,
                icon=Image.ColumnChangeView.column_change_diff_explicit,
                state=DataChangeState.EDITED
            )


class ChangedColumnsTableEntryElement(_Element):
    def __init__(
            self, root: _Element, column_name: str, base_column_data: Dict, target_column_data: Dict
    ):
        super().__init__(root)
        self.column_name = column_name
        self.base_column_data = base_column_data
        self.target_column_data = target_column_data

        self.base_view = ColumnChangeView(self.base_column_data)
        self.target_view = ColumnChangeView(self.target_column_data)
        self.changed = self.base_view != self.target_view
        self.change_status = ColumnChangeView.create_change_status(
            self.base_view, self.target_view
        )

    @staticmethod
    def _sort_func(m1: "ChangedColumnsTableEntryElement", m2: "ChangedColumnsTableEntryElement"):
        change_state_order = [
            DataChangeState.EDITED,
            DataChangeState.REMOVED,
            DataChangeState.ADDED,
            DataChangeState.NO_CHANGES,
            DataChangeState.UNKNOWN,
        ]
        if m1.change_status.state == m2.change_status.state:
            return (m1.change_status.name() > m2.change_status.name()) - (
                    m1.change_status.name() < m2.change_status.name())
        else:
            return (
                    change_state_order.index(m1.change_status.state) - change_state_order.index(m2.change_status.state)
            )

    @classmethod
    def sorted(cls, elements: List["ChangedColumnsTableEntryElement"]):
        return sorted(elements, key=cmp_to_key(cls._sort_func))

    def build(self):
        # Check added or removed
        # added -> base is null and target is not null
        # removed -> base is not null and target is null
        # Edited -> types, duplicate, missing(nulls)
        change_status = self.change_status
        m = self.find_target_node(self.get_model_selector())

        if CapControl().cap_control_level >= CapControlLevel.HIGH:
            result = f"""
                * {embed_url(self.get_url(), m.unique_id, m.resource_type, m.name, self.column_name)}
            """
            return self.add_indent(result, 8)

        if change_status.is_added_or_removed():

            display_type = change_status.target_view.get_type()
            if display_type is None:
                display_type = change_status.base_view.get_type()

            result = f"""
                <tr>
                <td>{change_status.icon}</td>
                <td>{embed_url(self.get_url(), m.unique_id, m.resource_type, m.name, self.column_name)}</td>
                <td>{Styles.latex_grey(display_type)}</td>
                <td>{Styles.latex_grey(display_type)}</td>
                <td>{change_status.change_type}</td>
                </tr>
                """
            return self.add_indent(result, 8)

        if not self.changed:
            return ""

        base_type = self.base_view.get_type()
        target_type = self.target_view.get_type(self.base_view.get_type())
        if base_type == target_type:
            base_type = Styles.latex_grey(base_type)
            target_type = Styles.latex_grey(target_type)
        else:
            base_type = Styles.latex_black(base_type)
            target_type = Styles.latex_black(target_type)

        result = f"""
            <tr>
            <td>{Image.ColumnChangeView.column_change_diff_explicit}</td>
            <td>{embed_url(self.get_url(), m.unique_id, m.resource_type, m.name, self.column_name)}</td>
            <td>{base_type}</td>
            <td>{target_type}</td>
            <td>{self.base_view.explain(self.target_view)}</td>
            </tr>
            """

        return self.add_indent(result, 8)


class TotalColumnsTableEntryElement(_Element):
    def __init__(
            self, root: _Element, column_name: str, base_column_data: Dict, target_column_data: Dict
    ):
        super().__init__(root)
        self.column_name = column_name
        self.base_column_data = base_column_data
        self.target_column_data = target_column_data

        self.base_view = ColumnChangeView(self.base_column_data)
        self.target_view = ColumnChangeView(self.target_column_data)

    def build(self):
        target_type = self.target_view.get_type()
        if target_type is None:
            target_type = f"{self.base_view.get_type()}"
        # TODO check schema type change

        change_status = self.create_change_status()
        m = self.find_target_node(self.get_model_selector())

        if CapControl().cap_control_level >= CapControlLevel.LOW:
            result = f"""
                * {embed_url(self.get_url(), m.unique_id, m.resource_type, m.name, self.column_name)}
            """
            return self.add_indent(result, 8)

        def to_title_str(base_value, base_rate, target_value, target_rate):
            if base_value is None:
                title = [f"T: {target_value}",
                         f"T: {target_rate}"]
                return "&#10;".join(title)
            if target_value is None:
                title = [f"B: {base_value}",
                         f"B: {base_rate}"]
                return "&#10;".join(title)

            diff_value = abs(target_value - base_value)
            rate = abs(change_rate(base_value, target_value))
            if math.inf == rate:
                rate = "∞"

            diff_sign = "↑" if target_value > base_value else "↓"
            title = [f"B: {base_value} ••• T: {target_value} ({diff_sign}{diff_value})",
                     f"B: {base_rate} ••• T: {target_rate} ({diff_sign}{rate})"]
            return "&#10;".join(title)

        def td2(prop: str):
            v1 = getattr(self.base_view, f"{prop}_p")
            v2 = getattr(self.target_view, f"{prop}_p")

            if v1 == v2:
                return f"""
                <td>{Styles.latex_grey(v1)}</td>
                <td>{Styles.latex_grey(v2)}</td>
                """

            v1v = getattr(self.base_view, f"{prop}")
            v2v = getattr(self.target_view, f"{prop}")
            hover = '<span title="%s">%s</span>' % (to_title_str(v1v, v1, v2v, v2), Styles.all_columns_highlight(v2))

            return f"""
            <td>{Styles.latex_grey(v1)}</td>
            <td>{hover}</td>
            """

        result = f"""
        <tr>
        <td>{change_status.icon}</td>
        <td>{embed_url(self.get_url(), m.unique_id, m.resource_type, m.name, self.column_name)}</td>
        <td>{Styles.latex_grey(target_type)}</td>
        {td2("duplicates")}
        {td2("nulls")}
        </tr>
        """
        return self.add_indent(result, 8)

    def create_change_status(self):
        change_status = ColumnChangeView.create_change_status(
            self.base_view, self.target_view
        )
        return change_status


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

    def is_profiled(self):
        for x in self._joined_tables.values():
            if x.get('base', {}).get('row_count') is not None:
                return True
        return False

    def columns_changed_iterator(
            self, root: _Element, table_name: str
    ) -> Iterable[ChangedColumnsTableEntryElement]:
        all_column_keys, b, t = self._create_columns_and_their_metrics(table_name)

        for column_name in all_column_keys:
            elem = ChangedColumnsTableEntryElement(
                root, column_name, b.get(column_name), t.get(column_name)
            )
            if not elem.changed:
                continue
            yield elem

    def all_columns_iterator(
            self, root: _Element, table_name
    ) -> Iterable[TotalColumnsTableEntryElement]:
        all_column_keys, b, t = self._create_columns_and_their_metrics(table_name)

        for column_name in all_column_keys:
            yield TotalColumnsTableEntryElement(
                root, column_name, b.get(column_name), t.get(column_name)
            )

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


class ChangedColumnsTableElement(_Element):
    def __init__(self, root: _Element, model_selector: str):
        super().__init__(root)
        self.column_changes = 0
        self.model_selector = model_selector

    def build(self):
        name = self.find_table_name(self.model_selector)
        t = self.joined_tables()
        children = ChangedColumnsTableEntryElement.sorted(list(t.columns_changed_iterator(self, name)))
        self.column_changes = len(children)

        if CapControl().cap_control_level >= CapControlLevel.HIGH:
            return f"""
            {_build_list(children)}
            """

        orange_changes = Styles.latex_orange('↑ changes')

        return f"""
        <table>
        <thead><tr><th title="Field #1">&nbsp;&nbsp;&nbsp;&nbsp;</th>
        <th title="Field #2">Column</th>
        <th title="Field #3">Base Type</th>
        <th title="Field #4">Target Type</th>
        <th title="Field #5">Change</th>
        </tr></thead>
        <tbody>

        {_build_list(children)}

        </tbody></table>

        <i>Hover over <span href="#hover-for-info" title="On hover, change show additional values (like base and target counts and percentages)."> {orange_changes} </span> for more information.</i>
        """


class TotalColumnsTableElement(_Element):
    def __init__(self, root: _Element, model_selector: str):
        super().__init__(root)
        self.model_selector = model_selector
        self.columns = 0

    def build(self):
        name = self.find_table_name(self.model_selector)
        t = self.joined_tables()
        children = list(t.all_columns_iterator(self, name))
        self.columns = len(children)

        if CapControl().cap_control_level >= CapControlLevel.LOW:
            return f"""
            {_build_list(children)}
            """

        return f"""
        <table>
        <thead>
        <tr><th title="Field #1" rowspan='2'>&nbsp;&nbsp;&nbsp;&nbsp;</th>
        <th title="Field #2" rowspan='2'>Column</th>
        <th title="Field #3" rowspan='2'>Target Type</th>
        <th title="Field #6" colspan='2'>Duplicate</th>
        <th title="Field #10" colspan='2'>Missing</th>
        </tr>
        <tr>
        <td>Base</td>
        <td>Target</td>
        <td>Base</td>
        <td>Target</td>
        </tr>
        </thead>
        <tbody>
        {_build_list(children)}
        </tbody>
        </table>
        """


class ModelEntryColumnsChangedElement(_Element):
    def __init__(self, root: _Element, model_selector: str):
        super().__init__(root)
        self.model_selector = model_selector
        self.element = ChangedColumnsTableElement(self.root, self.model_selector)
        self.table_content = self.element.build()
        self.column_changes = self.element.column_changes

    def build(self):
        if self.column_changes == 0:
            return self.add_indent(
                f"<details><summary>{self.column_changes} Columns Changed</summary></details>"
            )

        return self.add_indent(
            f"<details><summary>{self.column_changes} Columns Changed</summary>{self.table_content}</details>"
        )


class ModelEntryColumnsInTotalElement(_Element):
    def __init__(self, root: _Element, model_selector: str):
        super().__init__(root)
        self.model_selector = model_selector

    def build(self):
        element = TotalColumnsTableElement(self.root, self.model_selector)
        content = element.build()
        columns_total = element.columns

        if CapControl().cap_control_level >= CapControlLevel.EXTREME:
            return ""

        return self.add_indent(
            f"<details><summary>{columns_total} Columns in Total</summary>{content}</details>"
        )


class ModelEntryOverviewElement(_Element):
    def __init__(self, root: _Element, model_selector: str):
        super().__init__(root)
        self.model_selector = model_selector

    def build(self):
        m = self.find_target_node(self.model_selector)
        materialized = m.config.materialized
        materialization_type = Image.ModelOverView.materialization(materialized)

        if CapControl().cap_control_level >= CapControlLevel.EXTREME:
            return self.add_indent(f"""
            <table>
                 <tr>
                     <th>{materialization_type}</th>
                     <th colspan='3' >{embed_url(self.get_url(), m.unique_id, m.resource_type, m.name)} ({materialized}) </th>
                     <th>{Image.ModelOverView.diff_icon(self.get_model_type())}</th>
                 </tr>
                 <tr>
                     <td></td>
                     <td></td>
                     <td>Base</td>
                     <td>Target</td>
                     <td></td>
                 </tr>
                 {self.build_dbt_info(m)}
                 {self.build_rows(m)}
                 {self.build_columns(m)}
            </table>
            """)

        return self.add_indent(f"""
    <table>
         <tr>
             <th>{materialization_type}</th>
             <th colspan='3' >{embed_url(self.get_url(), m.unique_id, m.resource_type, m.name)} ({materialized}) </th>
             <th>{Image.ModelOverView.diff_icon(self.get_model_type())}</th>
         </tr>
         <tr>
             <td></td>
             <td></td>
             <td>Base</td>
             <td>Target</td>
             <td></td>
         </tr>
         {self.build_dbt_info(m)}
         {self.build_rows(m)}
         {self.build_columns(m)}

         <tr>
             <td></td>
             <td rowspan='1' colspan='4' ><b>CHANGES IN VALUES</b></td>
         </tr>

        {self.build_column_stats(m)}

         </table>
             """)

    def build_dbt_info(self, m):
        def total_dbt_time(manifest, run_results: Dict):
            model_id = m.unique_id
            related_test_ids = []

            # find test ids
            for n in manifest.nodes.values():
                if n.resource_type.value != 'test':
                    continue
                if model_id in n.depends_on.nodes:
                    related_test_ids.append(n.unique_id)

            num_tests = len(related_test_ids)

            if run_results is None:
                return None, num_tests

            # get execution time -> all tests + model
            results = run_results.get('results', [])
            results = [x.get('execution_time') for x in results if
                       x.get('unique_id') in x.get('unique_id') in (related_test_ids + [model_id])]

            execution_time = sum(results)
            return execution_time, num_tests

        def to_human_readable(seconds: float):
            if seconds is None:
                return "-"
            return str(timedelta(seconds=seconds))[:-4]

        base_execution_time, base_tests = total_dbt_time(self.get_base_manifest(), self.get_base_run_results())
        target_execution_time, target_tests = total_dbt_time(self.get_target_manifest(), self.get_target_run_results())

        def tests_changes(b, t):
            if b == t:
                return str(t)

            if t > b:
                return f"{t} (↑ {t - b})"
            return f"{t} (↓ {b - t})"

        # return base_execution_time, base_tests, target_execution_time, target_tests, tests_changes, to_human_readable
        return self.add_indent(f"""
        <tr>
             <td></td>
             <td>Total dbt Time</td>
             <td>{to_human_readable(base_execution_time)}</td>
             <td>{to_human_readable(target_execution_time)}</td>
             <td>{Image.ModelOverView.change_of_total_rows_or_execution_time(base_execution_time, target_execution_time)}</td>
         </tr>
         <tr>
             <td></td>
             <td>Total Tests</td>
             <td>{base_tests}</td>
             <td>{tests_changes(base_tests, target_tests)}</td>
             <td></td>
         </tr>
        """, 8)

    def build_rows(self, m):
        base_total_rows, target_total_rows = self.joined_tables().row_counts(m.name)

        if target_total_rows == base_total_rows:
            total_rows_hover = ""
        elif target_total_rows > base_total_rows:
            row_p = f"(↑ {change_rate(base_total_rows, target_total_rows):.1%})"
            orange_row_p = Styles.latex_orange(row_p)
            total_rows_hover = f"""<span title="B: {base_total_rows} ••• T: {target_total_rows} (↑ {target_total_rows - base_total_rows}) {row_p}">{orange_row_p}</span>"""
        elif target_total_rows < base_total_rows:
            row_p = f"(↓ {change_rate(base_total_rows, target_total_rows):.1%})"
            orange_row_p = Styles.latex_orange(row_p)
            total_rows_hover = f"""<span title="B: {base_total_rows} ••• T: {target_total_rows} (↓ {base_total_rows - target_total_rows}) {row_p}">{orange_row_p}</span>"""
        else:
            total_rows_hover = ""

        if base_total_rows is math.nan:
            base_total_rows = "no profiled"
        if target_total_rows is math.nan:
            target_total_rows = "no profiled"

        return self.add_indent(f"""
        <tr>
            <td></td>
            <td>Total Rows</td>
            <td>{base_total_rows}</td>
            <td>{target_total_rows} {total_rows_hover}</td>
            <td>{Image.ModelOverView.change_of_total_rows_or_execution_time(base_total_rows, target_total_rows)}</td>
        </tr>
        """, 8)

    def build_columns(self, m):
        base_total_columns, target_total_columns = self.joined_tables().column_counts(m.name)

        column_change_views = list(self.joined_tables().all_columns_iterator(self, m.name))
        changes_status_list = [x.create_change_status() for x in column_change_views]
        value_diff_plus = ChangeStatus.count_added(changes_status_list)
        value_diff_minus = ChangeStatus.count_removed(changes_status_list)
        value_diff_explicit = ChangeStatus.count_edited(changes_status_list)

        info = ChangeStatus.sorted([x for x in changes_status_list if
                                    x.state != DataChangeState.NO_CHANGES or x.state != DataChangeState.UNKNOWN])

        title = "&#10;".join([f"{x.name()} ({x.state.value})" for x in info])

        total_columns_params = dict()
        total_columns_params['value_diff_plus'] = Styles.latex_orange('(' + str(value_diff_plus))
        total_columns_params['hover_diff_plus'] = Image.ModelOverviewStat.hover_diff_plus

        total_columns_params['value_diff_minus'] = Styles.latex_orange(value_diff_minus)
        total_columns_params['hover_diff_minus'] = Image.ModelOverviewStat.hover_diff_minus

        total_columns_params['value_diff_explicit'] = Styles.latex_orange(value_diff_explicit)
        total_columns_params['hover_diff_explicit'] = Image.ModelOverviewStat.hover_diff_explicit
        total_columns_params['end'] = Styles.latex_orange(')')

        total_columns_data = """%(value_diff_plus)s%(hover_diff_plus)s %(value_diff_minus)s%(hover_diff_minus)s %(value_diff_explicit)s%(hover_diff_explicit)s%(end)s""" % total_columns_params
        total_columns_hover = r'<span title="%s">%s</span>' % (title, total_columns_data)

        return self.add_indent(f"""
        <tr>
            <td></td>
            <td>Total Columns</td>
            <td>{base_total_columns}</td>
            <td>{target_total_columns} {total_columns_hover}</td>
            <td>{Image.ModelOverView.change_of_total_columns(base_total_columns, target_total_columns)}</td>
        </tr>
        """, 8)

    def build_column_stats(self, m):
        changed_columns = list(self.joined_tables().columns_changed_iterator(self, m.name))

        duplicate_cols = {x.column_name: (x.base_view.duplicates, x.target_view.duplicates)
                          for x in changed_columns if x.base_view.duplicates != x.target_view.duplicates}

        nulls_cols = {x.column_name: (x.base_view.nulls, x.target_view.nulls)
                      for x in changed_columns if x.base_view.nulls != x.target_view.nulls}

        def _show_change(rate):
            arrow = "↑" if rate > 0 else "↓"
            rate = abs(rate)
            if rate == math.inf:
                rate = "∞"
            else:
                rate = f"{rate / 100:.1%}"
            return f"{arrow}{rate}"

        def build_status(input_data: Dict):
            """
            input_data:
                key: column_name
                value: (base value, target value)
            """
            data = {k: v for k, v in input_data.items() if not math.isnan(change_rate(v[0], v[1]))}

            change_list = list([change_rate(b, t) for b, t in data.values()])
            description = ""
            icon = ""
            if len(change_list) == 0:
                pass
            elif len(change_list) == 1:
                description = _show_change(change_list[0])
            else:
                description = f"{_show_change(min(change_list))} to {_show_change(max(change_list))}"

            if description == "":
                icon = Image.ModelOverView.checked
            else:
                icon = Image.ModelOverView.triangle
                description = Styles.latex_orange(f"({description})")

            def _column_description(v: Tuple):
                result = "∞" if change_rate(*v) == math.inf else f"{change_rate(*v) / 100:.1%}"
                origin_value = f"B: {v[0]}, T: {v[1]}"
                return f"{result} ••• {origin_value}"

            title = ["%s = %s" % (k, _column_description(v)) for k, v in data.items()]
            title = "&#10;".join(title)
            description = '<span title="%s">%s</span>' % (title, description)

            return icon, description

        duplicate_change_icon, duplicate_description = build_status(duplicate_cols)
        missing_icon, missing_description = build_status(nulls_cols)

        return self.add_indent(f"""
        <tr>
          <td></td>
          <td>Duplicate col. values</td>
          <td rowspan="1" colspan="2">{len(duplicate_cols)} {duplicate_description}</td>
          <td>{duplicate_change_icon}</td>
        </tr>
        <tr>
          <td></td>
          <td>Missing col. values</td>
          <td rowspan="1" colspan="2">{len(nulls_cols)} {missing_description}</td>
          <td>{missing_icon}</td>
        </tr>
        """, 8)


class ModelEntryElement(_Element):
    def __init__(self, root: _Element, model_selector: str):
        super().__init__(root)
        self.model_selector = model_selector
        self.change_state: DataChangeState = DataChangeState.UNKNOWN

        # update model state
        target_node = self.find_target_node(model_selector)
        base_node = self.find_base_node(model_selector)
        self.path = target_node.original_file_path if target_node else base_node.original_file_path
        if target_node and base_node:
            # it depends on columns changed
            self.change_state = DataChangeState.UNKNOWN
        elif target_node is not None:
            self.change_state = DataChangeState.ADDED
        elif base_node is not None:
            self.change_state = DataChangeState.REMOVED

        # update profiled state
        self.profiled = self.joined_tables().is_profiled()

        self.overview_element = ModelEntryOverviewElement(self, self.model_selector)
        self.columns_changed_element = ModelEntryColumnsChangedElement(self, self.model_selector)
        self.columns_in_total_element = ModelEntryColumnsInTotalElement(self, self.model_selector)
        if self.columns_changed_element.column_changes != 0:
            self.change_state = DataChangeState.EDITED
        else:
            self.change_state = DataChangeState.NO_CHANGES

    @staticmethod
    def _sort_func(m1: "ModelEntryElement", m2: "ModelEntryElement"):
        if m1.profiled and not m2.profiled:
            return True
        elif not m1.profiled and m2.profiled:
            return False
        else:
            change_state_order = [
                DataChangeState.EDITED,
                DataChangeState.REMOVED,
                DataChangeState.ADDED,
                DataChangeState.NO_CHANGES,
                DataChangeState.UNKNOWN,
            ]
            if m1.change_state == m2.change_state:
                return m1.model_selector < m2.model_selector
            else:
                return (
                        change_state_order.index(m1.change_state) < change_state_order.index(m2.change_state)
                )

    @classmethod
    def sorted(cls, elements: List["ModelEntryElement"]):
        return sorted(elements, key=cmp_to_key(cls._sort_func))

    def build(self):
        if self.profiled:
            path_line = f"{self.path} - {self.change_state.to_path_state()} (Profiled)"
        else:
            path_line = f"{self.path} - {self.change_state.to_path_state()}"

        children = [self.overview_element, self.columns_changed_element, self.columns_in_total_element]
        return f"\n* {path_line}\n{_build_list(children)}\n"


class ModelElement(_Element):
    STATE_ADD = 0
    STATE_DEL = 1
    STATE_MOD = 2

    def __init__(self, root: _Element, model_type: ModelType, models: List[str]):
        super().__init__(root)
        self.model_type = model_type
        self.models = models

    @staticmethod
    def _get_metric_from_report(report, metric, default):
        return report.get(metric, default) if report else default

    def _get_changed_state(self, table_name, base, target):
        joined = self.join(base, target)
        table_modified = False
        for column_name in joined.keys():
            joined_column = joined[column_name]
            b = joined_column.get("base")
            t = joined_column.get("target")

            schema_type_b = self._get_metric_from_report(b, "schema_type", None)
            schema_type_t = self._get_metric_from_report(t, "schema_type", None)

            if b is None:
                table_modified = True
            elif t is None:
                table_modified = True
            elif schema_type_b != schema_type_t:
                table_modified = True

        state = None
        if base is None:
            state = self.STATE_ADD
        elif target is None:
            state = self.STATE_DEL
        elif table_modified:
            state = self.STATE_MOD

        return state

    def build(self):
        entries = ModelEntryElement.sorted([ModelEntryElement(self, x) for x in self.models])
        return f"<details><summary>{self.model_type.value}: {len(self.get_changed_tables())} of {len(self.models)}</summary>\n{_build_list(entries)}</details>"

    def get_changed_tables(self):
        changed = []
        for table_name in model_selectors_to_table_names(self.models):
            if list(self.joined_tables().columns_changed_iterator(self, table_name)):
                changed.append(table_name)
        return set(changed)


class MetricsChangeView:
    def __init__(self, name: str):
        self.name = name
        self.header: str = "__unknown__"
        self.base_data: Optional[List] = None
        self.target_data: Optional[List] = None
        self.change_type = None
        self.agg_data = None

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

    def summary(self):
        return self.name

    def calculate_diff(self):
        changes = 0
        for date in self.agg_data:
            if self.agg_data[date].get("base") != self.agg_data[date].get("target"):
                changes += 1
        if CapControl().cap_control_level >= CapControlLevel.EXTREME:
            return f"{changes}"
        return f"{changes}{Image.DbtMetric.implicit_icon}"

    def summary_for_change_type(self):
        if self.change_type == "no-changes":
            return ""
        if self.change_type == "edited":
            return self.calculate_diff()
        if self.change_type == "added":
            return "Added"
        if self.change_type == "removed":
            return "Removed"

    def aggregate_by_date(self):
        agg_data = {}
        base_data = {x[0]: x[1] for x in self.base_data}
        target_data = {x[0]: x[1] for x in self.target_data}
        all_dates = list(set(list(base_data.keys()) + list(target_data.keys())))

        for date in sorted(all_dates, key=lambda x: datetime.fromisoformat(x)):
            agg_data[date] = {
                'base': base_data.get(date),
                'target': target_data.get(date)
            }

        self.agg_data = agg_data


class DbtMetricsWithChangesTableEntry(_Element):
    def __init__(self, data: MetricsChangeView):
        super().__init__(None)
        self.data = data

    @staticmethod
    def is_adjacency(idx, equal_index):
        return idx + 1 in equal_index or idx - 1 in equal_index

    def build(self):
        content = ""
        dates = list(self.data.agg_data.keys())
        # dummy value to make sure we don't go out of bounds
        diff_status = [0]
        for x in self.data.agg_data:
            if self.data.agg_data[x]['base'] != self.data.agg_data[x]['target']:
                diff_status.append(1)
            else:
                diff_status.append(0)
        # dummy value to make sure we don't go out of bounds
        diff_status.append(0)

        display_index = []
        equal_index = []
        for idx in range(1, 1 + len(dates)):
            if diff_status[idx] == 1:
                display_index.append(idx - 1)
            if diff_status[idx] == 0 and (
                    diff_status[idx] != diff_status[idx + 1] or diff_status[idx] != diff_status[idx - 1]):
                equal_index.append(idx - 1)

        hide_adjacent = False
        for idx, date in enumerate(dates):
            b = self.data.agg_data[date]['base']
            t = self.data.agg_data[date]['target']

            if idx in display_index:
                change = ""
                if b is not None and t is not None:
                    change = "↑" if t > b else "↓"
                    if b == 0:
                        change += "∞"
                    else:
                        change += f"{abs((t - b) / b): .1%}"

                content += f"""
                <tr>
                    <td>{Image.DbtMetric.implicit_icon}</td>
                    <td>{Styles.html_bold(date)}</td>
                    <td>{Styles.html_bold(b) if b is not None else Styles.html_bold('-')}</td>
                    <td>{Styles.html_bold(t) if t is not None else Styles.html_bold('-')}</td>
                    <td>{Styles.html_bold("(" + change + ")") if change else ""}</td>
                </tr>
                """
                hide_adjacent = False
            elif idx in equal_index:
                content += f"""
                <tr>
                    <td></td>
                    <td>{Styles.html_grey(date)}</td>
                    <td>{Styles.html_grey(b) if b is not None else Styles.html_grey('-')}</td>
                    <td>{Styles.html_grey(t) if t is not None else Styles.html_grey('-')}</td>
                    <td></td>
                </tr>
                """
                hide_adjacent = False
            elif self.is_adjacency(idx, equal_index):
                if hide_adjacent:
                    continue
                content += f"""
                <tr>
                    <td></td>
                    <td>{Styles.html_grey('...')}</td>
                    <td>{Styles.html_grey('...')}</td>
                    <td>{Styles.html_grey('...')}</td>
                    <td></td>
                </tr>
                """
                hide_adjacent = True

        return content


class DbtMetricsWithChangesTable(_Element):
    def __init__(self, root: _Element, data: MetricsChangeView):
        super().__init__(root)
        self.data = data

    def build(self):
        self.data.aggregate_by_date()
        if CapControl().cap_control_level >= CapControlLevel.HIGH:
            return f"""* {embed_url(self.get_url(), '', 'metric', self.data.name)} ({self.data.summary_for_change_type()})"""

        return f"""<details><summary>{embed_url(self.get_url(), '', 'metric', self.data.name)} ({self.data.summary_for_change_type()}) </summary>
        <table>
            <thead>
                <tr>
                    <th></th>
                    <th>{self.data.header}</th>
                    <th>Base</th>
                    <th>Target</th>
                    <th>Change</th>
                </tr>
            </thead>
            <tbody>
                {DbtMetricsWithChangesTableEntry(self.data).build()}
            </tbody>
        </table></details>
        """


class DbtMetricsWithChangesElement(_Element):
    def __init__(self, root: _Element, changes_data: List[MetricsChangeView], no_changes_data: List[MetricsChangeView]):
        super().__init__(root)
        self.changes_data = changes_data
        self.no_changes_data = no_changes_data

    def build(self):
        changed_line = f"\n* dbt Metrics with Changes: {len(self.changes_data)}\n"
        changed_metrics = [DbtMetricsWithChangesTable(self, x) for x in self.changes_data]

        return (changed_line + self.add_indent(_build_list(changed_metrics), 4) + DbtMetricsWithNoChangesElement(
            self, self.no_changes_data).build())


class DbtMetricsWithNoChangesElement(_Element):
    def __init__(self, root: _Element, data: List[MetricsChangeView]):
        super().__init__(root)
        self.data = data

    def build(self):
        metric_entries = ""
        for metric in self.data:
            metric_entries += f"\n* {metric.name}\n"

        return f"\n* <details><summary>dbt Metrics with No Changes: {len(self.data)}</summary>\n" \
               f"{self.add_indent(metric_entries)}" \
               f"</details>"


class DbtMetricsChangeElement(_Element):
    def __init__(
            self, root: _Element, base_metrics: List[Dict], target_metrics: List[Dict]
    ):
        super().__init__(root)
        self.base_metrics = base_metrics
        self.target_metrics = target_metrics
        self.joined_metrics = None

        if not self.base_metrics or not self.target_metrics:
            return

        joined_metrics: Dict[str, MetricsChangeView] = collections.OrderedDict()
        metric_names = sorted(
            list(
                set(
                    [x.get("name") for x in self.base_metrics] + [x.get("name") for x in self.target_metrics]
                )
            )
        )

        for name in metric_names:
            joined_metrics[name] = MetricsChangeView(name)

        for metric in self.base_metrics:
            name = metric.get("name")
            m: MetricsChangeView = joined_metrics[name]
            m.header = metric.get("headers")[0]
            m.base_data = metric.get("data")

        for metric in self.target_metrics:
            name = metric.get("name")
            m: MetricsChangeView = joined_metrics[name]
            m.header = metric.get("headers")[0]
            m.target_data = metric.get("data")

        self.total_metrics = len(metric_names)

        # added, removed, edited, no changes
        for m in joined_metrics.values():
            m.update_status()

        self.joined_metrics = joined_metrics
        self.changes = len(
            [x for x in joined_metrics.values() if x.change_type != "no-changes"]
        )

    def build(self):
        if not self.joined_metrics:
            return ""

        changeset = [
            x for x in self.joined_metrics.values() if x.change_type != "no-changes"
        ]
        no_changeset = [
            x for x in self.joined_metrics.values() if x.change_type == "no-changes"
        ]
        return (
            f"<details><summary>dbt Metrics changes: {self.changes} {Image.DbtMetric.triangle_icon if self.changes > 0 else ''} of {self.total_metrics} dbt Metrics</summary>"
            f"\n{DbtMetricsWithChangesElement(self, changeset, no_changeset).build()}\n"
            f"</details>"
        )


class Document(_Element):
    def __init__(
            self,
            base_run: Dict,
            target_run: Dict,
            url: str = None,
    ):
        super().__init__(None)
        self.url = url

        base_manifest_dict = base_run.get('dbt', {}).get('manifest')
        base_run_results = base_run.get('dbt', {}).get('run_results')
        target_manifest_dict = target_run.get('dbt', {}).get('manifest')
        target_run_results = target_run.get('dbt', {}).get('run_results')

        base_manifest = load_manifest(base_manifest_dict)
        target_manifest = load_manifest(target_manifest_dict)

        with_downstream = compare_models_between_manifests(base_manifest, target_manifest, True)
        altered_models = compare_models_between_manifests(base_manifest, target_manifest)
        downstream_models = list(set(with_downstream) - set(altered_models))

        self.base_manifest = base_manifest
        self.target_manifest = target_manifest
        self.altered_models: List[str] = altered_models
        self.downstream_models: List[str] = downstream_models
        self._joined_tables = JoinedTables(base_run, target_run)

        self.base_run = base_run
        self.base_run_results = base_run_results

        self.target_run = target_run
        self.target_run_results = target_run_results

    @staticmethod
    def from_runs(base_run: Dict, target_run: Dict, url: str = None):
        # verify the report version compatibility
        base_manifest_dict = base_run.get('dbt', {}).get('manifest')
        target_manifest_dict = target_run.get('dbt', {}).get('manifest')

        if not base_manifest_dict:
            raise Exception(f'The version is too old to generate summary for report[{base_run.get("id")}]')
        if not target_manifest_dict:
            raise Exception(f'The version is too old to generate summary for report[{target_run.get("id")}]')

        doc = Document(base_run, target_run, url)
        return doc

    def build(self):
        if is_executed_manually():
            return _build_list([ModelElement(self, ModelType.EXPLICT_CHANGED_MODELS, self.altered_models),
                                ModelElement(self, ModelType.IMPLICIT_CHANGED_MODELS, self.downstream_models),
                                DbtMetricsChangeElement(self, self.base_run.get("metrics"),
                                                        self.target_run.get("metrics"))])

        # PipeRider Compare Action: There is a text limit to the comment that get published to GitHub actions
        control = CapControl()
        for level in CapControlLevel:
            control.cap_control_level = level
            doc = _build_list([ModelElement(self, ModelType.EXPLICT_CHANGED_MODELS, self.altered_models),
                               ModelElement(self, ModelType.IMPLICIT_CHANGED_MODELS, self.downstream_models),
                               DbtMetricsChangeElement(self, self.base_run.get("metrics"),
                                                       self.target_run.get("metrics"))])

            if len(doc) < control.max_summary_report_length:
                return doc

        return """
        Comparison summary is too long to be generated.
        Please feedback us to help us improve the report and provide most useful information to you.
        """
