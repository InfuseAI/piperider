class ProfilerEventHandler:
    def handle_run_start(self, run_result):
        pass

    def handle_run_end(self, run_result):
        pass

    def handle_run_progress(self, run_result, total, completed):
        pass

    def handle_metadata_start(self):
        pass

    def handle_metadata_progress(self, total, completed):
        pass

    def handle_metadata_end(self):
        pass

    def handle_manifest_start(self):
        pass

    def handle_manifest_progress(self, total, completed):
        pass

    def handle_manifest_end(self):
        pass

    def handle_table_start(self, table_name):
        pass

    def handle_table_progress(self, table_name, table_result, total, completed):
        pass

    def handle_table_end(self, table_name, table_result):
        pass

    def handle_column_start(self, table_name, column_name):
        pass

    def handle_column_end(self, table_name, column_name, column_result):
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

    def handle_metadata_start(self):
        pass

    def handle_metadata_progress(self, total, completed):
        pass

    def handle_metadata_end(self):
        pass

    def handle_manifest_start(self):
        pass

    def handle_manifest_progress(self, total, completed):
        pass

    def handle_manifest_end(self):
        pass

    def handle_table_start(self, table_name):
        pass

    def handle_table_progress(self, table_name, table_result, total, completed):
        self.col_total = total
        self.col_completed = completed
        if completed == 0:
            print(
                f"[{self.table_completed + 1}/{self.table_total}] profiling [{table_name}] rows={table_result['row_count']}")

    def handle_table_end(self, table_name, table_result):
        pass

    def handle_column_start(self, table_name, column_name):
        pass

    def handle_column_end(self, table_name, column_name, column_result):
        print(
            f"    [{self.col_completed + 1}/{self.col_total}] profiling [{table_name}.{column_name}] type={column_result['schema_type']} [{column_result['elapsed_milli']}ms]")
