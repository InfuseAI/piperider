import json
import os
from unittest import TestCase

from dbt.exceptions import EventCompilationError

import piperider_cli.dbtutil as dbtutil
from piperider_cli.datasource.sqlite import SqliteDataSource
from piperider_cli.profiler import Profiler
from tests.common import create_table
from piperider_cli.dbt.list_task import compare_models_between_manifests, compare_models_between_manifests_files, \
    list_resources_from_manifest, list_resources_from_manifest_file, \
    ResourceSelector, load_manifest, load_manifest_from_file


class TestDbtIntegration(TestCase):

    def setUp(self):
        self.maxDiff = None
        self.dbt_state_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mock_dbt_data")

    def manifest_path(self, manifest_name):
        return os.path.join(self.dbt_state_dir, manifest_name)

    def manifest_object(self, manifest_name):
        with open(self.manifest_path(manifest_name)) as fh:
            return load_manifest(json.loads(fh.read()))

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
        all_results = list_resources_from_manifest_file(self.manifest_path('dbt-list-base-manifest.json'))
        self.assertListEqual(expected, all_results)

    def test_list_models(self):
        expected = [
            "jaffle_shop.customers",
            "jaffle_shop.orders",
            "jaffle_shop.staging.stg_customers",
            "jaffle_shop.staging.stg_orders",
            "jaffle_shop.staging.stg_payments",
        ]
        all_results = list_resources_from_manifest_file(self.manifest_path('dbt-list-base-manifest.json'),
                                                        ResourceSelector().model())
        self.assertListEqual(expected, all_results)

    def test_list_seeds(self):
        expected = [
            "jaffle_shop.raw_customers",
            "jaffle_shop.raw_orders",
            "jaffle_shop.raw_payments",
        ]
        all_results = list_resources_from_manifest_file(self.manifest_path('dbt-list-base-manifest.json'),
                                                        ResourceSelector().seed())
        self.assertListEqual(expected, all_results)

    def test_list_sources(self):
        with self.assertRaises(EventCompilationError) as r:
            list_resources_from_manifest_file(self.manifest_path('dbt-list-base-manifest.json'),
                                              ResourceSelector().source())
        self.assertEqual(r.exception.msg, 'No nodes selected!')

    def test_list_between_files_and_object(self):
        expected = [
            "jaffle_shop.raw_customers",
            "jaffle_shop.raw_orders",
            "jaffle_shop.raw_payments",
        ]
        r1 = list_resources_from_manifest_file(self.manifest_path('dbt-list-base-manifest.json'),
                                               ResourceSelector().seed())
        r2 = list_resources_from_manifest(self.manifest_object("dbt-list-base-manifest.json"),
                                          ResourceSelector().seed())

        self.assertEqual(expected, r1)
        self.assertEqual(expected, r2)

    def test_compare_with_manifests(self):
        without_downstream = compare_models_between_manifests_files(
            self.manifest_path("dbt-list-base-manifest.json"), self.manifest_path("dbt-list-altered-manifest.json"))

        expected = ['jaffle_shop.staging.stg_customers']
        self.assertListEqual(without_downstream, expected)

        with_downstream = compare_models_between_manifests_files(
            self.manifest_path("dbt-list-base-manifest.json"), self.manifest_path("dbt-list-altered-manifest.json"),
            True)

        expected = ['jaffle_shop.customers', 'jaffle_shop.staging.stg_customers']
        self.assertListEqual(with_downstream, expected)

    def test_in_memory_compare_with_manifests(self):
        result1 = compare_models_between_manifests_files(
            self.manifest_path("dbt-list-base-manifest.json"), self.manifest_path("dbt-list-altered-manifest.json"))

        result2 = compare_models_between_manifests(
            self.manifest_object("dbt-list-base-manifest.json"), self.manifest_object("dbt-list-altered-manifest.json"))

        self.assertEqual(result1, result2)

    def test_load_manifests(self):
        m1 = load_manifest_from_file(self.manifest_path("dbt-list-base-manifest.json"))
        with open(self.manifest_path("dbt-list-base-manifest.json")) as fh:
            m2 = load_manifest(json.loads(fh.read()))

        self.assertEqual(m1.to_dict(), m2.to_dict())
