import os

from flask import Blueprint, current_app, send_from_directory

app_reports = Blueprint('app_reports', __name__)


@app_reports.route("/single-run/<source>/")
def serve_single(source):
    html_file = os.path.join(current_app.config['single_dir'], f'{source}/index.html')
    if not os.path.exists(html_file):
        return '', 404
    with open(html_file) as f:
        html = f.read()
    return html


@app_reports.route("/comparison/<source>/")
def serve_comparison(source):
    html_file = os.path.join(current_app.config['comparison_dir'], f'{source}/index.html')
    if not os.path.exists(html_file):
        return '', 404
    with open(html_file) as f:
        html = f.read()
    return html


@app_reports.route("/single-run/<source>/<path:path>")
def serve_single_static(source, path):
    return _serve_static(current_app.config['static_dir'], current_app.config['single_dir'], source, path)


@app_reports.route("/comparison/<source>/<path:path>")
def serve_comparison_static(source, path):
    return _serve_static(current_app.config['static_dir'], current_app.config['comparison_dir'], source, path)


@app_reports.route("/<path:path>")
def serve_static(path):
    return _serve_static(current_app.config['static_dir'], '', 'index-report', path)


def _serve_static(static_dir, parent, source, path):
    folder = os.path.join(parent, source)
    return send_from_directory(os.path.join(static_dir, folder), path)
