import io
from typing import Union


class DbtUtil:

    @staticmethod
    def get_dbt_project_path(dbt_project_dir: str = None, no_auto_search: bool = False,
                             recursive: bool = True) -> str:
        import piperider_cli.dbtutil as u
        return u.get_dbt_project_path(dbt_project_dir=dbt_project_dir, no_auto_search=no_auto_search,
                                      recursive=recursive)

    @staticmethod
    def read_dbt_resources(source: Union[str, io.TextIOWrapper, list]):
        import piperider_cli.dbtutil as u
        return u.read_dbt_resources(source=source)
