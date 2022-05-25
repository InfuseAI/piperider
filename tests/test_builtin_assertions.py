import json
import os
import tempfile
from unittest import TestCase


def build_test_assertions(assertion_config_text: str):
    assertions_dir = None
    with tempfile.NamedTemporaryFile() as tmp:
        assertions_dir = os.path.join(tmp.name, 'assertions')
    os.makedirs(assertions_dir, exist_ok=True)

    with open(os.path.join(assertions_dir, "assertions.yml"), "w") as fh:
        fh.write(assertion_config_text)
    return assertions_dir


class BuiltinAssertionsTests(TestCase):

    def setUp(self) -> None:
        from piperider_cli.assertion_engine import AssertionEngine
        assertions = """
        orders_1k:  # Table Name
          # Test Cases for Table
          tests:
          - name: assert_row_count
            assert:
              count: [1000, 200000]
            tags:
            - OPTIONAL
        """
        self.assertion_engine = AssertionEngine(None, build_test_assertions(assertions))
        self.assertion_engine.load_assertions()

        # load metrics
        metrics_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "orders_1k.json")
        with open(metrics_file) as fh:
            self.metrics = json.loads(fh.read())

    def test_assert_row_count(self):
        results, exceptions = self.assertion_engine.evaluate_all(self.metrics)
        self.assertEqual([], exceptions)

        assertion_result = results[0].result
        self.assertEqual(dict(success=True, exceptions=None),
                         dict(success=assertion_result._success, exceptions=assertion_result._exception))
