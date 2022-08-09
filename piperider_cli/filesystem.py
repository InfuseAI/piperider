import os

from piperider_cli import raise_exception_when_directory_not_writable
from piperider_cli.configuration import PIPERIDER_WORKSPACE_NAME, Configuration

piperider_default_report_dir = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME)


class FileSystem:

    def __init__(self, **kwargs):
        config = Configuration.load()
        self.report_dir = config.report_dir
        if kwargs.get('report_dir', None) is not None:
            self.report_dir = self._to_report_dir(kwargs.get('report_dir'))

        raise_exception_when_directory_not_writable(self.report_dir)

    def _to_report_dir(self, dirname: str):
        """
        the "." always refer to `.piperider` not the current working directory
        """
        if dirname is None or dirname.strip() == '':
            dirname = '.'
        if dirname.startswith('.'):
            return os.path.abspath(os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, dirname))
        return os.path.abspath(dirname)

    def get_output_dir(self):
        if self.report_dir is None:
            return os.path.join(piperider_default_report_dir, 'outputs')
        return os.path.join(self.report_dir, 'outputs')

    def get_comparison_dir(self):
        if self.report_dir is None:
            return os.path.join(piperider_default_report_dir, 'comparisons')
        return os.path.join(self.report_dir, 'comparisons')

    def get_report_dir(self):
        return self.report_dir
