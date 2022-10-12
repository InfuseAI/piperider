import json
from typing import Optional


class RecommendedAssertion:
    def __init__(self, name: Optional[str], metric: Optional[str], asserts: dict):
        self.table: str = None
        self.column: str = None
        self.name: str = name
        self.metric: str = metric
        self.asserts: dict = asserts

    def __repr__(self):
        table = self.table if self.table else ''
        column = ('.' + self.column) if self.column else ''

        asserts = json.dumps(self.asserts).replace('\"', '') if self.asserts else ''

        return f'{table}{column}: {self.name} {asserts}'
