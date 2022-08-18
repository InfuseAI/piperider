import json
import os
import re

import requests
from flask import Blueprint, request, current_app

from piperider_cli import __version__, sentry_dns, sentry_env, event

app_common = Blueprint('app_common', __name__)


@app_common.route("/")
def index():
    if current_app.config['dev_proxy'] is True and "http://localhost:8001" in request.url:
        return requests.get(request.url.replace(':8001', ':8000')).content

    html_file = os.path.join(current_app.config['static_dir'], 'index-report/index.html')
    if not os.path.exists(html_file):
        return '', 404
    with open(html_file) as f:
        html = f.read()
    return _insert_serve_index(html)


def _insert_serve_index(template_html: str):
    metadata = {
        'name': 'PipeRider',
        'sentry_env': sentry_env,
        'sentry_dns': sentry_dns,
        'version': __version__,
        'amplitude_api_key': event._get_api_key(),
        'amplitude_user_id': event._collector._user_id,
    }
    variables = f'<script id="piperider-report-variables">\n' \
                f'window.PIPERIDER_METADATA={json.dumps(metadata)};</script>'
    html_parts = re.sub(r'<script id="piperider-report-variables">.+?</script>', '#PLACEHOLDER#',
                        template_html).split(
        '#PLACEHOLDER#')
    html = html_parts[0] + variables + html_parts[1]
    return html


@app_common.route("/health")
def health():
    return "OK", 200
