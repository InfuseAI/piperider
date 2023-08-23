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

    def as_version(self, other):
        from packaging.version import Version
        if isinstance(other, Version):
            return other
        if isinstance(other, str):
            return self.parse(other)
        return self.parse(str(other))

    def __ge__(self, other):
        return self.dbt_version >= self.as_version(other)

    def __gt__(self, other):
        return self.dbt_version > self.as_version(other)

    def __lt__(self, other):
        return self.dbt_version < self.as_version(other)

    def __le__(self, other):
        return self.dbt_version <= self.as_version(other)

    def __eq__(self, other):
        return self.dbt_version.release[:2] == self.as_version(other).release[:2]

    def __str__(self):
        return ".".join([str(x) for x in list(self.dbt_version.release)])


dbt_version = DbtVersionTool()
