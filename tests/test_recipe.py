from unittest import TestCase

from piperider_cli.recipes import update_select_with_cli_option
from piperider_cli.recipes.default_recipe_generator import _prepare_dbt_cmds, _prepare_piperider_cmd


class TestRecipe(TestCase):

    def test_update_select_with_cli_option(self):
        options = dict(skip_datasource_connection=False, select=None)
        select = update_select_with_cli_option(options)
        self.assertEqual(('state:modified+',), select)

        options = dict(skip_datasource_connection=False, select=())
        select = update_select_with_cli_option(options)
        self.assertEqual(('state:modified+',), select)

        options = dict(skip_datasource_connection=False, select=('orders',))
        select = update_select_with_cli_option(options)
        self.assertEqual(('orders',), select)

        options = dict(skip_datasource_connection=True, select=None)
        select = update_select_with_cli_option(options)
        self.assertEqual((), select)

        options = dict(skip_datasource_connection=True, select=('orders',))
        select = update_select_with_cli_option(options)
        self.assertEqual((), select)

    def test_prepare_piperider_cmd(self):
        options = dict(base_branch=None, skip_datasource_connection=False)

        # base
        dbt_field = _prepare_dbt_cmds(options)
        piperider_field = _prepare_piperider_cmd(options)

        self.assertEqual(['dbt deps', 'dbt build'], dbt_field.commands)
        self.assertEqual(['piperider run'], piperider_field.commands)

        # target
        dbt_field = _prepare_dbt_cmds(options, target=True)
        piperider_field = _prepare_piperider_cmd(options)

        self.assertEqual(['dbt deps', 'dbt build --select state:modified+ --state <DBT_STATE_PATH>'],
                         dbt_field.commands)
        self.assertEqual(['piperider run'], piperider_field.commands)

        options['select'] = ('orders',)
        # base
        dbt_field = _prepare_dbt_cmds(options)
        piperider_field = _prepare_piperider_cmd(options)

        self.assertEqual(['dbt deps', 'dbt build'], dbt_field.commands)
        self.assertEqual(['piperider run'], piperider_field.commands)

        # target
        dbt_field = _prepare_dbt_cmds(options, target=True)
        piperider_field = _prepare_piperider_cmd(options)

        self.assertEqual(['dbt deps', 'dbt build --select state:modified+ --state <DBT_STATE_PATH>'],
                         dbt_field.commands)
        self.assertEqual(['piperider run'], piperider_field.commands)

        options['skip_datasource_connection'] = True
        # base
        dbt_field = _prepare_dbt_cmds(options)
        piperider_field = _prepare_piperider_cmd(options)

        self.assertEqual(['dbt deps', 'dbt parse'], dbt_field.commands)
        self.assertEqual(['piperider run --skip-datasource'], piperider_field.commands)

        # target
        dbt_field = _prepare_dbt_cmds(options, target=True)
        piperider_field = _prepare_piperider_cmd(options)

        self.assertEqual(['dbt deps', 'dbt parse'],
                         dbt_field.commands)
        self.assertEqual(['piperider run --skip-datasource'], piperider_field.commands)

