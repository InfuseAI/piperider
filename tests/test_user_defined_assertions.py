import json
import os
import shutil
import tempfile
import uuid
from unittest import TestCase

from piperider_cli.assertion_engine import AssertionContext, AssertionResult, AssertionEngine


def prepare_project_structure():
    from piperider_cli.workspace import _generate_piperider_workspace

    with tempfile.NamedTemporaryFile() as tmp:
        # tmp will be removed after exiting context
        pass
    os.makedirs(tmp.name, exist_ok=True)
    os.chdir(tmp.name)
    _generate_piperider_workspace()

    return tmp.name


def generate_random_directory():
    with tempfile.NamedTemporaryFile() as tmp:
        pass
    os.makedirs(tmp.name, exist_ok=True)
    return tmp.name


def build_assertion_engine(project_dir, assertions):
    assertion_file = f'{uuid.uuid4().hex}.yml'
    assertion_path = os.path.join(f'{project_dir}/{AssertionEngine.PIPERIDER_WORKSPACE_NAME}/assertions',
                                  assertion_file)

    with open(assertion_path, 'w') as fh:
        fh.write(assertions)

    engine = AssertionEngine(None, project_dir)
    engine.load_assertions()
    return engine


def assert_foobarbar(context: AssertionContext, table: str, column: str, metrics: dict) -> AssertionResult:
    context.result.actual = 'I see you'
    context.result._expected = dict(magic_number=5566)
    return context.result.success()


class UserDefinedTestAssertionsTests(TestCase):

    def setUp(self) -> None:
        self.project_dir = prepare_project_structure()

        # reset the plugin path for testing
        AssertionEngine.PIPERIDER_ASSERTION_PLUGIN_PATH = os.path.join(f'{self.project_dir}',
                                                                       AssertionEngine.PIPERIDER_WORKSPACE_NAME,
                                                                       'plugins')

        # generate a random module name for user defined tests
        self.current_module_name = uuid.uuid4().hex.replace('-', '_')

    def test_user_defined_test_from_default_plugin_path(self):
        # put the user defined test function
        shutil.copyfile(__file__, os.path.join(f'{AssertionEngine.PIPERIDER_ASSERTION_PLUGIN_PATH}',
                                               f'{self.current_module_name}.py'))

        # use the function in the assertion configuration
        assertions = f"""
        foobarbar:
          tests:
          - name: {self.current_module_name}.{assert_foobarbar.__name__}
            assert:
              param1: a
              param2: b
        """
        engine = build_assertion_engine(self.project_dir, assertions)

        # invoke customized assertion
        results, exceptions = engine.evaluate_all({})

        # check no exceptions
        self.assertEqual([], exceptions)

        # check result
        assertion_result = results[0].result
        self.assertEqual(dict(success=True, exceptions=None),
                         dict(success=assertion_result._success, exceptions=assertion_result._exception))
        self.assertEqual(assertion_result.actual, 'I see you')
        self.assertEqual(assertion_result.expected(), {'magic_number': 5566})

    def test_user_defined_test_invoked_from_env_PIPERIDER_PLUGINS(self):
        random_dir = generate_random_directory()

        os.environ['PIPERIDER_PLUGINS'] = random_dir
        print("PIPERIDER_PLUGINS => ", os.environ['PIPERIDER_PLUGINS'])
        # copy this file to PIPERIDER_PLUGINS
        shutil.copyfile(__file__,
                        os.path.join(random_dir, f'{self.current_module_name}.py'))

        # use the function in the assertion configuration
        assertions = f"""
        foobarbar:
          tests:
          - name: {self.current_module_name}.{assert_foobarbar.__name__}
            assert:
              param1: a
              param2: b
        """
        engine = build_assertion_engine(self.project_dir, assertions)

        # invoke customized assertion
        results, exceptions = engine.evaluate_all({})
        self.assertEqual([], exceptions)

        assertion_result = results[0].result
        self.assertEqual(dict(success=True, exceptions=None),
                         dict(success=assertion_result._success, exceptions=assertion_result._exception))
        self.assertEqual(assertion_result.actual, 'I see you')
        self.assertEqual(assertion_result.expected(), {'magic_number': 5566})
