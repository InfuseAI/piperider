import json
import os
import shutil
import tempfile
import uuid
from unittest import TestCase

from piperider_cli.assertion_engine import AssertionContext, AssertionResult


def prepare_project_structure(assertion_config_text: str):
    with tempfile.NamedTemporaryFile() as tmp:
        pass

    assertions_dir = os.path.join(tmp.name, 'assertions')
    os.makedirs(assertions_dir, exist_ok=True)

    plugins_dir = os.path.join(tmp.name, 'plugins')
    os.makedirs(plugins_dir, exist_ok=True)

    irregular_plugins_dir = os.path.join(tmp.name, 'irregular-plugins-path')
    os.makedirs(irregular_plugins_dir, exist_ok=True)

    with open(os.path.join(assertions_dir, "assertions.yml"), "w") as fh:
        fh.write(assertion_config_text)

    return dict(assertions=assertions_dir, plugins=plugins_dir, irregular_plugins=irregular_plugins_dir)


def assert_foobarbar(context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
    context.result.actual = 'I see you'
    context.result._expected = dict(magic_number=5566)
    return context.result.success()


class UserDefinedTestAssertionsTests(TestCase):

    def setUp(self) -> None:
        from piperider_cli.assertion_engine import AssertionEngine

        self.current_module_name = uuid.uuid4().hex.replace('-', '_')
        assertions = f"""
        foobarbar:
          tests:
          - name: {self.current_module_name}.{assert_foobarbar.__name__}
            assert:
              param1: a
              param2: b
        """
        self.project_dirs = prepare_project_structure(assertions)
        self.assertion_engine = AssertionEngine(None, self.project_dirs['assertions'])
        self.assertion_engine.load_assertions()

        # load metrics
        self.metrics = {}
        print("plugin: ", self.current_module_name)

    def test_user_defined_test_invoked_from_env_PIPERIDER_PLUGINS(self):
        os.environ['PIPERIDER_PLUGINS'] = self.project_dirs['irregular_plugins']
        print("PIPERIDER_PLUGINS => ", os.environ['PIPERIDER_PLUGINS'])
        # copy this file to PIPERIDER_PLUGINS
        shutil.copyfile(__file__,
                        os.path.join(self.project_dirs['irregular_plugins'], f'{self.current_module_name}.py'))

        results, exceptions = self.assertion_engine.evaluate_all(self.metrics)
        self.assertEqual([], exceptions)

        assertion_result = results[0].result
        self.assertEqual(dict(success=True, exceptions=None),
                         dict(success=assertion_result._success, exceptions=assertion_result._exception))
        self.assertEqual(assertion_result.actual, 'I see you')
        self.assertEqual(assertion_result.expected(), {'magic_number': 5566})

    def test_user_defined_test_invoked_from_default_plugins_dir(self):
        # copy this file to plugins
        shutil.copyfile(__file__, os.path.join(self.project_dirs['plugins'], f'{self.current_module_name}.py'))
        results, exceptions = self.assertion_engine.evaluate_all(self.metrics)
        self.assertEqual([], exceptions)

        assertion_result = results[0].result
        self.assertEqual(dict(success=True, exceptions=None),
                         dict(success=assertion_result._success, exceptions=assertion_result._exception))
        self.assertEqual(assertion_result.actual, 'I see you')
        self.assertEqual(assertion_result.expected(), {'magic_number': 5566})
