import json
import os
import unittest
from unittest import TestCase

from piperider_cli.compare_report import ComparisonData
from packaging import version

from piperider_cli.dbt.list_task import dbt_version_obj

v = dbt_version_obj()


class TestCompareSummaryNG(TestCase):

    def setUp(self):
        self.maxDiff = None
        self.dbt_state_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mock_dbt_data")

    def manifest_path(self, manifest_name):
        return os.path.join(self.dbt_state_dir, manifest_name)

    def manifest_dict(self, manifest_name):
        with open(self.manifest_path(manifest_name)) as fh:
            return json.loads(fh.read())

    @unittest.skipIf(v < version.parse('1.4'), 'this only works after manifests generated after the v1.4')
    def test_in_memory_compare_with_manifests(self):
        run1 = self.manifest_dict("jaffle_shop_base.json")
        run2 = self.manifest_dict("jaffle_shop_target.json")

        data = ComparisonData(run1, run2, None)
        result = data.to_summary_markdown_ng()

        with open("output.md", "w") as fh:
            fh.write(result)

    def test_in_memory_compare_with_manifests_v_1_3(self):
        run1 = self.manifest_dict("jaffle_shop_base_1.3.json")
        run2 = self.manifest_dict("jaffle_shop_target_1.3.json")

        data = ComparisonData(run1, run2, None)
        result = data.to_summary_markdown_ng()

        with open("output_v1_3.md", "w") as fh:
            fh.write(result)

    @unittest.skipIf(v < version.parse('1.4'), 'this only works after manifests generated after the v1.4')
    def test_in_memory_compare_with_manifests_base_not_profiled(self):
        run1 = self.manifest_dict("case_base_not_profiled_1.json")
        run2 = self.manifest_dict("case_base_not_profiled_2.json")

        data = ComparisonData(run1, run2, None)
        result = data.to_summary_markdown_ng()

        with open("output.md", "w") as fh:
            fh.write(result)

    @unittest.skipIf(v < version.parse('1.4'), 'this only works after manifests generated after the v1.4')
    def test_in_memory_compare_with_manifests_target_not_profiled(self):
        run1 = self.manifest_dict("case_base_not_profiled_1.json")
        run2 = self.manifest_dict("case_base_not_profiled_2.json")

        data = ComparisonData(run2, run1, None)
        result = data.to_summary_markdown_ng()

        with open("output.md", "w") as fh:
            fh.write(result)
