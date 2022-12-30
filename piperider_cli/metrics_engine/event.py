class MetricEventHandler:
    def handle_run_start(self):
        pass

    def handle_run_progress(self, total: int, completed: int):
        pass

    def handle_run_end(self):
        pass

    def handle_metric_start(self, metric: str):
        pass

    def handle_metric_progress(self, metric: str, total: int, completed: int):
        pass

    def handle_metric_end(self, metric: str):
        pass

    def handle_param_query_start(self, metric: str, param: str):
        pass

    def handle_param_query_end(self, metric: str):
        pass


class DefaultMetricEventHandler(MetricEventHandler):
    metric_total = 0
    metric_completed = 0
    query_param_total = 0
    query_param_completed = 0

    def handle_run_start(self):
        print("Start Metric Querying")

    def handle_run_progress(self, total: int, completed: int):
        self.metric_total = total
        self.metric_completed = completed

    def handle_run_end(self):
        pass

    def handle_metric_start(self, metric: str):
        print(f"[{self.metric_completed + 1}/{self.metric_total}] querying [{metric}]", flush=True)

    def handle_metric_progress(self, metric: str, total: int, completed: int):
        self.query_param_total = total
        self.query_param_completed = completed

    def handle_metric_end(self, metric: str):
        pass

    def handle_param_query_start(self, metric: str, param: str):
        print(
            f"    [{self.query_param_completed + 1}/{self.query_param_total}] querying [{metric}::{param}] ",
            flush=True
        )

    def handle_param_query_end(self, metric: str):
        pass
