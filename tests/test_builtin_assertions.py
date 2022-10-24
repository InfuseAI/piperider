import json
import os
import tempfile
from unittest import TestCase

from sqlalchemy import create_engine, MetaData, Table, Column, Integer

from piperider_cli.assertion_engine import AssertionEngine


def build_test_assertions(assertion_config_text: str):
    assertions_dir = None
    with tempfile.NamedTemporaryFile() as tmp:
        assertions_dir = os.path.join(tmp.name, 'assertions')
    os.makedirs(assertions_dir, exist_ok=True)

    with open(os.path.join(assertions_dir, "assertions.yml"), "w") as fh:
        fh.write(assertion_config_text)
    return assertions_dir


def build_assertion_engine(table, profiler_result, assertions):
    db_engine = create_engine('sqlite://')
    metadata = MetaData()
    Table(table, metadata, Column('misc', Integer))
    metadata.create_all(db_engine)

    engine = AssertionEngine(db_engine, build_test_assertions(assertions))
    engine.load_assertions(profiler_result=profiler_result, config_path=None)
    return engine


class BuiltinAssertionsTests(TestCase):

    def setUp(self) -> None:
        # load metrics
        metrics_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "orders_1k.json")
        with open(metrics_file) as fh:
            self.metrics = json.loads(fh.read())

    def test_assert_row_count_in_range2(self):
        assertions = """
        orders_1k:  # Table Name
          # Test Cases for Table
          tests:
          - name: assert_row_count_in_range
            assert:
              count: [1000, 200000.5]
            tags:
            - OPTIONAL
        """
        engine = build_assertion_engine('orders_1k', self.metrics, assertions)
        results = engine.validate_assertions()

        self.assertEqual(1, len(results))

        self.assertEqual('Found assertion syntax problem => name: assert_row_count_in_range for table '
                         'orders_1k\n'
                         "ERROR: count parameter should be one of the types {<class 'int'>}, input: "
                         '[1000, 200000.5]',
                         results[0].as_internal_report())

    def test_assert_row_count_in_range(self):
        assertions = """
        orders_1k:  # Table Name
          # Test Cases for Table
          tests:
          - name: assert_row_count_in_range
            assert:
              count: [1000, 200000]
            tags:
            - OPTIONAL
        """
        engine = build_assertion_engine('orders_1k', self.metrics, assertions)

        results, exceptions = engine.evaluate_all()
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
        engine = build_assertion_engine('orders_1k', self.metrics, assertions)

        results, exceptions = engine.evaluate_all()
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
              - name: assert_column_in_range
                assert:
                  range: [0, 450000]
                tags:
                - OPTIONAL
        """
        engine = build_assertion_engine('orders_1k', self.metrics, assertions)

        results, exceptions = engine.evaluate_all()
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
        engine = build_assertion_engine('orders_1k', self.metrics, assertions)

        results, exceptions = engine.evaluate_all()
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
        engine = build_assertion_engine('orders_1k', self.metrics, assertions)

        results, exceptions = engine.evaluate_all()
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
        engine = build_assertion_engine('orders_1k', self.metrics, assertions)

        results, exceptions = engine.evaluate_all()
        self.assertEqual([], exceptions)

        for result in results:
            assertion_result = result.result
            self.assertEqual(dict(success=True, exceptions=None),
                             dict(success=assertion_result._success, exceptions=assertion_result._exception))

    def test_assert_column_value_range(self):
        assertions = """
        orders_1k:  # Table Name
          columns:
            o_totalprice:
              tests:
              - name: assert_column_value
                assert:
                  lte: 440269.51
                  gte: 1106.99
                tags:
                - OPTIONAL
        """
        engine = build_assertion_engine('orders_1k', self.metrics, assertions)
        results, exceptions = engine.evaluate_all()
        self.assertEqual([], exceptions)

        assertion_result = results[0].result
        self.assertEqual(dict(success=True, exceptions=None),
                         dict(success=assertion_result._success, exceptions=assertion_result._exception))

    def test_assert_column_value_set(self):
        assertions = """
        orders_1k:  # Table Name
          columns:
            o_orderstatus:
              tests:
              - name: assert_column_value
                assert:
                  in: ['O', 'F', 'P']
                tags:
                - OPTIONAL
        """
        engine = build_assertion_engine('orders_1k', self.metrics, assertions)
        results, exceptions = engine.evaluate_all()
        self.assertEqual([], exceptions)

        assertion_result = results[0].result
        self.assertEqual(dict(success=True, exceptions=None),
                         dict(success=assertion_result._success, exceptions=assertion_result._exception))
