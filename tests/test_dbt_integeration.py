import json
import os
import unittest
from typing import Dict
from unittest import TestCase

from packaging import version

from piperider_cli.dbt.list_task import (
    compare_models_between_manifests,
    dbt_version_obj, list_resources_from_manifest,
    ResourceSelector,
    load_manifest,
)
from piperider_cli.dbt.changeset import GraphDataChangeSet


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

    def run_object(self, run_name):
        with open(self.fake_data_path(run_name)) as fh:
            data = json.loads(fh.read())
            return data

    def load_json(self, filename: str) -> Dict:
        with open(self.fake_data_path(filename)) as fh:
            return json.loads(fh.read())

    def base_manifest(self):
        return self.manifest_object("jaffle_shop_base_1.3.json", True)

    def target_manifest(self):
        return self.manifest_object("jaffle_shop_target_1.3.json", True)

    def base_run(self):
        return self.run_object("jaffle_shop_base_1.3.json")

    def target_run(self):
        return self.run_object("jaffle_shop_target_1.3.json")

    def base_31587(self):
        return self.run_object("sc-31587-base.json")

    def target_31587(self):
        return self.run_object("sc-31587-input.json")

    def base_31587_with_ref(self):
        return self.run_object("sc-31587-with-ref-base.json")

    def target_31587_with_ref(self):
        return self.run_object("sc-31587-with-ref-input.json")

    def base_31587_metrics(self):
        return self.run_object("sc-31587-metrics-base.json")

    def target_31587_metrics(self):
        return self.run_object("sc-31587-metrics-input.json")

    def base_31782(self):
        return self.run_object("sc-31782-base.json")

    def target_31782(self):
        return self.run_object("sc-31782-target.json")


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

    def test_list_explicit_changes(self):
        c = GraphDataChangeSet(self.base_run(), self.target_run())

        expected = ['model.jaffle_shop.customers', 'model.jaffle_shop.orders',
                    'test.jaffle_shop.accepted_values_orders_status'
                    '__placed__shipped__completed__return_pending__returned.be6b5b5ec3',
                    'test.jaffle_shop.not_null_customers_customer_id.5c9bf9911d',
                    'test.jaffle_shop.not_null_orders_amount.106140f9fd',
                    'test.jaffle_shop.not_null_orders_bank_transfer_amount.7743500c49',
                    'test.jaffle_shop.not_null_orders_coupon_amount.ab90c90625',
                    'test.jaffle_shop.not_null_orders_credit_card_amount.d3ca593b59',
                    'test.jaffle_shop.not_null_orders_customer_id.c5f02694af',
                    'test.jaffle_shop.not_null_orders_gift_card_amount.413a0d2d7a',
                    'test.jaffle_shop.not_null_orders_order_id.cf6c17daed',
                    'test.jaffle_shop.relationships_orders_customer_id__customer_id__ref_customers_.c6ec7f58f2',
                    'test.jaffle_shop.unique_customers_customer_id.c5af1ff4b1',
                    'test.jaffle_shop.unique_orders_order_id.fed79b3a6e']
        changes = c.list_explicit_changes()
        self.assertListEqual(changes, expected)

        print(c.list_implicit_changes())

    @unittest.skipIf(dbt_version_obj() < version.parse('1.4'),
                     'this only works after manifests generated after the v1.4')
    def test_list_explicit_changes_without_ref_ids(self):
        c = GraphDataChangeSet(self.base_31587(), self.target_31587())

        expected = ['model.jaffle_shop.orders',
                    'test.jaffle_shop.accepted_values_orders_status__placed__shipped__completed__return_pending__returned.be6b5b5ec3',
                    'test.jaffle_shop.not_null_orders_amount.106140f9fd',
                    'test.jaffle_shop.not_null_orders_bank_transfer_amount.7743500c49',
                    'test.jaffle_shop.not_null_orders_coupon_amount.ab90c90625',
                    'test.jaffle_shop.not_null_orders_credit_card_amount.d3ca593b59',
                    'test.jaffle_shop.not_null_orders_customer_id.c5f02694af',
                    'test.jaffle_shop.not_null_orders_gift_card_amount.413a0d2d7a',
                    'test.jaffle_shop.not_null_orders_order_id.cf6c17daed',
                    'test.jaffle_shop.unique_orders_order_id.fed79b3a6e']
        changes = c.list_explicit_changes()
        self.assertListEqual(changes, expected)

        expected_implicit = ['metric.jaffle_shop.average_order_amount']
        self.assertListEqual(c.list_implicit_changes(), expected_implicit)

    @unittest.skipIf(dbt_version_obj() < version.parse('1.4'),
                     'this only works after manifests generated after the v1.4')
    def test_list_explicit_changes_with_ref_ids(self):
        c = GraphDataChangeSet(self.base_31587_with_ref(), self.target_31587_with_ref())

        expected = ['model.jaffle_shop.orders',
                    'test.jaffle_shop.accepted_values_orders_status__placed__shipped__completed__return_pending__returned.be6b5b5ec3',
                    'test.jaffle_shop.not_null_orders_amount.106140f9fd',
                    'test.jaffle_shop.not_null_orders_bank_transfer_amount.7743500c49',
                    'test.jaffle_shop.not_null_orders_coupon_amount.ab90c90625',
                    'test.jaffle_shop.not_null_orders_credit_card_amount.d3ca593b59',
                    'test.jaffle_shop.not_null_orders_customer_id.c5f02694af',
                    'test.jaffle_shop.not_null_orders_gift_card_amount.413a0d2d7a',
                    'test.jaffle_shop.not_null_orders_order_id.cf6c17daed',
                    'test.jaffle_shop.unique_orders_order_id.fed79b3a6e']
        changes = c.list_explicit_changes()
        self.assertListEqual(changes, expected)

        expected_implicit = ['metric.jaffle_shop.average_order_amount']
        self.assertListEqual(c.list_implicit_changes(), expected_implicit)

    @unittest.skipIf(dbt_version_obj() < version.parse('1.4'),
                     'this only works after manifests generated after the v1.4')
    def test_list_changes_metrics_case(self):
        c = GraphDataChangeSet(self.base_31587_metrics(), self.target_31587_metrics())
        expected = ['model.jaffle_shop.orders',
                    'test.jaffle_shop.accepted_values_orders_status__placed__shipped__completed__return_pending__returned.be6b5b5ec3',
                    'test.jaffle_shop.not_null_orders_amount.106140f9fd',
                    'test.jaffle_shop.not_null_orders_bank_transfer_amount.7743500c49',
                    'test.jaffle_shop.not_null_orders_coupon_amount.ab90c90625',
                    'test.jaffle_shop.not_null_orders_credit_card_amount.d3ca593b59',
                    'test.jaffle_shop.not_null_orders_customer_id.c5f02694af',
                    'test.jaffle_shop.not_null_orders_gift_card_amount.413a0d2d7a',
                    'test.jaffle_shop.not_null_orders_order_id.cf6c17daed',
                    'test.jaffle_shop.unique_orders_order_id.fed79b3a6e']
        changes = c.list_explicit_changes()
        self.assertListEqual(changes, expected)

        changes = c.list_implicit_changes()
        self.assertListEqual(c.list_implicit_changes(), ['metric.jaffle_shop.average_order_amount'])

    @unittest.skipIf(dbt_version_obj() < version.parse('1.4'),
                     'this only works after manifests generated after the v1.4')
    def test_list_large_seeds_case(self):
        try:
            c = GraphDataChangeSet(self.base_31782(), self.target_31782())
        except Exception as e:
            self.fail("Unexpected Exception")

        expected = ['metric.jaffle_shop.expenses',
                    'model.jaffle_shop.stg_payments',
                    'test.jaffle_shop.accepted_values_stg_payments_payment_method__credit_card__coupon__bank_transfer__gift_card.3c3820f278',
                    'test.jaffle_shop.not_null_stg_payments_payment_id.c19cc50075',
                    'test.jaffle_shop.unique_stg_payments_payment_id.3744510712']

        changes = c.list_explicit_changes()
        self.assertListEqual(changes, expected)
        changes = c.list_implicit_changes()
        self.assertListEqual(changes, ['metric.jaffle_shop.profit'])
