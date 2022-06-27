from io import StringIO
from unittest import TestCase

from ruamel import yaml

from piperider_cli.assertion_engine import AssertionEngine


def _(assertion_content: str):
    def content_provider(self):
        self.assertions_content = yaml.safe_load(StringIO(assertion_content))

    return content_provider


class BuiltinValidationTests(TestCase):

    def setUp(self) -> None:
        self.engine = AssertionEngine(None)
        self.origin_function = AssertionEngine.load_assertion_content

    def tearDown(self) -> None:
        AssertionEngine.load_assertion_content = self.origin_function

    def test_validation_assert_row_count_in_range(self):
        # test with valid format
        AssertionEngine.load_assertion_content = _("""
            orders_1k:  # Table Name
              # Test Cases for Table
              tests:
              - name: assert_row_count_in_range
                assert:
                  count: [1000, 200000]
                tags:
                - OPTIONAL
            """)

        # expect no errors and warnings
        self.engine.load_all_assertions_for_validation()
        results = self.engine.validate_assertions()
        self.assertListEqual([], results)

    def test_validation_assert_row_count_in_range_no_args(self):
        # test with valid format
        AssertionEngine.load_assertion_content = _("""
            orders_1k:  # Table Name
              # Test Cases for Table
              tests:
              - name: assert_row_count_in_range
                assert:
                  # it should be "count"
                  range: [1000, 200000]
                tags:
                - OPTIONAL
            """)

        # expect no errors and warnings
        self.engine.load_all_assertions_for_validation()
        results = self.engine.validate_assertions()
        self.assertEqual(1, len(results))

        self.assertEqual("""Found assertion syntax problem => name: assert_row_count_in_range for table orders_1k
ERROR: count parameter is required
ERROR: count parameter should be a list""", results[0].as_report())

    def test_validation_assert_row_count_in_range_invalid_args(self):
        # test with valid format
        AssertionEngine.load_assertion_content = _("""
            orders_1k:  # Table Name
              # Test Cases for Table
              tests:
              - name: assert_row_count_in_range
                assert:
                  count: [1000, 200000, 2]
                tags:
                - OPTIONAL
            """)

        # expect no errors and warnings
        self.engine.load_all_assertions_for_validation()
        results = self.engine.validate_assertions()
        self.assertEqual(1, len(results))

        self.assertEqual("""Found assertion syntax problem => name: assert_row_count_in_range for table orders_1k
ERROR: count parameter should contain two values""", results[0].as_report())

    def test_validation_assert_row_count(self):
        # test with valid format with min only
        AssertionEngine.load_assertion_content = _("""
            orders_1k:  # Table Name
              # Test Cases for Table
              tests:
              - name: assert_row_count
                assert:
                  min: 10
                tags:
                - OPTIONAL
            """)

        # expect no errors and warnings
        self.engine.load_all_assertions_for_validation()
        results = self.engine.validate_assertions()
        self.assertListEqual([], results)

        # test with valid format with max only
        AssertionEngine.load_assertion_content = _("""
            orders_1k:  # Table Name
              # Test Cases for Table
              tests:
              - name: assert_row_count
                assert:
                  max: 10
                tags:
                - OPTIONAL
            """)

        # expect no errors and warnings
        self.engine.load_all_assertions_for_validation()
        results = self.engine.validate_assertions()
        self.assertListEqual([], results)

        # test with valid format with min and max
        AssertionEngine.load_assertion_content = _("""
            orders_1k:  # Table Name
              # Test Cases for Table
              tests:
              - name: assert_row_count
                assert:
                  min: 10
                  max: 100
                tags:
                - OPTIONAL
            """)

        # expect no errors and warnings
        self.engine.load_all_assertions_for_validation()
        results = self.engine.validate_assertions()
        self.assertListEqual([], results)

    def test_validation_assert_row_count_invalid_args(self):
        # test with invalid syntax
        AssertionEngine.load_assertion_content = _("""
            orders_1k:  # Table Name
              # Test Cases for Table
              tests:
              - name: assert_row_count
                assert:
                  x: 10
                tags:
                - OPTIONAL
            """)

        # expect no errors and warnings
        self.engine.load_all_assertions_for_validation()
        results = self.engine.validate_assertions()
        self.assertEqual(1, len(results))
        self.assertEqual("""Found assertion syntax problem => name: assert_row_count for table orders_1k
ERROR: There should contain any parameter names in ['min', 'max']""", results[0].as_report())

        # test with invalid syntax: max < min
        AssertionEngine.load_assertion_content = _("""
            orders_1k:  # Table Name
              # Test Cases for Table
              tests:
              - name: assert_row_count
                assert:
                  min: 100
                  max: 1
                tags:
                - OPTIONAL
            """)

        # expect no errors and warnings
        self.engine.load_all_assertions_for_validation()
        results = self.engine.validate_assertions()
        self.assertEqual(1, len(results))

        self.assertEqual("""Found assertion syntax problem => name: assert_row_count for table orders_1k
ERROR: The max value should be greater than or equal to the min value.""", results[0].as_report())

        # test with invalid syntax: not int
        AssertionEngine.load_assertion_content = _("""
            orders_1k:  # Table Name
              # Test Cases for Table
              tests:
              - name: assert_row_count
                assert:
                  min: 1.0
                tags:
                - OPTIONAL
            """)

        # expect no errors and warnings
        self.engine.load_all_assertions_for_validation()
        results = self.engine.validate_assertions()
        self.assertEqual(1, len(results))

        self.assertEqual("""Found assertion syntax problem => name: assert_row_count for table orders_1k
ERROR: min parameter should be a int value""", results[0].as_report())
