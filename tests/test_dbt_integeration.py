import json
import os
from typing import Dict
from unittest import TestCase

from piperider_cli.dbt.list_task import (
    compare_models_between_manifests,
    list_resources_from_manifest,
    ResourceSelector,
    load_manifest,
)


class _BaseDbtTest(TestCase):
    def setUp(self):
        self.maxDiff = None
        self.dbt_state_dir = os.path.join(
            os.path.dirname(os.path.abspath(__file__)), "mock_dbt_data"
        )

    def fake_data_path(self, filename: str):
        return os.path.join(self.dbt_state_dir, filename)

    def manifest_object(self, manifest_name, embedded_from_run=False):
        with open(self.fake_data_path(manifest_name)) as fh:
            data = json.loads(fh.read())
            if embedded_from_run:
                data = data.get("dbt", {}).get("manifest", {})
            return load_manifest(data)

    def load_json(self, filename: str) -> Dict:
        with open(self.fake_data_path(filename)) as fh:
            return json.loads(fh.read())

    def base_manifest(self):
        return self.manifest_object("jaffle_shop_base_1.3.json", True)

    def target_manifest(self):
        return self.manifest_object("jaffle_shop_target_1.3.json", True)


class TestDbtIntegration(_BaseDbtTest):
    def setUp(self):
        super().setUp()

    def test_list_all_resources(self):
        expected = [
            "metric:jaffle_shop.revenue",
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
            "jaffle_shop.staging.unique_stg_payments_payment_id",
        ]
        all_results = list_resources_from_manifest(self.base_manifest())

        self.assertListEqual(expected, all_results)

    def test_list_models(self):
        expected = [
            "jaffle_shop.customers",
            "jaffle_shop.orders",
            "jaffle_shop.staging.stg_customers",
            "jaffle_shop.staging.stg_orders",
            "jaffle_shop.staging.stg_payments",
        ]
        all_results = list_resources_from_manifest(
            self.base_manifest(), ResourceSelector().model()
        )
        self.assertListEqual(expected, all_results)

    def test_list_seeds(self):
        expected = [
            "jaffle_shop.raw_customers",
            "jaffle_shop.raw_orders",
            "jaffle_shop.raw_payments",
        ]
        all_results = list_resources_from_manifest(
            self.base_manifest(), ResourceSelector().seed()
        )
        self.assertListEqual(expected, all_results)

    def test_compare_with_manifests(self):
        without_downstream = compare_models_between_manifests(
            self.base_manifest(), self.target_manifest()
        )

        expected = ["jaffle_shop.customers", "jaffle_shop.orders"]
        self.assertListEqual(without_downstream, expected)

        with_downstream = compare_models_between_manifests(
            self.base_manifest(), self.target_manifest(), True
        )

        expected = ["jaffle_shop.customers", "jaffle_shop.orders"]
        self.assertListEqual(with_downstream, expected)
