import ast
import glob
import json
import os
import tempfile
from _ast import FunctionDef
from typing import Any, List
from unittest import TestCase

from piperider_cli.assertion_engine import AssertionEngine

EXCLUDES = ['assert_nothing_table_example', 'assert_nothing_column_example']


class BuiltinAssertionVisitor(ast.NodeTransformer):

    def __init__(self, output: List):
        self.output = output

    def visit_FunctionDef(self, node: FunctionDef) -> Any:
        if node.name.startswith('assert'):
            self.output.append(node.name)
        self.generic_visit(node)


def find_builtins_assertions(filename, ast_node):
    output = []
    BuiltinAssertionVisitor(output).visit(ast_node)
    return output


class DoYouWriteTheDocsTests(TestCase):

    def test_find_all_builtins(self):
        import piperider_cli

        search_root = os.path.dirname(piperider_cli.__file__)
        docs_root = os.path.abspath(os.path.join(search_root, '../docs/assertions'))
        not_founds = []

        for x in glob.glob(os.path.join(search_root, '**/*.py'), recursive=True):
            with open(x) as fh:
                assertion_functions = find_builtins_assertions(x, ast.parse(fh.read()))

                for func in assertion_functions:
                    # check docs

                    if func in EXCLUDES:
                        # ignore functions listed in the excludes
                        continue

                    docs_path = os.path.join(docs_root, f'{func}.md')
                    if not os.path.exists(docs_path):
                        not_founds.append((func, docs_path))

        for func, filename in not_founds:
            print(f'require docs for function [{func}] at {filename}')
        self.assertEqual([], not_founds)
