import abc
import collections
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Iterable, List, Optional

from dbt.contracts.graph.manifest import WritableManifest

TRIANGLE_ICON = """<img src="https://raw.githubusercontent.com/HanleyInfuse/assets/main/icons/icon-triangle-yellow%402x.png" width="18px">"""
CHECKED_ICON = """<img src="https://raw.githubusercontent.com/HanleyInfuse/assets/main/icons/icon-bs-check2-gray%402x.png" width="18px">"""
materialization_type = """<img src="https://raw.githubusercontent.com/HanleyInfuse/assets/main/icons/model-icon-view%402x.png" width="27px">"""
add_icon = """<img src="https://raw.githubusercontent.com/HanleyInfuse/assets/main/icons/icon-diff-delta-plus%402x.png" width="27px">"""
diff_icon = """<img src="https://raw.githubusercontent.com/HanleyInfuse/assets/main/icons/icon-diff-delta-explicit%402x.png" width="27px">"""
remove_icon = """<img src="https://raw.githubusercontent.com/HanleyInfuse/assets/main/icons/icon-diff-delta-minus%402x.png" width="27px">"""

triangle_icon = """<img src="https://raw.githubusercontent.com/HanleyInfuse/assets/main/icons/icon-triangle%402x.png" width="18px">"""
shield_icon = """<img src="https://raw.githubusercontent.com/HanleyInfuse/assets/main/icons/icon-bs-shield%402x.png" width="18px">"""
cross_shield_icon = """<img src="https://raw.githubusercontent.com/HanleyInfuse/assets/main/icons/icon-bs-shield-cross-yellow%402x.png" width="18px">"""
implicit_icon = """<img src="https://raw.githubusercontent.com/HanleyInfuse/assets/main/icons/icon-diff-delta-implicit%402x.png" width="18px">"""

column_change_diff_plus = """<img src="https://raw.githubusercontent.com/HanleyInfuse/assets/main/icons/icon-diff-delta-plus%402x.png" width="18px">"""
column_change_diff_minus = """<img src="https://raw.githubusercontent.com/HanleyInfuse/assets/main/icons/icon-diff-delta-minus%402x.png" width="18px">"""
column_change_diff_explicit = """<img src="https://raw.githubusercontent.com/HanleyInfuse/assets/main/icons/icon-diff-delta-explicit%402x.png" width="18px">"""

hover_diff_plus = """<img src="https://raw.githubusercontent.com/HanleyInfuse/assets/main/icons/icon-diff-delta-plus%402x.png" width="10px">"""
hover_diff_minus = """<img src="https://raw.githubusercontent.com/HanleyInfuse/assets/main/icons/icon-diff-delta-minus%402x.png" width="10px">"""
hover_diff_explicit = """<img src="https://raw.githubusercontent.com/HanleyInfuse/assets/main/icons/icon-diff-delta-explicit%402x.png" width="10px">"""


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
        node = self
        while True:
            if hasattr(node, "target_manifest"):
                selected = model_selector.split(".")
                m: WritableManifest = node.target_manifest
                for n in m.nodes.values():
                    if n.fqn == selected:
                        return n
            node = node.root
            if node is None:
                break

    def find_table_name(self, model_selector: str):
        # TODO do we need find it at base_manifest, too?
        return self.find_target_node(model_selector).name

    def find_target_path(self, model_selector: str):
        result = self.find_target_node(model_selector)
        if result:
            return f"Path: {result.path}, Name: {result.name}"

    def get_target_manifest(self):
        node = self
        while True:
            if hasattr(node, "target_manifest"):
                return node.target_manifest
            node = node.root
            if node is None:
                break

    def get_base_manifest(self):
        node = self
        while True:
            if hasattr(node, "base_manifest"):
                return node.base_manifest
            node = node.root
            if node is None:
                break

    def merge_keys(self, base: List[str], target: List[str]):
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

    def join(self, base, target):
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

        keys = self.merge_keys(list(base.keys()), list(target.keys()))
        result = dict()
        for key in keys:
            value = dict()
            value["base"] = base.get(key)
            value["target"] = target.get(key)
            result[key] = value
        return result


