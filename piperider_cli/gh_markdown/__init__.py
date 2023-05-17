import abc
from typing import List


class DocElement:

    def __init__(self):
        self.children: List[DocElement] = []

    def add(self, child: "DocElement"):
        self.children.append(child)

    def build(self):
        return ""


class DocRoot(DocElement):

    def __init__(self):
        super().__init__()
        self.title: str = "<no-title>"
        self.content: str = "<no-content>"

    def build(self):
        children_content = "\n\n---\n\n".join([x.build() for x in self.children])
        return f"""
{self.title}
{self.content}

---

{children_content}
        """.strip()


class ReportEntry(DocElement):

    def __init__(self, title: str, details: DocElement = None):
        super().__init__()
        self.title = title
        if details:
            self.children.append(details)

    def build(self):

        if self.children:
            details = '\n'.join([x.build() for x in self.children])
            output = f"<details><summary>{self.title}</summary>\n{details}</details>"
        else:
            output = f"* {self.title}"

        return output


class DetailsContainer(DocElement):

    def build(self):
        return "more details..."


if __name__ == '__main__':
    root = DocRoot()
    root.title = "# THIS INTERNAL COMMS ARTIFACT IS DEPRECATED."
    root.content = "* Please refer to Figjam on Glanceable Changes instead."

    entry1 = ReportEntry("summary 1", DetailsContainer())
    root.add(entry1)

    entry2 = ReportEntry("summary 2")
    root.add(entry2)

    entry3 = ReportEntry("summary 3", DetailsContainer())
    root.add(entry3)

    print(root.build())
