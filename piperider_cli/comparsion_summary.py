from dataclasses import dataclass
from typing import List


@dataclass
class Fraction:
    # numerator
    n: int

    # denominator
    d: int


class Element:

    def __init__(self):
        self.children: List[Element] = []

    def add(self, element: "Element"):
        self.children.append(element)
        pass

    def build(self):
        raise NotImplemented

    def icon_changed(self):
        # TODO fix it
        return '<img src="https://raw.githubusercontent.com/HanleyInfuse/assets/main/icons/icon-triangle-yellow%402x.png" width="18px">'


class ReportSection(Element):

    def __init__(self, v1: Fraction, v2: Fraction = None):
        super().__init__()
        self.v1: Fraction = v1
        self.v2: Fraction = v2

    def build(self):
        raise NotImplemented


class AlteredModels(ReportSection):
    def __init__(self, v1: Fraction, v2: Fraction):
        super().__init__(v1, v2)

    def build(self):
        if self.v2 is None:
            profile_message = "(None Profiled for Value Changes)"
        else:
            profile_message = f"{self.v2.n} with Value Changes from {self.v2.d} Profiled"
        return f"<details><summary>Altered Models in PR: {self.v1.n} {self.icon_changed()} of {self.v1.d} - {profile_message}</summary></details>"


class DownstreamModels(ReportSection):

    def __init__(self, v1: Fraction, v2: Fraction):
        super().__init__(v1, v2)

    def build(self):
        if self.v2 is None:
            profile_message = "(None Profiled for Value Changes)"
        else:
            profile_message = f"{self.v2.n} with Value Changes from {self.v2.d} Profiled"
        return f"<details><summary>Downstream Models: {self.v1.n} {self.icon_changed()} of {self.v1.d} - {profile_message}</summary></details>"


class DbtMetrics(ReportSection):

    def __init__(self, v1: Fraction):
        super().__init__(v1, None)

    def build(self):
        return f"""
        <details><summary>dbt Metrics changes: {self.v1.n} {self.icon_changed()} of {self.v1.d}</summary></details>
        """.strip()


class ComparisonSummary(Element):

    def __init__(self, altered: AlteredModels, downstream: DownstreamModels, dbt_metrics: DbtMetrics):
        super().__init__()
        self.add(altered)
        self.add(downstream)
        self.add(dbt_metrics)

    def build(self):
        return "\n\n".join([x.build() for x in self.children])


if __name__ == '__main__':
    altered = AlteredModels(Fraction(n=4, d=11), Fraction(n=2, d=6))
    downstream = DownstreamModels(Fraction(n=3, d=87), Fraction(n=1, d=24))
    dbt_metrics = DbtMetrics(Fraction(n=6, d=23))
    doc = ComparisonSummary(altered, downstream, dbt_metrics)
    print(doc.build())