@dataclass
class ChangeStatus:
    change_type: str
    base_view: "ColumnChangeView"
    target_view: "ColumnChangeView"
    icon: str

    def is_added_or_removed(self):
        return self.change_type in ["Added.", "Removed."]

    def display(self):
        if self.target_view is not None:
            return self.target_view
        return self.base_view


class ColumnChangeView:
    def __init__(self, data: Dict):
        self.data = data

    def __eq__(self, other: "ColumnChangeView"):
        if self.data is None:
            return False
        if other.data is None:
            return False

        # Edited -> types, duplicate, invalids, missing(nulls)
        if self.data.get("type") != other.data.get("type"):
            return False

        if self.data.get("duplicates") != other.data.get("duplicates"):
            return False

        if self.data.get("invalids") != other.data.get("invalids"):
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
    def nulls_p(self):
        if not self.data:
            return "-"
        if self.data.get("nulls_p") is None:
            return "-"

        return f"{self.data.get('nulls_p'):.1%}"

    @property
    def invalids_p(self):
        if not self.data:
            return "-"
        if self.data.get("invalids_p") is None:
            return "-"
        return f"{self.data.get('invalids_p'):.1%}"

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
            if self.data.get(metric_name) != target_view.data.get(metric_name):
                delta = target_view.data.get(percentage) - self.data.get(percentage)
                annotation = f"{delta:.1%}" + "↑" if delta > 0 else f"{delta:.1%}" + "↓"
                annotation = f"({annotation})".replace("%", "\%")
                annotation = (
                        r'<span title="TODO">$\color{orange}{\text{ %s }}$</span>'
                        % annotation
                )
                reasons.append(
                    f"{target_view.data.get(percentage):.1%} {display_label} {annotation}."
                )

        add_reason_for("duplicates", "Duplicates")
        add_reason_for("nulls", "Missing")
        add_reason_for("invalids", "Invalid")

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
                icon=column_change_diff_plus,
            )
        if base_view.data is not None and target_view.data is None:
            return ChangeStatus(
                change_type="Removed.",
                base_view=base_view,
                target_view=target_view,
                icon=column_change_diff_minus,
            )
        if base_view == target_view:
            return ChangeStatus(
                change_type="No changes.",
                base_view=base_view,
                target_view=target_view,
                icon="",
            )
        else:
            return ChangeStatus(
                change_type="Edited.",
                base_view=base_view,
                target_view=target_view,
                icon=column_change_diff_explicit,
            )


class ChangedColumnsTableEntryElement(_Element):
    def __init__(
            self, column_name: str, base_column_data: Dict, target_column_data: Dict
    ):
        super().__init__(None)
        self.column_name = column_name
        self.base_column_data = base_column_data
        self.target_column_data = target_column_data

        self.base_view = ColumnChangeView(self.base_column_data)
        self.target_view = ColumnChangeView(self.target_column_data)
        self.changed = self.base_view != self.target_view

    def build(self):
        # Check added or removed
        # added -> base is null and target is not null
        # removed -> base is not null and target is null
        # Edited -> types, duplicate, invalids, missing(nulls)
        change_status = ColumnChangeView.create_change_status(
            self.base_view, self.target_view
        )
        if change_status.is_added_or_removed():
            result = f"""
                <tr>
                <td>{change_status.icon}</td>
                <td>{self.column_name}</td>
                <td>{change_status.display().get_type()}</td>
                <td>{change_status.display().get_type()}</td>
                <td>{change_status.change_type}</td>
                </tr>
                """
            return self.add_indent(result, 8)

        if not self.changed:
            return ""

        result = f"""
            <tr>
            <td>{column_change_diff_explicit}</td>
            <td>{self.column_name}</td>
            <td>{self.base_view.get_type()}</td>
            <td>{self.target_view.get_type(self.base_view.get_type())}</td>
            <td>{self.base_view.explain(self.target_view)}</td>
            </tr>
            """

        return self.add_indent(result, 8)


