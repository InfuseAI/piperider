import sys
import os
import shlex
import subprocess
import re
import json
from flask import Flask, request, send_from_directory
from piperider_cli import __version__, sentry_dns, sentry_env, event, data
from piperider_cli.filesystem import FileSystem
from piperider_cli.compare_report import CompareReport


def create_app(report_dir, single_dir, comparison_dir):
    STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(data.__file__), 'report'))
    app = Flask(__name__, static_folder=STATIC_DIR)

    @app.route("/health")
    def health():
        return "OK", 200

    @app.route("/")
    def index():
        comparison_item = request.args.get('hl')
        if comparison_item:
            pass
        html_file = os.path.join(STATIC_DIR, 'index-report/index.html')
        if not os.path.exists(html_file):
            return '', 404
        with open(html_file) as f:
            html = f.read()
        return _insert_serve_index(html)

    @app.route("/compare")
    def compare():
        base = request.args.get('base')
        target = request.args.get('target')
        a = os.path.join(single_dir, f'{base}/run.json')
        b = os.path.join(single_dir, f'{target}/run.json')
        CompareReport.exec(a=a, b=b, report_dir=report_dir)
        return dict(base=base, target=target)

    @app.route("/single-run/<source>/")
    def serve_single(source):
        html_file = os.path.join(single_dir, f'{source}/index.html')
        if not os.path.exists(html_file):
            return '', 404
        with open(html_file) as f:
            html = f.read()
        return html

    @app.route("/comparison/<source>/")
    def serve_comparison(source):
        html_file = os.path.join(comparison_dir, f'{source}/index.html')
        if not os.path.exists(html_file):
            return '', 404
        with open(html_file) as f:
            html = f.read()
        return html

    @app.route("/single-run/<source>/<path:path>")
    def serve_single_static(source, path):
        return _serve_static(single_dir, source, path)

    @app.route("/comparison/<source>/<path:path>")
    def serve_comparison_static(source, path):
        return _serve_static(comparison_dir, source, path)

    @app.route("/<path:path>")
    def serve_static(path):
        return _serve_static('', 'index-report', path)

    def _serve_static(parent, source, path):
        folder = os.path.join(parent, source)
        return send_from_directory(os.path.join(STATIC_DIR, folder), path)

    def _insert_serve_index(template_html: str):
        data = _scan_reports()
        metadata = {
            'name': 'PipeRider',
            'sentry_env': sentry_env,
            'sentry_dns': sentry_dns,
            'version': __version__,
            'amplitude_api_key': event._get_api_key(),
            'amplitude_user_id': event._collector._user_id,
        }
        variables = f'<script id="piperider-report-variables">\n' \
                    f'window.PIPERIDER_METADATA={json.dumps(metadata)};' \
                    f'window.PIPERIDER_INDEX_REPORT_DATA={json.dumps(data)};</script>'
        html_parts = re.sub(r'<script id="piperider-report-variables">.+?</script>', '#PLACEHOLDER#', template_html).split(
            '#PLACEHOLDER#')
        html = html_parts[0] + variables + html_parts[1]
        return html

    def _scan_reports():
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

    return app


def _build_waitress_command(waitress_opts, host, port, config):
    report = config['report_dir']
    single = config['single_dir']
    comparison = config['comparison_dir']
    opts = shlex.split(waitress_opts) if waitress_opts else []
    return (
        ["waitress-serve"] + opts + ["--host=%s" % host, "--port=%s" % port, "--ident=piperider", f"piperider_cli.server:create_app('{report}', '{single}', '{comparison}')"]
    )


def _build_gunicorn_command(gunicorn_opts, host, port, workers, config):
    report = config['report_dir']
    single = config['single_dir']
    comparison = config['comparison_dir']
    bind_address = "%s:%s" % (host, port)
    opts = shlex.split(gunicorn_opts) if gunicorn_opts else []
    return ["gunicorn"] + opts + ["-b", bind_address, "-w", "%s" % workers, f"piperider_cli.server:create_app('{report}', '{single}', '{comparison}')"]


def _run_server(
    host,
    port,
    workers=None,
    gunicorn_opts=None,
    waitress_opts=None,
    report_dir=None,
):
    filesystem = FileSystem(report_dir=report_dir)
    config = dict(
        report_dir=filesystem.get_report_dir(),
        single_dir=filesystem.get_output_dir(),
        comparison_dir=filesystem.get_comparison_dir(),
    )

    if sys.platform == "win32":
        full_command = _build_waitress_command(waitress_opts, host, port, config)
    else:
        full_command = _build_gunicorn_command(gunicorn_opts, host, port, workers or 4, config)
    cmd = list(map(str, full_command))
    process = subprocess.Popen(
        cmd,
        text=True,
    )
    stdout, stderr = process.communicate()
    returncode = process.poll()
    comp_process = subprocess.CompletedProcess(
        process.args,
        returncode=returncode,
        stdout=stdout,
        stderr=stderr,
    )
    if returncode != 0:
        raise Exception(f"serve returncode != 0. {str(comp_process)}")
