def disable_dbt_compile_stats():
    import dbt.compilation as compilation

    class context_class:

        def __enter__(self):
            self.original_print_compile_stats = compilation.print_compile_stats
            compilation.print_compile_stats = lambda x: None

        def __exit__(self, exc_type, exc_val, exc_tb):
            compilation.print_compile_stats = self.original_print_compile_stats

    try:
        from dbt.events.functions import cleanup_event_logger
        cleanup_event_logger()
    except ImportError:
        # we dont support the dbt version less than 1.4
        pass

    return context_class()