class TotalColumnsTableEntryElement(_Element):
    def __init__(
            self, column_name: str, base_column_data: Dict, target_column_data: Dict
    ):
        super().__init__(None)
        self.column_name = column_name
        self.base_column_data = base_column_data
        self.target_column_data = target_column_data

        self.base_view = ColumnChangeView(self.base_column_data)
        self.target_view = ColumnChangeView(self.target_column_data)

    def build(self):
        target_type = self.target_view.get_type()
        if target_type is None:
            target_type = f"{self.base_view.get_type()}"

        change_status = ColumnChangeView.create_change_status(
            self.base_view, self.target_view
        )

        result = f"""
        <tr>
        <td>{change_status.icon}</td>
        <td>{self.column_name}</td>
        <td>{target_type}</td>
        <td>{self.base_view.duplicates_p}</td>
        <td>{self.target_view.duplicates_p}</td>
        <td>{self.base_view.invalids_p}</td>
        <td>{self.target_view.invalids_p}</td>
        <td>{self.base_view.nulls_p}</td>
        <td>{self.target_view.nulls_p}</td>
        </tr>
        """
        return self.add_indent(result, 8)


class JoinedTables:
    def __init__(self, joined_tables: Dict):
        self.joined_tables = joined_tables

    def columns_changed_iterator(
            self, table_name
    ) -> Iterable[ChangedColumnsTableEntryElement]:
        all_column_keys, b, t = self.create_columns_and_their_metrics(table_name)

        for column_name in all_column_keys:
            elem = ChangedColumnsTableEntryElement(
                column_name, b.get(column_name), t.get(column_name)
            )
            if not elem.changed:
                continue
            yield elem

    def all_columns_iterator(
            self, table_name
    ) -> Iterable[TotalColumnsTableEntryElement]:
        all_column_keys, b, t = self.create_columns_and_their_metrics(table_name)

        for column_name in all_column_keys:
            yield TotalColumnsTableEntryElement(
                column_name, b.get(column_name), t.get(column_name)
            )

    def create_columns_and_their_metrics(self, table_name):
        table = self.joined_tables[table_name]
        b = table.get("base", {}).get("columns")
        t = table.get("target", {}).get("columns")
        all_column_keys = sorted(set(list(b.keys()) + list(t.keys())))
        return all_column_keys, b, t


class ChangedColumnsTableElement(_Element):
    def __init__(self, root: _Element, model_selector: str, joined_tables: Dict):
        super().__init__(root)
        self.column_changes = 0
        self.model_selector = model_selector
        self.joined_tables = joined_tables

    def build(self):
        name = self.find_table_name(self.model_selector)
        t = JoinedTables(self.joined_tables)
        children = list(t.columns_changed_iterator(name))
        self.column_changes = len(children)

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

        * <em>Hover over <a href="#hover-for-info" title="On hover, change show additional values (like base and target counts and percentages)."><kbd>🔺changes</kbd></a> for more information.</em>
        """


class TotalColumnsTableElement(_Element):
    def __init__(self, root: _Element, model_selector: str, joined_tables: Dict):
        super().__init__(root)
        self.model_selector = model_selector
        self.joined_tables = joined_tables
        self.columns = 0

    def build(self):
        name = self.find_table_name(self.model_selector)
        t = JoinedTables(self.joined_tables)
        children = list(t.all_columns_iterator(name))
        self.columns = len(children)

        return f"""
        <table>
        <thead>
        <tr><th title="Field #1" rowspan='2'>&nbsp;&nbsp;&nbsp;&nbsp;</th>
        <th title="Field #2" rowspan='2'>Column</th>
        <th title="Field #3" rowspan='2'>Target Type</th>
        <th title="Field #6" colspan='2'>Duplicate</th>
        <th title="Field #8" colspan='2'>Invalid</th>
        <th title="Field #10" colspan='2'>Missing</th>
        </tr>
        <tr>
        <td>Base</td>
        <td>Target</td>
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
    def __init__(self, root: _Element, model_selector: str, joined_tables: Dict):
        super().__init__(root)
        self.model_selector = model_selector
        self.joined_tables = joined_tables

    def build(self):
        element = ChangedColumnsTableElement(
            self.root, self.model_selector, self.joined_tables
        )
        table_content = element.build()

        if element.column_changes == 0:
            return self.add_indent(
                f"<details><summary>{element.column_changes} Columns Changed</summary></details>"
            )

        return self.add_indent(
            f"<details><summary>{element.column_changes} Columns Changed</summary>{table_content}</details>"
        )


