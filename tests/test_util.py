import os
from unittest import TestCase, mock

from piperider_cli import load_jinja_string_template


class TestUtil(TestCase):

    @mock.patch.dict(os.environ, {"dummy_env_text": "test", "dummy_env_number": str(1), "dummy_env_bool": str(True)})
    def test_load_jinja_string_template(self):
        val = "{{ env_var('dummy_env_text') | as_text }}"
        result = load_jinja_string_template(val).render()

        self.assertEqual("test", result)

        val = "{{ env_var('dummy_env_number') | as_number }}"
        result = load_jinja_string_template(val).render()

        self.assertEqual('1', result)

        val = "{{ env_var('dummy_env_bool') | as_bool }}"
        result = load_jinja_string_template(val).render()

        self.assertEqual("True", result)

        val = "{{ env_var('dummy_env_none') }}"
        result = load_jinja_string_template(val).render()

        self.assertEqual("", result)

        val = "{{ env_var('dummy_env_none') | as_number }}"
        result = load_jinja_string_template(val).render()

        self.assertEqual("", result)

