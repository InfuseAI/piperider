from piperider_cli.event.collector import Collector

_collector = Collector()

def init(api_key):
    _collector.set_api_key(api_key)

def log_event():
    _collector.log_event('test')
