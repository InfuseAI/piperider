from rich.color import Color
from rich.progress import Progress, Column, TextColumn, BarColumn, TimeElapsedColumn, MofNCompleteColumn
from rich.style import Style


class AssertionEventHandler:
    def handle_assertion_start(self, assertions):
        pass

    def handle_assertion_end(self, results, exceptions):
        pass

    def handle_execution_start(self, assertion_context):
        pass

    def handle_execution_end(self, assertion_result):
        pass


class DefaultAssertionEventHandler(AssertionEventHandler):

    def __init__(self):
        subject_column = TextColumn("{task.fields[test_subject]}")
        assert_column = TextColumn("{task.fields[display_name]}", style='green')
        bar_column = BarColumn(bar_width=60, pulse_style=Style.from_color(Color.from_rgb(244, 164, 96)))
        mofn_column = MofNCompleteColumn(table_column=Column(width=5, justify="right"))
        time_elapsed_column = TimeElapsedColumn()
        self.progress = Progress(subject_column, assert_column, bar_column, mofn_column, time_elapsed_column)
        self.task_id = None

    def handle_assertion_start(self, assertions):
        self.progress.start()
        fields = dict(display_name='', test_subject='')
        self.task_id = self.progress.add_task('assertions', total=len(assertions), **fields)

    def handle_assertion_end(self, results, exceptions):
        self.progress.update(self.task_id, **dict(display_name='', test_subject='Test completed'))
        self.progress.stop()

    def handle_execution_start(self, assertion_context):
        display_name = assertion_context.name if assertion_context.name is not None else assertion_context.metric
        test_subject = assertion_context.table if assertion_context.table else '-'
        if assertion_context.column:
            test_subject = f'{test_subject}.{assertion_context.column}'
        self.progress.update(self.task_id, **dict(display_name=display_name, test_subject=test_subject))

    def handle_execution_end(self, assertion_result):
        self.progress.update(self.task_id, advance=1, **dict(display_name=''))
