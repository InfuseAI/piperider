import json


class RecommendedAssertion:
    def __init__(self, table: str, column: str, name: str, asserts: dict):
        self.table: str = table
        self.column: str = column
        self.name: str = name
        self.asserts: dict = asserts

    def __repr__(self):
        table = self.table if self.table else ''
        column = ('.' + self.column) if self.column else ''

        asserts = json.dumps(self.asserts).replace('\"', '') if self.asserts else ''

        return f'{table}{column}: {self.name} {asserts}'
