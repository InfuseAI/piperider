import ast
import glob
import os
from _ast import AST, FunctionDef, Attribute
from typing import Any
from unittest import TestCase


class TrackCommandSetupTests(TestCase):

    def test_command_options(self):
        """
        find all decorators in the cli, like this
        @cli.command(short_help='Show version information.', cls=TrackCommand)

        to check "cls=TrackCommand" has set
        """

        import piperider_cli.cli as cli

        root = ast.parse(open(cli.__file__).read(), cli.__file__)

        results = []

        class V(ast.NodeVisitor):
            def visit_FunctionDef(self, node: FunctionDef) -> Any:
                if not node.decorator_list:
                    return

                for d in node.decorator_list:

                    # check command decorator: @*.command( ...[keywords]...)
                    is_command_decorator = hasattr(d, 'func') \
                                           and isinstance(d.func, Attribute) and d.func.attr == 'command'
                    if not is_command_decorator:
                        continue

                    has_track_setup = False

                    # check keywords has "cls"
                    for k in d.keywords:
                        if k.arg == 'cls' and k.value.id == 'TrackCommand':
                            has_track_setup = True

                    results.append((d, has_track_setup))

        # check the @cli.command
        V().visit(root)

        require_actions = [(node, result) for node, result in results if result != True]
        if require_actions:
            print(r'Please add "cls=TrackCommand" to @cli.command')
            for node, result in require_actions:
                print(f"line {node.lineno} => {ast.unparse(node)}")

            self.assert_(False, r'Please add "cls=TrackCommand" to @cli.command')
