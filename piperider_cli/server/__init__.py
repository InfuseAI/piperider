import os
import shlex
import subprocess
import sys

import requests
from flask import Flask, request

from piperider_cli import data
from piperider_cli.filesystem import FileSystem
from piperider_cli.server.apis import app_apis
from piperider_cli.server.common import app_common
from piperider_cli.server.reports import app_reports


def create_app(report_dir, single_dir, comparison_dir):
    STATIC_DIR = os.path.abspath(os.path.join(os.path.dirname(data.__file__), 'report'))
    app = Flask(__name__, static_folder=STATIC_DIR)

    # propagation variables to sub-modules via config
    app.config['report_dir'] = report_dir
    app.config['single_dir'] = single_dir
    app.config['comparison_dir'] = comparison_dir
    app.config['static_dir'] = STATIC_DIR
    app.config['dev_proxy'] = os.environ.get('dev_proxy', 'false') == "true"

    # register sub modules
    app.register_blueprint(app_common)
    app.register_blueprint(app_apis)
    app.register_blueprint(app_reports)

    @app.errorhandler(404)
    def forward_404_to_node_dev_port(error):
        if app.config['dev_proxy'] is True and "http://localhost:8001" in request.url:
            return requests.get(request.url.replace(':8001', ':8000')).content
        return "Not Found", 404

    return app


def _build_waitress_command(waitress_opts, host, port, config):
    report = config['report_dir']
    single = config['single_dir']
    comparison = config['comparison_dir']
    opts = shlex.split(waitress_opts) if waitress_opts else []
    return (
        ["waitress-serve"] + opts + ["--host=%s" % host, "--port=%s" % port, "--ident=piperider",
                                     f"piperider_cli.server:create_app('{report}', '{single}', '{comparison}')"]
    )


def _build_gunicorn_command(gunicorn_opts, host, port, workers, config):
    report = config['report_dir']
    single = config['single_dir']
    comparison = config['comparison_dir']
    bind_address = "%s:%s" % (host, port)
    opts = shlex.split(gunicorn_opts) if gunicorn_opts else []
    return ["gunicorn"] + opts + ["-b", bind_address, "-w", "%s" % workers,
                                  f"piperider_cli.server:create_app('{report}', '{single}', '{comparison}')"]


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

    # run for development
    if os.environ.get('FLASK_DEBUG') is not None:
        from flask_cors import CORS
        app = create_app(config['report_dir'], config['single_dir'], config['comparison_dir'])
        CORS(app)
        app.run(host=host, port=port)
        return

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
