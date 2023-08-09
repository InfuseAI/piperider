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


class DbtVersionTool:

    def __init__(self):
        from dbt import version as dbt_version
        self.dbt_version = self.parse(dbt_version.__version__)

    @staticmethod
    def parse(version: str):
        from packaging import version as v
        return v.parse(version)

    def __ge__(self, other):
        if isinstance(other, str):
            return self.dbt_version >= self.parse(other)
        raise ValueError(f'{other} must be a string')

    def __gt__(self, other):
        if isinstance(other, str):
            return self.dbt_version > self.parse(other)
        raise ValueError(f'{other} must be a string')

    def __lt__(self, other):
        if isinstance(other, str):
            return self.dbt_version < self.parse(other)
        raise ValueError(f'{other} must be a string')

    def __le__(self, other):
        if isinstance(other, str):
            return self.dbt_version <= self.parse(other)
        raise ValueError(f'{other} must be a string')

    def __eq__(self, other):
        if isinstance(other, str):
            return self.dbt_version == self.parse(other)
        raise ValueError(f'{other} must be a string')

    def __str__(self):
        return self.dbt_version


dbtv = DbtVersionTool()
