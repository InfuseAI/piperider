import json
import os

import requests


def fetch_pr_metadata_from_event_path() -> dict:
    """
        If piperider is running in a GitHub Action, this function will return the pull request metadata.

        Example:
        {
            "github_pr_id": 1,
            "github_pr_url": "https://github.com/xyz/abc/pull/1
            "github_pr_title": "Update README.md"
        }

        :return: dict
    """

    # get the event json from the path in GITHUB_EVENT_PATH
    event_path = os.getenv("GITHUB_EVENT_PATH")
    if event_path:
        try:
            with open(event_path, "r") as event_file:
                event_data = json.load(event_file)

            pr_id = event_data["number"]
            if event_data.get("pull_request"):
                pull_request_data = event_data["pull_request"]
                pr_url = pull_request_data["_links"]["html"]["href"]
                pr_api = pull_request_data["_links"]["self"]["href"]
                pr_title = _fetch_pr_title(pr_api)
                return dict(github_pr_id=pr_id, github_pr_url=pr_url, github_pr_title=pr_title)
            else:
                print("Not a pull request event, skip.")
        except Exception as e:
            print("Cannot parse github action event", e)
    return None


def fetch_pr_metadata_from_env() -> dict:
    keys = ['GITHUB_PR_ID', 'GITHUB_PR_URL', 'GITHUB_PR_TITLE']
    all_present = all(key in os.environ for key in keys)
    if all_present is False:
        return None
    return dict(
        github_pr_id=int(os.getenv("GITHUB_PR_ID")),
        github_pr_url=os.getenv("GITHUB_PR_URL"),
        github_pr_title=os.getenv("GITHUB_PR_TITLE"),
    )


def fetch_pr_metadata() -> dict:
    if os.getenv("GITHUB_EVENT_PATH"):
        return fetch_pr_metadata_from_event_path()
    return fetch_pr_metadata_from_env()


def _fetch_pr_title(endpoint) -> str:
    github_token = os.getenv("GITHUB_TOKEN")

    if github_token is None:
        return None

    try:
        headers = {"Authorization": f"Bearer {github_token}"}
        response = requests.get(endpoint, headers=headers)

        if response.status_code == 200:
            pull_request_data = response.json()
            return pull_request_data.get('title')
    except Exception as e:
        print("Cannot fetch PR title: ", e)

    return None
