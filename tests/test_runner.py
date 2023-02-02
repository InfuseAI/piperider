import os
from unittest import TestCase

from piperider_cli.runner import _filter_subject


class TestRunner(TestCase):

    def test_filter_subject(self):
        self.assertTrue(_filter_subject('a', None, None))
        self.assertTrue(_filter_subject('a', ['a', 'b'], None))
        self.assertFalse(_filter_subject('a', [], None))
        self.assertFalse(_filter_subject('a', None, ['a', 'b']))
        self.assertTrue(_filter_subject('a', None, []))
        self.assertFalse(_filter_subject('a', ['a'], ['a']))
        self.assertTrue(_filter_subject('a', ['a'], ['b']))
        self.assertTrue(_filter_subject('a', ['A'], ['B']))
