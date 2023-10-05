import json
import os
import unittest
from typing import Dict, List
from unittest import TestCase

import pytest
from packaging import version

from piperider_cli.dbt import dbt_version
from piperider_cli.dbt.list_task import (
    compare_models_between_manifests,
    list_resources_unique_id_from_manifest,
    load_manifest,
)
from piperider_cli.dbt.changeset import GraphDataChangeSet
from tests.test_dbt_manifest_compatible import _load_manifest


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

    def base_run_1_6(self):
        return self.run_object("jaffle_shop_base_1_6.json")

    def target_run_1_6(self):
        return self.run_object("jaffle_shop_target_1_6.json")

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

    def assertDbtResources(self, r1: List[str], r2: List[str]):
        if dbt_version >= 'v1.6':
            r1 = [x for x in r1 if not x.startswith('metric')]
            r2 = [x for x in r2 if not x.startswith('metric')]
        return self.assertEqual(r1, r2)

    def test_list_all_resources(self):
        expected = [
            "metric.jaffle_shop.revenue",
            "model.jaffle_shop.customers",
            "model.jaffle_shop.orders",
            "model.jaffle_shop.stg_customers",
            "model.jaffle_shop.stg_orders",
            "model.jaffle_shop.stg_payments",
            "seed.jaffle_shop.raw_customers",
            "seed.jaffle_shop.raw_orders",
            "seed.jaffle_shop.raw_payments",
            "test.jaffle_shop.accepted_values_orders_status__placed__shipped__completed__return_pending__returned.be6b5b5ec3",
            "test.jaffle_shop.accepted_values_stg_orders_status__placed__shipped__completed__return_pending__returned.080fb20aad",
            "test.jaffle_shop.accepted_values_stg_payments_payment_method__credit_card__coupon__bank_transfer__gift_card.3c3820f278",
            "test.jaffle_shop.not_null_customers_customer_id.5c9bf9911d",
            "test.jaffle_shop.not_null_orders_amount.106140f9fd",
            "test.jaffle_shop.not_null_orders_bank_transfer_amount.7743500c49",
            "test.jaffle_shop.not_null_orders_coupon_amount.ab90c90625",
            "test.jaffle_shop.not_null_orders_credit_card_amount.d3ca593b59",
            "test.jaffle_shop.not_null_orders_customer_id.c5f02694af",
            "test.jaffle_shop.not_null_orders_gift_card_amount.413a0d2d7a",
            "test.jaffle_shop.not_null_orders_order_id.cf6c17daed",
            "test.jaffle_shop.not_null_stg_customers_customer_id.e2cfb1f9aa",
            "test.jaffle_shop.not_null_stg_orders_order_id.81cfe2fe64",
            "test.jaffle_shop.not_null_stg_payments_payment_id.c19cc50075",
            "test.jaffle_shop.relationships_orders_customer_id__customer_id__ref_customers_.c6ec7f58f2",
            "test.jaffle_shop.unique_customers_customer_id.c5af1ff4b1",
            "test.jaffle_shop.unique_orders_order_id.fed79b3a6e",
            "test.jaffle_shop.unique_stg_customers_customer_id.c7614daada",
            "test.jaffle_shop.unique_stg_orders_order_id.e3b841c71a",
            "test.jaffle_shop.unique_stg_payments_payment_id.3744510712",
        ]

        all_results = list_resources_unique_id_from_manifest(self.base_manifest())

        self.assertDbtResources(expected, all_results)

    @pytest.mark.skipif(dbt_version < 'v1.6', reason='skip manifest test before dbt-core 1.6')
    def test_list_all_resources_16(self):
        expected = [
            "metric.jaffle_shop.average_order_amount",
            "metric.jaffle_shop.expenses",
            "metric.jaffle_shop.profit",
            "metric.jaffle_shop.revenue",
            "model.jaffle_shop.int_customer_order_history_joined",
            "model.jaffle_shop.int_order_payments_pivoted",
            "model.jaffle_shop.metricflow_time_spine",
            "model.jaffle_shop.orders",
            "model.jaffle_shop.stg_customers",
            "model.jaffle_shop.stg_orders",
            "model.jaffle_shop.stg_payments",
            "seed.jaffle_shop.raw_customers",
            "seed.jaffle_shop.raw_orders",
            "seed.jaffle_shop.raw_payments",
            "semantic_model.jaffle_shop.orders",
            "test.jaffle_shop.accepted_values_int_order_payments_pivoted_status__placed__shipped__completed__return_pending__returned.0ccdff53e8",
            "test.jaffle_shop.accepted_values_orders_status__placed__shipped__completed__return_pending__returned.be6b5b5ec3",
            "test.jaffle_shop.accepted_values_stg_orders_status__placed__shipped__completed__return_pending__returned.080fb20aad",
            "test.jaffle_shop.accepted_values_stg_payments_payment_method__credit_card__coupon__bank_transfer__gift_card.3c3820f278",
            "test.jaffle_shop.not_null_int_customer_order_history_joined_customer_id.5eeb8cdf92",
            "test.jaffle_shop.not_null_int_order_payments_pivoted_amount.b7598e0e3b",
            "test.jaffle_shop.not_null_int_order_payments_pivoted_bank_transfer_amount.1a9e62933b",
            "test.jaffle_shop.not_null_int_order_payments_pivoted_coupon_amount.2532b538c2",
            "test.jaffle_shop.not_null_int_order_payments_pivoted_credit_card_amount.ae9c42d967",
            "test.jaffle_shop.not_null_int_order_payments_pivoted_customer_id.3db59c6de4",
            "test.jaffle_shop.not_null_int_order_payments_pivoted_gift_card_amount.710d789cc0",
            "test.jaffle_shop.not_null_int_order_payments_pivoted_order_id.787ba994a8",
            "test.jaffle_shop.not_null_orders_amount.106140f9fd",
            "test.jaffle_shop.not_null_orders_bank_transfer_amount.7743500c49",
            "test.jaffle_shop.not_null_orders_coupon_amount.ab90c90625",
            "test.jaffle_shop.not_null_orders_credit_card_amount.d3ca593b59",
            "test.jaffle_shop.not_null_orders_customer_id.c5f02694af",
            "test.jaffle_shop.not_null_orders_gift_card_amount.413a0d2d7a",
            "test.jaffle_shop.not_null_orders_order_id.cf6c17daed",
            "test.jaffle_shop.not_null_stg_customers_customer_id.e2cfb1f9aa",
            "test.jaffle_shop.not_null_stg_orders_order_id.81cfe2fe64",
            "test.jaffle_shop.not_null_stg_payments_payment_id.c19cc50075",
            "test.jaffle_shop.relationships_int_order_payments_pivoted_customer_id__customer_id__ref_int_customer_order_history_joined_.654a1aa35d",
            "test.jaffle_shop.unique_int_customer_order_history_joined_customer_id.995635f7d9",
            "test.jaffle_shop.unique_int_order_payments_pivoted_order_id.34a0f3307d",
            "test.jaffle_shop.unique_orders_order_id.fed79b3a6e",
            "test.jaffle_shop.unique_stg_customers_customer_id.c7614daada",
            "test.jaffle_shop.unique_stg_orders_order_id.e3b841c71a",
            "test.jaffle_shop.unique_stg_payments_payment_id.3744510712",
        ]

        manifest = load_manifest(_load_manifest('dbt-duckdb-1.6.0-manifest.json'))
        all_results = list_resources_unique_id_from_manifest(manifest)

        self.assertDbtResources(expected, all_results)

    def test_compare_with_manifests(self):
        without_downstream = compare_models_between_manifests(
            self.base_manifest(), self.target_manifest()
        )

        expected = ["jaffle_shop.customers", "jaffle_shop.orders"]
        self.assertDbtResources(without_downstream, expected)

        with_downstream = compare_models_between_manifests(
            self.base_manifest(), self.target_manifest(), True
        )

        expected = ["jaffle_shop.customers", "jaffle_shop.orders"]
        self.assertDbtResources(with_downstream, expected)

    def test_list_explicit_changes(self):
        if dbt_version < '1.6':
            c = GraphDataChangeSet(self.base_run(), self.target_run())

            expected = ["model.jaffle_shop.customers", "model.jaffle_shop.orders"]
            changes = c.list_explicit_changes()
            self.assertDbtResources(changes, expected)
        else:
            c = GraphDataChangeSet(self.base_run_1_6(), self.target_run_1_6())

            expected = ["model.jaffle_shop.orders"]
            changes = c.list_explicit_changes()
            self.assertDbtResources(changes, expected)

    @unittest.skipIf(
        dbt_version < '1.4' or dbt_version >= '1.6',
        "this only works after manifests generated after the v1.4",
    )
    def test_list_explicit_changes_without_ref_ids(self):
        c = GraphDataChangeSet(self.base_31587(), self.target_31587())

        expected = ["model.jaffle_shop.orders"]
        changes = c.list_explicit_changes()
        self.assertDbtResources(changes, expected)

        expected_implicit = [
            "metric.jaffle_shop.average_order_amount",
            "model.jaffle_shop.orders",
        ]
        self.assertDbtResources(c.list_implicit_changes(), expected_implicit)

    @unittest.skipIf(
        dbt_version < version.parse("1.4"),
        "this only works after manifests generated after the v1.4",
    )
    def test_list_explicit_changes_with_ref_ids(self):
        c = GraphDataChangeSet(self.base_31587_with_ref(), self.target_31587_with_ref())

        expected = ["model.jaffle_shop.orders"]
        changes = c.list_explicit_changes()
        self.assertDbtResources(changes, expected)

        expected_implicit = [
            "metric.jaffle_shop.average_order_amount",
            "model.jaffle_shop.orders",
        ]
        self.assertDbtResources(c.list_implicit_changes(), expected_implicit)

    @unittest.skipIf(
        dbt_version < version.parse("1.4"),
        "this only works after manifests generated after the v1.4",
    )
    def test_list_changes_metrics_case(self):
        if dbt_version < '1.6':
            c = GraphDataChangeSet(self.base_31587_metrics(), self.target_31587_metrics())
            expected = ["model.jaffle_shop.orders"]
            changes = c.list_explicit_changes()
            self.assertDbtResources(changes, expected)

            changes = c.list_implicit_changes()
            self.assertDbtResources(
                changes,
                ["metric.jaffle_shop.average_order_amount", "model.jaffle_shop.orders"],
            )
        else:
            c = GraphDataChangeSet(self.base_run_1_6(), self.target_run_1_6())
            expected = ["model.jaffle_shop.orders"]
            changes = c.list_explicit_changes()
            self.assertDbtResources(changes, expected)

            changes = c.list_implicit_changes()
            self.assertDbtResources(
                changes,
                ["metric.jaffle_shop.average_order_amount", "model.jaffle_shop.orders"],
            )

    @unittest.skipIf(
        dbt_version < version.parse("1.4"),
        "this only works after manifests generated after the v1.4",
    )
    def test_list_large_seeds_case(self):
        try:
            c = GraphDataChangeSet(self.base_31782(), self.target_31782())
        except Exception as e:
            self.fail("Unexpected Exception")

        expected = ["metric.jaffle_shop.expenses", "model.jaffle_shop.stg_payments"]

        changes = c.list_explicit_changes()
        self.assertDbtResources(changes, expected)

        expected = [
            "metric.jaffle_shop.expenses",
            "metric.jaffle_shop.profit",
            "model.jaffle_shop.stg_payments",
        ]

        changes = c.list_implicit_changes()
        self.assertDbtResources(changes, expected)
