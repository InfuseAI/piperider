import os

from click import Context

from piperider_cli.configuration import PIPERIDER_WORKSPACE_NAME

piperider_config = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'config.yml')
report_directory = os.path.join(os.getcwd(), PIPERIDER_WORKSPACE_NAME, 'outputs')


def show(text):
    print()
    print("Next Steps:")
    print(text)


def piperider_initialized() -> bool:
    return os.path.exists(piperider_config)


def number_of_reports():
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

    def show_tips(self, ctx: Context):
        command_name = ctx.command.name

        if command_name != 'init' and not piperider_initialized():
            show('* init')
            return

        if command_name == 'init':
            show('* diagnose')
            return

        if command_name == 'diagnose' and number_of_reports() < 2:
            show('* run')
            return

        if command_name == 'run' and number_of_reports() == 1:
            show('* run')
            return

        if command_name == 'run' and number_of_reports() == 2:
            show('* compare-reports')
            return
