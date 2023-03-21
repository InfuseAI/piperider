import os

from piperider_cli.recipes import RecipeConfiguration, select_recipe_file
from piperider_cli.recipes.utils import git_switch_to


def main(recipe_name: str = None):
    recipe_path = select_recipe_file(recipe_name)
    if recipe_path is None:
        raise FileNotFoundError(f"Cannot find the recipe '{recipe_name}'")
    cfg = RecipeConfiguration.load(recipe_path)

    if cfg.base.branch:
        git_switch_to(cfg.base.branch)
    if cfg.target.branch:
        git_switch_to(cfg.target.branch)

    ref_name = os.environ.get('GITHUB_REF_NAME')
    print(f'switch to GITHUB_REF_NAME: {ref_name}')
    git_switch_to(ref_name)


if __name__ == '__main__':
    main()
