import os.path

from rich.console import Console

from piperider_cli.configuration import Configuration
from piperider_cli.error import RecipeConfigException
from piperider_cli.event import CompareEventPayload
from piperider_cli.recipes import select_recipe_file, RecipeConfiguration, execute_recipe_configuration
from piperider_cli.recipes.default_recipe_generator import generate_default_recipe, show_recipe_content

console = Console()


class RecipeExecutor:
    @staticmethod
    def exec(recipe_name: str, select: tuple = None, modified: bool = False, base_ref: str = None,
             target_ref: str = None, skip_datasource_connection: bool = False, debug=False, event_payload=CompareEventPayload()) -> RecipeConfiguration:
        config = Configuration.instance()
        recipe_path = select_recipe_file(recipe_name)

        event_payload.step = "prepare recipe"
        ds = config.get_datasource()
        if ds is not None:
            event_payload.datasource_type = ds.type_name
        if skip_datasource_connection:
            event_payload.skip_datasource = True

        if recipe_name and (select or modified or base_ref or skip_datasource_connection):
            console.print(
                "[[bold yellow]Warning[/bold yellow]] "
                "The recipe will be ignored when '--select', '--modified', '--base-branch', "
                "or '--skip-datasource' is provided."
            )
        if not skip_datasource_connection and select:
            console.print(
                f"[[bold green]Select[/bold green]] Manually select the dbt nodes to run by '{','.join(select)}'")
        if recipe_path is None or select or modified or base_ref or skip_datasource_connection:
            dbt_project_path = None
            if config.dataSources and config.dataSources[0].args.get('dbt'):
                dbt_project_path = os.path.relpath(config.dataSources[0].args.get('dbt', {}).get('projectDir'))
            # generate a default recipe
            console.rule("Recipe executor: generate recipe")
            options = dict(
                base_ref=base_ref,
                target_ref=target_ref,
                skip_datasource_connection=skip_datasource_connection
            )
            if select:
                options['select'] = select
            recipe = generate_default_recipe(overwrite_existing=False,
                                             dbt_project_path=dbt_project_path,
                                             options=options)
            if recipe is None:
                raise RecipeConfigException(
                    message='Default recipe generation failed.',
                    hint='Please provide a recipe file or feedback an issue to us'
                )
            show_recipe_content(recipe)
        else:
            recipe = RecipeConfiguration.load(recipe_path)

        options = dict(skip_datasource_connection=skip_datasource_connection, select=select)
        execute_recipe_configuration(recipe, options, debug=debug, event_payload=event_payload)

        return recipe
