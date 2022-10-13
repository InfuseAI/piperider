import ast
import glob
import os
from unittest import TestCase


class DoYouWriteTheDocsTests(TestCase):

    def test_find_all_builtins(self):
        import piperider_cli

        search_root = os.path.dirname(piperider_cli.__file__)
        docs_root = os.path.abspath(os.path.join(search_root, '../docs/assertions'))
        not_founds = []

        from piperider_cli.assertion_engine.types import custom_registry
        assertion_functions = custom_registry.keys()

        for func in assertion_functions:
            # skip this due to docs structure change
            if func == 'assert_column_value':
                continue
            # check docs
            docs_path = os.path.join(docs_root, f'{func}.md')
            if not os.path.exists(docs_path):
                not_founds.append((func, docs_path))

        for func, filename in not_founds:
            print(f'require docs for function [{func}] at {filename}')
        self.assertEqual([], not_founds)