class ModelEntryColumnsInTotalElement(_Element):
    def __init__(self, root: _Element, model_selector: str, joined_tables: Dict):
        super().__init__(root)
        self.model_selector = model_selector
        self.joined_tables = joined_tables

    def build(self):
        element = TotalColumnsTableElement(
            self.root, self.model_selector, self.joined_tables
        )
        content = element.build()
        columns_total = element.columns
        return self.add_indent(
            f"<details><summary>{columns_total} Columns in Total</summary>{content}</details>"
        )


class ModelEntryOverviewElement(_Element):
    def __init__(self, root: _Element, model_selector: str, joined_tables: Dict):
        super().__init__(root)
        self.model_selector = model_selector
        self.joined_tables = joined_tables

    def make_cols_stat(self, base_table_metrics, target_table_metrics):
        joined = self.join(
            base_table_metrics.get("columns"), target_table_metrics.get("columns")
        )

        # duplicate, invalid, missing
        stat = [0, 0, 0]
        for column_name in joined.keys():
            c = joined[column_name]

            b = c.get("base")
            t = c.get("target")
            if t is None or b is None:
                stat[0] += 1
                stat[1] += 1
                stat[2] += 1
                continue

            for idx, m in enumerate(["duplicates", "invalids", "nulls"]):
                if b.get(m) != t.get(m):
                    stat[idx] += 1

        value = target_table_metrics.get("col_count")
        return [(x, value) for x in stat]

    def build(self):
        m = self.find_target_node(self.model_selector)
        materialized = m.config.materialized
        name = m.name

        # TODO

        base_data = self.joined_tables.get(name, {}).get("base", {})
        target_data = self.joined_tables.get(name, {}).get("target", {})

        base_total_rows = base_data.get("row_count", "-")
        target_total_rows = target_data.get("row_count", "-")

        base_total_columns = base_data.get("col_count", "-")
        target_total_columns = target_data.get("col_count", "-")

        value_diff_plus = 1
        value_diff_minus = 2
        value_diff_explicit = 1

        # TODO
        total_rows_hover = """<a href="#hover-for-info" title="B: 2,678 ••• T: 3,310 (🔺632) (🔺24%)"><kbd>🔺24%</kbd></a>"""
        total_columns_hover = f"""<a href="#hover-for-info" title="TODO..."><kbd>{value_diff_plus}{hover_diff_plus} {value_diff_minus}{hover_diff_minus} {value_diff_explicit}{hover_diff_explicit}</kbd>"""

        stat = self.make_cols_stat(base_data, target_data)

        cols_descriptions = [
            self.to_col_description2(stat, 0),
            self.to_col_description2(stat, 1),
            self.to_col_description2(stat, 2),
        ]

        return f"""
   <table>
    <tr>
        <th>{materialization_type}</th>
        <th colspan='3' >{name} ({materialized})</th>
        <th>{diff_icon}</th>
    </tr>
    <tr>
        <td></td>
        <td></td>
        <td>Base</td>
        <td>Target</td>
        <td></td>
    </tr>
    <tr>
        <td></td>
        <td>Total dbt Time (TBD)</td>
        <td>5'21"</td>
        <td>11'37" <a href="#hover-for-info" title="B: 5'21'' ••• T: 11'37'' (🔺6'16'') (🔺217%)"><kbd>🔺217%</kbd></a></td>
        <td></td>
    </tr>
    <tr>
        <td></td>
        <td>Total Rows</td>
        <td>{base_total_rows}</td>
        <td>{target_total_rows} {total_rows_hover}</td>
        <td></td>
    </tr>
    <tr>
        <td></td>
        <td>Total Columns</td>
        <td>{base_total_columns}</td>
        <td>{target_total_columns} {total_columns_hover}</td>
        <td>{TRIANGLE_ICON}</td>
    </tr>
    <tr>
        <td>{triangle_icon}</td>
        <td rowspan='1' colspan='3' >CHANGES IN VALUES</td>
        <td></td>
    </tr>
    <tr>
        <td></td>
        <td>Duplicate col. values</td>
        <td rowspan='1' colspan='2' >{cols_descriptions[0][0]}</td>
        <td>{cols_descriptions[0][1]}</td>
    </tr>
    <tr>
        <td></td>
        <td>Invalid col. values</td>
        <td rowspan='1' colspan='2' >{cols_descriptions[1][0]}</td>
        <td>{cols_descriptions[1][1]}</td>
    </tr>
    <tr>
        <td></td>
        <td>Missing col. values</td>
        <td rowspan='1' colspan='2' >{cols_descriptions[2][0]}</td>
        <td><a href="#">{cols_descriptions[2][1]}</a></td>
    </tr>

    <!--
    <tr>
        <td>{shield_icon}</td>
        <td rowspan='1' colspan='3' >TESTS</td>
        <td></td>
    </tr>
    <tr>
        <td></td>
        <td>Failed Model Tests</td>
        <td>4 / 7</td>
        <td>0 <kbd>🔻4</kbd> / 5 <kbd>🔻2</kbd></td>
        <td>{CHECKED_ICON}</td>
    </tr>
    <tr>
        <td></td>
        <td>Failed Column tests</td>
        <td>7 / 11</td>
        <td>5 <kbd>🔺1</kbd> / 11</td>
        <td>{cross_shield_icon}</td>
    </tr>
    <tr>
        <td rowspan='1' colspan='5' ></td>
    </tr>
    -->

    </table>
        """

    def to_col_description(self, base_stat, target_stat, index):
        result = ""
        s = target_stat[index] - base_stat[index]
        icon = f"{CHECKED_ICON}"

        if s == 0:
            result = "No changes"
        if s > 0:
            result = f"{s} Cols {TRIANGLE_ICON} ({self.to_p(base_stat, target_stat, index) :.1%})"
            icon = TRIANGLE_ICON
        if s < 0:
            result = f"{-s} Cols {TRIANGLE_ICON} ({self.to_p(base_stat, target_stat, index) :.1%})"
            icon = TRIANGLE_ICON
        return result, icon

    def to_col_description2(self, stat, index):
        result = ""
        s = stat[index][0]
        denominator = stat[index][1]
        icon = f"{CHECKED_ICON}"

        ratio = s / denominator

        if s == 0:
            result = "No changes"
        if s > 0:
            result = f"{s} Cols {TRIANGLE_ICON} ({ratio :.1%})"
            icon = TRIANGLE_ICON
        if s < 0:
            result = f"{-s} Cols {TRIANGLE_ICON} ({ratio :.1%})"
            icon = TRIANGLE_ICON
        return result, icon

    def to_p(self, base_stat, target_stat, index):
        return target_stat[index] / base_stat[index] - 1


