import os

from rich.console import Console

from piperider_cli.configuration import FileSystem


def piperider_initialized() -> bool:
    return os.path.exists(FileSystem.PIPERIDER_CONFIG_PATH)


def number_of_reports():
    report_directory = os.path.join(FileSystem.PIPERIDER_WORKSPACE_PATH, 'outputs')
    if not os.path.exists(report_directory):
        return 0
    return len([x for x in os.listdir(report_directory) if x != 'latest'])


class Guide(object):
    """
    # conditional suggestions

    no .piperider ==> init
    init ==> diagnose
    after diagnose if reports <2 ==> run
    after run if only one report ==> run for compare-report
    after run if ==2 reports ==> compare-report
    """

    def __init__(self):
        self.console = Console()

    def show_tips(self, command_name: str):

        if command_name == 'version':
            return

        if command_name == 'init':
            self.show("Please execute command 'piperider diagnose' to verify configuration")
            return

        if command_name == 'diagnose' and number_of_reports() < 1:
            self.show("Please execute command 'piperider run' to generate your first report")
            return

        if command_name == 'diagnose' and number_of_reports() < 2:
            self.show("Please execute command 'piperider run' to generate your second report")
            return

        if command_name == 'generate-report' and number_of_reports() == 1:
            self.show("Please execute command 'piperider run' to generate your second report")
            return

        if command_name == 'generate-report' and number_of_reports() == 2:
            self.show("Please execute command 'piperider compare-reports' to get the comparison report")
            return

    def show(self, description):
        console = self.console
        console.line()
        console.print("Next step:")
        console.print(f'  {description}')
        console.line()
