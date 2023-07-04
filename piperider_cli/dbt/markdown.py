from typing import Any, List


class MarkdownTable:

    def __init__(self, *, headers: List[str]):
        self.headers: List[str] = headers
        self.num_of_columns = len(self.headers)
        self.rows = []

    def add_row(self, columns: List):
        if len(columns) != self.num_of_columns:
            raise ValueError('The number of columns doesn\'t match headers')

        self.rows.append(columns)

    def build(self):
        header_lines = "| " + " | ".join(self.headers).strip()
        header_ending = "| " + " | ".join(["--" for x in self.headers]).strip()
        row_lines = []

        for r in self.rows:
            row = "| " + " | ".join([self.as_str(x) for x in r]).strip()
            row_lines.append(row)

        return "\n".join([header_lines, header_ending] + row_lines)

    def as_str(self, entry: Any):
        if isinstance(entry, str):
            return entry
        return str(entry)