class ModelEntryElement(_Element):
    def __init__(self, root: _Element, model_selector: str, joined_tables: Dict):
        super().__init__(root)
        self.model_selector = model_selector
        self.joined_tables = joined_tables

    def build(self):
        path_line = self.find_target_path(self.model_selector)
        children = [
            ModelEntryOverviewElement(self, self.model_selector, self.joined_tables),
            ModelEntryColumnsChangedElement(
                self, self.model_selector, self.joined_tables
            ),
            ModelEntryColumnsInTotalElement(
                self, self.model_selector, self.joined_tables
            ),
        ]
        return f"\n* {path_line}\n{_build_list(children)}\n"


class ModelElement(_Element):
    STATE_ADD = 0
    STATE_DEL = 1
    STATE_MOD = 2

    def __init__(
            self, root: _Element, summary_title: str, models: List[str], joined_tables: Dict
    ):
        super().__init__(root)
        self.summary_title = summary_title
        self.models = models
        self.joined_tables = joined_tables

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
        entries = [ModelEntryElement(self, x, self.joined_tables) for x in self.models]

        # TODO lacks of modified-state and profiled-state and icons
        # <path><model> <modified-state> <profiled-state>
        # TODO show no changes model

        return f"<details><summary>{self.summary_title}: {len(self.get_changed_tables())} of {len(self.models)}</summary>\n{_build_list(entries)}</details>"

    def get_changed_tables(self):
        changed = []
        for table_name in model_selectors_to_table_names(self.models):
            t = self.joined_tables[table_name]

            columns_b = t.get("base").get("columns") if t.get("base") else None
            columns_t = t.get("target").get("columns") if t.get("target") else None
            state = self._get_changed_state(table_name, columns_b, columns_t)
            if state is not None:
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
        # TODO make a diff set
        return f"Edited {implicit_icon}"

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

    def build(self):
        content = ""
        for date in self.data.agg_data:
            content += f"""
            <tr>
                <td>Icon</td>
                <td>{date}</td>
                <td>{self.data.agg_data[date]['base']}</td>
                <td>{self.data.agg_data[date]['target']}</td>
                <td>{self.data.summary_for_change_type()}</td>
            </tr>
            """

        return content


