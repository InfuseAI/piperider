import json
import os
import sys

from piperider_cli.recipes import RecipeConfiguration, select_recipe_file
from piperider_cli.recipes.utils import git_switch_to


def prepare_for_action(recipe_name: str = None):
    recipe_path = select_recipe_file(None if not recipe_name else recipe_name)
    if recipe_path is None:
        raise FileNotFoundError(f"Cannot find the recipe '{recipe_name}'")
    cfg = RecipeConfiguration.load(recipe_path)

    if cfg.base.branch:
        git_switch_to(cfg.base.branch)
    if cfg.target.branch:
        git_switch_to(cfg.target.branch)

    ref_name = os.environ.get('GITHUB_HEAD_REF')
    print(f'switch to GITHUB_HEAD_REF: {ref_name}')
    git_switch_to(ref_name)


def make_recipe_command():
    command_builder = ["piperider compare", "--summary-file ./summary.md", "-o ./report"]
    recipe = os.environ.get("INPUT_RECIPE")
    if recipe:
        command_builder.append(f"--recipe {recipe}")

    api_token = os.environ.get("INPUT_CLOUD_API_TOKEN")
    if api_token:
        # TODO check login success or failed
        project = os.environ.get("INPUT_CLOUD_PROJECT")

        if project:
            print(f"piperider cloud login --token {api_token} --project {project} --no-interaction")
        else:
            print(f"piperider cloud login --token {api_token} --no-interaction")

        share = os.environ.get("INPUT_SHARE", "false")
        if share == "true":
            command_builder.append("--share")

        upload = os.environ.get("INPUT_UPLOAD", "false")
        if upload == "true":
            command_builder.append("--upload")

    compare_command = " ".join(command_builder)
    print(compare_command)


def create_comment(github_token: str, repo: str, issue_number: str, body: str):
    # https://docs.github.com/en/rest/issues/comments?apiVersion=2022-11-28#create-an-issue-comment
    import requests
    url = f"https://api.github.com/repos/{repo}/issues/{issue_number}/comments"
    response = requests.post(url=url, json=dict(body=body),
                             headers={"accept": "application/vnd.github+json",
                                      "X-GitHub-Api-Version": "2022-11-28",
                                      "Authorization": f"token {github_token}"})

    if response.status_code != 201:
        print("[Error] Failed to create pull-request comment", response.status_code, response.text)
        sys.exit(1)


def attach_comment():
    if not os.path.exists("./summary.md"):
        print("./summary.md not found")
        sys.exit(1)
        return

    summary = ""
    with open("./summary.md") as fh:
        summary = fh.read()
        if ":bar_chart:" not in summary:
            summary = f"""
# :bar_chart: Piperider Comparison Summary
{summary}

## :paperclip: Generated Comparison Report ZIP
Find it in the [Github Action Runs Page]({os.environ.get('GITHUB_ACTION_URL')})
"""

    with open("/github/workflow/event.json", "r") as fh:
        event = json.loads(fh.read())
        number = event['number']
        create_comment(os.environ['GITHUB_TOKEN'], os.environ['GITHUB_REPOSITORY'], number, summary)


if __name__ == '__main__':
    function = sys.argv[-1]
    try:
        if function == "prepare_for_action":
            recipe = os.environ.get("INPUT_RECIPE")
            prepare_for_action(recipe)
        elif function == "make_recipe_command":
            make_recipe_command()
        elif function == "attach_comment":
            attach_comment()
        else:
            raise Exception(f"Unknown command: {function}")
    except Exception as e:
        print(f"[Error] {e}")
        sys.exit(1)
