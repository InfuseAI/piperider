import json
import os
import tempfile
from unittest import TestCase

from piperider_cli.assertion_engine import AssertionEngine

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
        # load metrics
        metrics_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "orders_1k.json")
        with open(metrics_file) as fh:
            self.metrics = json.loads(fh.read())

    def test_assert_row_count(self):
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

        results, exceptions = self.assertion_engine.evaluate_all(self.metrics)
        self.assertEqual([], exceptions)

        assertion_result = results[0].result
        self.assertEqual(dict(success=True, exceptions=None),
                         dict(success=assertion_result._success, exceptions=assertion_result._exception))

    def test_assert_column_type(self):
        assertions = """
        orders_1k:  # Table Name
          # Test Cases for Table
          columns:
            o_totalprice:
              tests:
              - name: assert_column_type
                assert:
                  type: numeric
                tags:
                - OPTIONAL
            o_orderdate:
              tests:
              - name: assert_column_type
                assert:
                  type: datetime
                tags:
                - OPTIONAL
            o_orderpriority:
              tests:
              - name: assert_column_type
                assert:
                  type: string
                tags:
                - OPTIONAL
        """
        self.assertion_engine = AssertionEngine(None, build_test_assertions(assertions))
        self.assertion_engine.load_assertions()

        results, exceptions = self.assertion_engine.evaluate_all(self.metrics)
        self.assertEqual([], exceptions)

        for result in results:
            assertion_result = result.result
            self.assertEqual(dict(success=True, exceptions=None),
                             dict(success=assertion_result._success, exceptions=assertion_result._exception))

    def test_assert_column_in_range(self):
        assertions = """
        orders_1k:  # Table Name
          # Test Cases for Table
          columns:
            o_totalprice:
              tests:
              - name: assert_column_min_in_range
                assert:
                  min: [1000, 1200]
                tags:
                - OPTIONAL
              - name: assert_column_max_in_range
                assert:
                  max: [440000, 450000]
                tags:
                - OPTIONAL
        """
        self.assertion_engine = AssertionEngine(None, build_test_assertions(assertions))
        self.assertion_engine.load_assertions()

        results, exceptions = self.assertion_engine.evaluate_all(self.metrics)
        self.assertEqual([], exceptions)

        for result in results:
            assertion_result = result.result
            self.assertEqual(dict(success=True, exceptions=None),
                             dict(success=assertion_result._success, exceptions=assertion_result._exception))

    def test_assert_column_not_null(self):
        assertions = """
        orders_1k:  # Table Name
          # Test Cases for Table
          columns:
            o_totalprice:
              tests:
              - name: assert_column_not_null
                tags:
                - OPTIONAL
        """
        self.assertion_engine = AssertionEngine(None, build_test_assertions(assertions))
        self.assertion_engine.load_assertions()

        results, exceptions = self.assertion_engine.evaluate_all(self.metrics)
        self.assertEqual([], exceptions)

        for result in results:
            assertion_result = result.result
            self.assertEqual(dict(success=True, exceptions=None),
                             dict(success=assertion_result._success, exceptions=assertion_result._exception))

    def test_assert_column_unique(self):
        assertions = """
        orders_1k:  # Table Name
          # Test Cases for Table
          columns:
            o_totalprice:
              tests:
              - name: assert_column_unique
                tags:
                - OPTIONAL
        """
        self.assertion_engine = AssertionEngine(None, build_test_assertions(assertions))
        self.assertion_engine.load_assertions()

        results, exceptions = self.assertion_engine.evaluate_all(self.metrics)
        self.assertEqual([], exceptions)

        for result in results:
            assertion_result = result.result
            self.assertEqual(dict(success=True, exceptions=None),
                             dict(success=assertion_result._success, exceptions=assertion_result._exception))

    def test_assert_column_exist(self):
        assertions = """
        orders_1k:  # Table Name
          # Test Cases for Table
          columns:
            o_totalprice:
              tests:
              - name: assert_column_exist
                tags:
                - OPTIONAL
        """
        self.assertion_engine = AssertionEngine(None, build_test_assertions(assertions))
        self.assertion_engine.load_assertions()

        results, exceptions = self.assertion_engine.evaluate_all(self.metrics)
        self.assertEqual([], exceptions)

        for result in results:
            assertion_result = result.result
            self.assertEqual(dict(success=True, exceptions=None),
                             dict(success=assertion_result._success, exceptions=assertion_result._exception))
