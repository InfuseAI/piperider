from rich.progress import Progress, TextColumn, BarColumn, TimeElapsedColumn, MofNCompleteColumn


class ProfilerEventHandler:
    def handle_run_start(self, run_result):
        pass

    def handle_run_end(self, run_result):
        pass

    def handle_run_progress(self, run_result, total, completed):
        pass

    def handle_fetch_metadata_all_start(self):
        pass

    def handle_fetch_metadata_table_start(self, table_name):
        pass

    def handle_table_start(self, table_result):
        pass

    def handle_table_progress(self, table_result, total, completed):
        pass

    def handle_table_end(self, table_result):
        pass

    def handle_column_start(self, table_name, column_result):
        pass

    def handle_column_end(self, table_name, column_result):
        pass


class DefaultProfilerEventHandler(ProfilerEventHandler):
    table_completed = 0
    table_total = 0
    col_completed = 0
    col_total = 0

    def handle_run_start(self, run_result):
        print("Start profiling")

    def handle_run_progress(self, run_result, total, completed):
        self.table_total = total
        self.table_completed = completed

    def handle_run_end(self, run_result):
        pass

    def handle_fetch_metadata_all_start(self):
        print("fetching metadata")

    def handle_fetch_metadata_table_start(self, table_name):
        print(f"fetching metadata for table '{table_name}'")

    def handle_table_start(self, table_result):
        print(f"[{self.table_completed + 1}/{self.table_total}] profiling [{table_result['name']}] ", end='', flush=True)

    def handle_table_progress(self, table_result, total, completed):
        self.col_total = total
        self.col_completed = completed
        if completed == 0:
            print(f"\r[{self.table_completed + 1}/{self.table_total}] profiling [{table_result['name']}] rows={table_result['row_count']}")

    def handle_table_end(self, table_result):
        pass

    def handle_column_start(self, table_name, column_result):
        print(
            f"    [{self.col_completed + 1}/{self.col_total}] profiling [{table_name}.{column_result['name']}] type={column_result['schema_type']}",
            end='', flush=True)

    def handle_column_end(self, table_name, column_result):
        print(
            f"\r    [{self.col_completed + 1}/{self.col_total}] profiling [{table_name}.{column_result['name']}] type={column_result['schema_type']} [{column_result['elapsed_milli']}ms]")


class RichProfilerEventHandler(ProfilerEventHandler):

    def __init__(self):
        text_column = TextColumn("{task.description}")
        bar_column = BarColumn(bar_width=80)
        time_elapsed_column = TimeElapsedColumn()
        mof_column = MofNCompleteColumn()
        self.progress = Progress(text_column, bar_column, mof_column, time_elapsed_column)
        self.progress_started = False
        self.tasks = {}

    def handle_run_start(self, run_result):
        pass

    def handle_run_progress(self, run_result, total, completed):
        if self.progress_started:
            return
        for table, v in run_result['metadata'].tables.items():
            col_count = len(v.columns)
            task_id = self.progress.add_task(table, total=col_count)
            self.tasks[table] = task_id
        self.progress.start()
        self.progress_started = True

    def handle_run_end(self, run_result):
        self.progress.stop()

    def handle_fetch_metadata_all_start(self):
        print("fetching metadata")

    def handle_fetch_metadata_table_start(self, table_name):
        print(f"fetching metadata for table '{table_name}'")

    def handle_table_start(self, table_result):
        pass

    def handle_table_progress(self, table_result, total, completed):
        pass

    def handle_table_end(self, table_result):
        pass

    def handle_column_start(self, table_name, column_result):
        pass

    def handle_column_end(self, table_name, column_result):
        task_id = self.tasks[table_name]
        self.progress.update(task_id, advance=1)