class DbtMetricsWithChangesTable(_Element):
    def __init__(self, data: MetricsChangeView):
        super().__init__(None)
        self.data = data

    def build(self):
        self.data.aggregate_by_date()
        return f"""<details><summary>{self.data.name} ({self.data.update_status()}) </summary>
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
    def __init__(self, data: List[MetricsChangeView]):
        super().__init__(None)
        self.data = data

    def build(self):
        lines = []
        for x in self.data:
            lines.append(
                f"<details><summary>{x.summary()} ({x.summary_for_change_type()})</summary>"
                f"</details>"
            )

        content = "\n".join(lines)
        summary_line = f"\n* dbt Metrics with Changes: {len(self.data)}\n"
        changed_metrics = [DbtMetricsWithChangesTable(x) for x in self.data]
        return summary_line + self.add_indent(_build_list(changed_metrics), 4)
        # return summary_line + self.add_indent(
        #     f"""
        # \n{content}\n
        # """,
        #     4,
        # )


class DbtMetricsChangeElement(_Element):
    def __init__(
            self, root: _Element, base_metrics: List[Dict], target_metrics: List[Dict]
    ):
        super().__init__(root)
        self.base_metrics = base_metrics
        self.target_metrics = target_metrics

        joined_metrics: Dict[str, MetricsChangeView] = collections.OrderedDict()
        metric_names = sorted(
            list(
                set(
                    [x.get("name") for x in self.base_metrics]
                    + [x.get("name") for x in self.target_metrics]
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
        changeset = [
            x for x in self.joined_metrics.values() if x.change_type != "no-changes"
        ]
        no_changeset = [
            x for x in self.joined_metrics.values() if x.change_type == "no-changes"
        ]
        return (
            f"<details><summary>dbt Metrics changes: {self.changes} of {self.total_metrics} dbt Metrics</summary>"
            f"\n{DbtMetricsWithChangesElement(changeset).build()}\n"
            f"</details>"
        )


class Document(_Element):
    def __init__(
            self,
            base_manifest: WritableManifest,
            target_manifest: WritableManifest,
            altered_models: List[str],
            downstream_models: List[str],
            base_run: Dict,
            target_run: Dict,
    ):
        super().__init__(None)
        self.base_manifest = base_manifest
        self.target_manifest = target_manifest
        self.altered_models: List[str] = altered_models
        self.downstream_models: List[str] = downstream_models
        self.joined_tables: Dict = self.join(
            base_run.get("tables"), target_run.get("tables")
        )

        self.base_run = base_run
        self.target_run = target_run

    def build(self):
        children = []
        children.append(
            ModelElement(
                self, "Altered Models in PR", self.altered_models, self.joined_tables
            )
        )
        children.append(
            ModelElement(
                self, "Downstream Models", self.downstream_models, self.joined_tables
            )
        )
        children.append(
            DbtMetricsChangeElement(
                self, self.base_run.get("metrics"), self.target_run.get("metrics")
            )
        )

        return _build_list(children)
