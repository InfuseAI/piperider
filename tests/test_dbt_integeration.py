import json
import os
import unittest
from typing import Dict
from unittest import TestCase

from dbt.exceptions import EventCompilationError

from piperider_cli.dbt.list_task import compare_models_between_manifests, \
    list_resources_from_manifest, \
    ResourceSelector, load_manifest


def list_resources_from_manifest_file(filepath: str, selector=None):
    with open(filepath) as f1:
        d1 = json.loads(f1.read())
    return list_resources_from_manifest(load_manifest(d1), selector)


def compare_models_between_manifests_files(file1: str, file2: str, include_downstream: bool = False):
    with open(file1) as f1:
        d1 = json.loads(f1.read())
    with open(file2) as f2:
        d2 = json.loads(f2.read())
    return compare_models_between_manifests(load_manifest(d1), load_manifest(d2), include_downstream)


class _BaseDbtTest(TestCase):

    def setUp(self):
        self.maxDiff = None
        self.dbt_state_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mock_dbt_data")

    def fake_data_path(self, filename: str):
        return os.path.join(self.dbt_state_dir, filename)

    def manifest_object(self, manifest_name):
        with open(self.fake_data_path(manifest_name)) as fh:
            return load_manifest(json.loads(fh.read()))

    def load_json(self, filename: str) -> Dict:
        with open(self.fake_data_path(filename)) as fh:
            return json.loads(fh.read())


class TestDbtIntegration(_BaseDbtTest):

    def setUp(self):
        super().setUp()

    def test_list_all_resources(self):
        expected = [
            "jaffle_shop.customers",
            "jaffle_shop.orders",
            "jaffle_shop.staging.stg_customers",
            "jaffle_shop.staging.stg_orders",
            "jaffle_shop.staging.stg_payments",
            "jaffle_shop.raw_customers",
            "jaffle_shop.raw_orders",
            "jaffle_shop.raw_payments",
            "jaffle_shop.accepted_values_orders_status__placed__shipped__completed__return_pending__returned",
            "jaffle_shop.staging.accepted_values_stg_orders_status__placed__shipped__completed__return_pending__returned",
            "jaffle_shop.staging.accepted_values_stg_payments_payment_method__credit_card__coupon__bank_transfer__gift_card",
            "jaffle_shop.not_null_customers_customer_id",
            "jaffle_shop.not_null_orders_amount",
            "jaffle_shop.not_null_orders_bank_transfer_amount",
            "jaffle_shop.not_null_orders_coupon_amount",
            "jaffle_shop.not_null_orders_credit_card_amount",
            "jaffle_shop.not_null_orders_customer_id",
            "jaffle_shop.not_null_orders_gift_card_amount",
            "jaffle_shop.not_null_orders_order_id",
            "jaffle_shop.staging.not_null_stg_customers_customer_id",
            "jaffle_shop.staging.not_null_stg_orders_order_id",
            "jaffle_shop.staging.not_null_stg_payments_payment_id",
            "jaffle_shop.relationships_orders_customer_id__customer_id__ref_customers_",
            "jaffle_shop.unique_customers_customer_id",
            "jaffle_shop.unique_orders_order_id",
            "jaffle_shop.staging.unique_stg_customers_customer_id",
            "jaffle_shop.staging.unique_stg_orders_order_id",
            "jaffle_shop.staging.unique_stg_payments_payment_id"
        ]
        all_results = list_resources_from_manifest_file(self.fake_data_path('dbt-list-base-manifest.json'))
        self.assertListEqual(expected, all_results)

    def test_list_models(self):
        expected = [
            "jaffle_shop.customers",
            "jaffle_shop.orders",
            "jaffle_shop.staging.stg_customers",
            "jaffle_shop.staging.stg_orders",
            "jaffle_shop.staging.stg_payments",
        ]
        all_results = list_resources_from_manifest_file(self.fake_data_path('dbt-list-base-manifest.json'),
                                                        ResourceSelector().model())
        self.assertListEqual(expected, all_results)

    def test_list_seeds(self):
        expected = [
            "jaffle_shop.raw_customers",
            "jaffle_shop.raw_orders",
            "jaffle_shop.raw_payments",
        ]
        all_results = list_resources_from_manifest_file(self.fake_data_path('dbt-list-base-manifest.json'),
                                                        ResourceSelector().seed())
        self.assertListEqual(expected, all_results)

    @unittest.skip('not all dbt-core raise this exceptions')
    def test_list_sources(self):
        with self.assertRaises(EventCompilationError) as r:
            list_resources_from_manifest_file(self.fake_data_path('dbt-list-base-manifest.json'),
                                              ResourceSelector().source())
        self.assertEqual(r.exception.msg, 'No nodes selected!')

    def test_list_between_files_and_object(self):
        expected = [
            "jaffle_shop.raw_customers",
            "jaffle_shop.raw_orders",
            "jaffle_shop.raw_payments",
        ]
        r1 = list_resources_from_manifest_file(self.fake_data_path('dbt-list-base-manifest.json'),
                                               ResourceSelector().seed())
        r2 = list_resources_from_manifest(self.manifest_object("dbt-list-base-manifest.json"),
                                          ResourceSelector().seed())

        self.assertEqual(expected, r1)
        self.assertEqual(expected, r2)

    def test_compare_with_manifests(self):
        without_downstream = compare_models_between_manifests_files(
            self.fake_data_path("dbt-list-base-manifest.json"), self.fake_data_path("dbt-list-altered-manifest.json"))

        expected = ['jaffle_shop.staging.stg_customers']
        self.assertListEqual(without_downstream, expected)

        with_downstream = compare_models_between_manifests_files(
            self.fake_data_path("dbt-list-base-manifest.json"), self.fake_data_path("dbt-list-altered-manifest.json"),
            True)

        expected = ['jaffle_shop.customers', 'jaffle_shop.staging.stg_customers']
        self.assertListEqual(with_downstream, expected)

    def test_in_memory_compare_with_manifests(self):
        result1 = compare_models_between_manifests_files(
            self.fake_data_path("dbt-list-base-manifest.json"), self.fake_data_path("dbt-list-altered-manifest.json"))

        result2 = compare_models_between_manifests(
            self.manifest_object("dbt-list-base-manifest.json"), self.manifest_object("dbt-list-altered-manifest.json"))

        self.assertEqual(result1, result2)
