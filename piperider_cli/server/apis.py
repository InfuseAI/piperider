import json
import os

from flask import Blueprint, request, current_app

from piperider_cli.compare_report import CompareReport

app_apis = Blueprint('app_apis', __name__)


@app_apis.route("/api/index")
def api_index():
    cfg = current_app.config
    return _scan_reports(cfg['single_dir'], cfg['comparison_dir'])


@app_apis.route("/api/compare", methods=['POST'])
def compare():
    content_type = request.headers.get('Content-Type')
    if content_type != 'application/json':
        return dict(ok=False, error='Content-Type not supported'), 400

    # get config from the main app
    cfg = current_app.config
    single_dir = cfg['single_dir']
    report_dir = cfg['report_dir']
    comparison_dir = cfg['comparison_dir']

    payload = request.json
    base = payload.get('base')
    target = payload.get('target')
    a = os.path.join(single_dir, f'{base}/run.json')
    b = os.path.join(single_dir, f'{target}/run.json')
    comparison_id = CompareReport.exec(a=a, b=b, report_dir=report_dir)
    comparison_json_file = os.path.join(comparison_dir, f'{comparison_id}/comparison_data.json')
    with open(comparison_json_file) as f:
        result = json.load(f)
        return dict(ok=True, message=f"Comparison '{comparison_id}' generated", comparison=dict(
            name=comparison_id,
            created_at=result.get('created_at'),
            base=dict(
                datasource=result.get('base', {}).get('datasource', {}),
                created_at=result.get('base', {}).get('created_at'),
            ),
            target=dict(
                datasource=result.get('input', {}).get('datasource', {}),
                created_at=result.get('input', {}).get('created_at'),
            ),
        ))


def _scan_reports(single_dir: str, comparison_dir: str):
    data = dict(single=[], comparison=[])

    if os.path.exists(single_dir):
        for entry in os.scandir(single_dir):
            if not _is_report_valid(single_dir, entry):
                continue
            json_file = os.path.join(entry.path, 'run.json')
            if not os.path.exists(json_file):
                continue
            with open(json_file) as f:
                result = json.load(f)
                data['single'].append(dict(
                    name=entry.name,
                    datasource=result.get('datasource', {}),
                    created_at=result.get('created_at'),
                ))

    if os.path.exists(comparison_dir):
        for entry in os.scandir(comparison_dir):
            if not _is_report_valid(comparison_dir, entry):
                continue
            json_file = os.path.join(entry.path, 'comparison_data.json')
            if not os.path.exists(json_file):
                continue
            with open(json_file) as f:
                result = json.load(f)
                data['comparison'].append(dict(
                    name=entry.name,
                    created_at=result.get('created_at'),
                    base=dict(
                        datasource=result.get('base', {}).get('datasource', {}),
                        created_at=result.get('base', {}).get('created_at'),
                    ),
                    target=dict(
                        datasource=result.get('input', {}).get('datasource', {}),
                        created_at=result.get('input', {}).get('created_at'),
                    ),
                ))

    data['single'].sort(key=lambda x: x['created_at'], reverse=True)
    data['comparison'].sort(key=lambda x: x['created_at'], reverse=True)
    return data


def _is_report_valid(path, entry):
    if entry.is_file():
        return False
    if entry.name == 'latest':
        return False
    if not os.path.exists(os.path.join(path, entry.name, 'index.html')):
        return False
    return True
