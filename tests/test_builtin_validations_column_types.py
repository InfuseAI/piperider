from io import StringIO
from unittest import TestCase

from ruamel import yaml

from piperider_cli.assertion_engine import AssertionEngine


def _(assertion_content: str):
    def content_provider(self):
        self.assertions_content = yaml.safe_load(StringIO(assertion_content))
        return [], []

    return content_provider


class BuiltinValidationColumnTypesTests(TestCase):

    def setUp(self) -> None:
        self.engine = AssertionEngine(None)
        self.origin_function = AssertionEngine.load_assertion_content

    def tearDown(self) -> None:
        AssertionEngine.load_assertion_content = self.origin_function

    def test_validation_assert_column_schema_type(self):
        # test with valid format
        AssertionEngine.load_assertion_content = _("""
            column_types:
              columns:
                column_a:
                  tests:
                  - name: assert_column_schema_type
                    assert:
                      schema_type: JSON
                    tags:
                    - OPTIONAL
            """)

        self.engine.load_all_assertions_for_validation()
        results = self.engine.validate_assertions()
        self.assertListEqual([], results)

        # test with invalid format
        AssertionEngine.load_assertion_content = _("""
            column_types:
              columns:
                column_a:
                  tests:
                  - name: assert_column_schema_type
                    tags:
                    - OPTIONAL
            """)

        self.engine.load_all_assertions_for_validation()
        results = self.engine.validate_assertions()
        self.assertEqual(results[0].as_internal_report(), r"""
Found assertion syntax problem => name: assert_column_schema_type for table column_types and column column_a
ERROR: schema_type parameter is required
ERROR: schema_type parameter should be a <class 'str'> value
        """.strip())

    def test_validation_assert_column_type(self):
        # test with valid format
        AssertionEngine.load_assertion_content = _("""
            column_types:
              columns:
                column_a:
                  tests:
                  - name: assert_column_type
                    assert:
                      type: string
                    tags:
                    - OPTIONAL
            """)

        self.engine.load_all_assertions_for_validation()
        results = self.engine.validate_assertions()
        self.assertListEqual([], results)

        # test with invalid format
        AssertionEngine.load_assertion_content = _("""
            column_types:
              columns:
                column_a:
                  tests:
                  - name: assert_column_type
                    assert:
                      type: foobarbar
                    tags:
                    - OPTIONAL
            """)

        self.engine.load_all_assertions_for_validation()
        results = self.engine.validate_assertions()
        self.assertEqual(results[0].as_internal_report(), r"""
Found assertion syntax problem => name: assert_column_type for table column_types and column column_a
ERROR: type parameter should be one of ['string', 'integer', 'numeric', 'datetime', 'date', 'time', 'boolean', 'other'], input: foobarbar
        """.strip())

    def test_validation_assert_column_in_types(self):
        # test with valid format
        AssertionEngine.load_assertion_content = _("""
            column_types:
              columns:
                column_a:
                  tests:
                  - name: assert_column_in_types
                    assert:
                      types: [string]
                    tags:
                    - OPTIONAL
            """)

        self.engine.load_all_assertions_for_validation()
        results = self.engine.validate_assertions()
        self.assertListEqual([], results)

        # test with invalid format
        AssertionEngine.load_assertion_content = _("""
            column_types:
              columns:
                column_a:
                  tests:
                  - name: assert_column_in_types
                    assert:
                      types: [foobarbar]
                    tags:
                    - OPTIONAL
            """)

        self.engine.load_all_assertions_for_validation()
        results = self.engine.validate_assertions()
        self.assertEqual(results[0].as_internal_report(), r"""
Found assertion syntax problem => name: assert_column_in_types for table column_types and column column_a
ERROR: types parameter should be one of ['string', 'integer', 'numeric', 'datetime', 'date', 'time', 'boolean', 'other'], input: ['foobarbar']
        """.strip())
