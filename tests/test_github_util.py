import json
from unittest.mock import patch

import pytest
import requests

from piperider_cli.githubutil import fetch_pr_metadata, _fetch_pr_title


@pytest.fixture
def mock_github_event(tmp_path, monkeypatch):
    event_data = {
        "number": 1,
        "pull_request": {
            "_links": {
                "html": {"href": "https://github.com/xyz/abc/pull/1"},
                "self": {"href": "api_url_here"},
            }
        },
    }
    event_file = tmp_path / "github_event.json"
    with open(event_file, "w") as f:
        json.dump(event_data, f)

    monkeypatch.setenv("GITHUB_EVENT_PATH", str(event_file))


@pytest.fixture
def mock_github_token(monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "github_token_here")


class MockResponse:
    def __init__(self, status_code, json_data=None):
        self.status_code = status_code
        self.json_data = json_data

    def json(self):
        return self.json_data


@pytest.fixture
def mock_get_request_success(monkeypatch):
    def mock_get(*args, **kwargs):
        return MockResponse(200, json_data={"title": "Update README.md"})

    monkeypatch.setattr(requests, "get", mock_get)


@pytest.fixture
def mock_get_request_failure(monkeypatch):
    def mock_get(*args, **kwargs):
        return MockResponse(404)

    monkeypatch.setattr(requests, "get", mock_get)


def test_fetch_pr_metadata(mock_github_event, mock_github_token, mock_get_request_success):
    result = fetch_pr_metadata()

    assert result is not None
    assert result["github_pr_id"] == 1
    assert result["github_pr_url"] == "https://github.com/xyz/abc/pull/1"
    assert result["github_pr_title"] == "Update README.md"


def test_fetch_pr_metadata_no_event(mock_get_request_success, monkeypatch):
    monkeypatch.delenv("GITHUB_EVENT_PATH", raising=False)

    result = fetch_pr_metadata()

    assert result is None


def test_fetch_pr_metadata_request_error(mock_github_event, mock_get_request_failure):
    result = fetch_pr_metadata()

    assert result is not None
    assert result["github_pr_id"] == 1
    assert result["github_pr_url"] == "https://github.com/xyz/abc/pull/1"
    assert result["github_pr_title"] is None


def test_fetch_pr_metadata_exception(mock_github_event, monkeypatch):
    monkeypatch.setenv("GITHUB_EVENT_PATH", "nonexistent_path")

    result = fetch_pr_metadata()

    assert result is None


def test_fetch_pr_metadata_no_token(mock_github_event):
    with patch.dict("os.environ", clear=True):
        result = fetch_pr_metadata()

    assert result is None


def test_fetch_pr_title(mock_github_token, mock_get_request_success):
    result = _fetch_pr_title("api_url_here")

    assert result == "Update README.md"


def test_fetch_pr_title_request_error(mock_github_token, mock_get_request_failure):
    result = _fetch_pr_title("api_url_here")

    assert result is None


def test_fetch_pr_title_exception(mock_github_token, monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "github_token_here")

    def mock_get(*args, **kwargs):
        raise Exception("Test exception")

    monkeypatch.setattr(requests, "get", mock_get)

    result = _fetch_pr_title("api_url_here")

    assert result is None


def test_fetch_pr_title_no_token():
    with patch.dict("os.environ", clear=True):
        result = _fetch_pr_title("api_url_here")

    assert result is None
