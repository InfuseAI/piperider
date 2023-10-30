import io
import platform
from abc import ABCMeta, abstractmethod

from rich.console import Console, _STD_STREAMS
from rich.markup import escape

from piperider_cli.cloud import PipeRiderCloud
from piperider_cli.configuration import Configuration, FileSystem
from piperider_cli.error import PipeRiderError

CONSOLE_MSG_PASS = '[bold green]✅ PASS[/bold green]\n'
CONSOLE_MSG_FAIL = '[bold red]😱 FAILED[/bold red]\n'
CONSOLE_MSG_ALL_SET = '[bold]🎉 You are all set![/bold]\n'

piperider_cloud = PipeRiderCloud()


class AbstractChecker(metaclass=ABCMeta):
    console = Console()

    @abstractmethod
    def check_function(self, configurator: Configuration) -> (bool, str):
        pass


class CheckingHandler(object):
    def __init__(self, dbt_profile=None, dbt_target=None):
        self.configurator = None
        self.checker_chain = []
        self.console = Console()
        self.dbt = {
            'profile': dbt_profile,
            'target': dbt_target
        }

    def _escape_console_msg(self, msg: str) -> str:
        # escape unsupported unicode emojis for legacy windows console (ref: rich/console.py)
        use_legacy_windows_render = False
        if platform.system() == "Windows" and self.console.legacy_windows:
            try:
                use_legacy_windows_render = (
                    self.console.file.fileno() in _STD_STREAMS
                )
            except (ValueError, io.UnsupportedOperation):
                pass

        if use_legacy_windows_render:
            return msg.encode(encoding='cp1252', errors='ignore').decode(encoding='cp1252')

        return msg

    def set_checker(self, name: str, checker: AbstractChecker):
        self.checker_chain.append({'name': name, 'cls': checker()})

    def execute(self):
        if not self.configurator:
            try:
                self.configurator = Configuration.instance(dbt_profile=self.dbt.get('profile'),
                                                           dbt_target=self.dbt.get('target'))
                self.configurator.activate_report_directory()
            except Exception:
                pass

        for checker in self.checker_chain:
            self.console.print(f'Check {checker["name"]}:')
            passed, error_msg = checker['cls'].check_function(self.configurator)
            if not passed:
                hint = None
                if isinstance(error_msg, list):
                    error_msg = ', '.join(str(e) for e in error_msg)
                elif isinstance(error_msg, PipeRiderError):
                    hint = error_msg.hint
                self.console.print(self._escape_console_msg(CONSOLE_MSG_FAIL))
                self.console.print(f"[bold red]Error:[/bold red] {checker['cls'].__class__.__name__}: {error_msg}")
                if hint:
                    self.console.print(f'[bold yellow]Hint[/bold yellow]:\n  {escape(hint)}')
                return False
            self.console.print(self._escape_console_msg(CONSOLE_MSG_PASS))

        self.console.print(self._escape_console_msg(CONSOLE_MSG_ALL_SET))
        return True


class CheckConfiguration(AbstractChecker):
    def check_function(self, configurator: Configuration) -> (bool, str):
        if not configurator:
            self.console.print(f'  {FileSystem.PIPERIDER_CONFIG_PATH}: [[bold red]FAILED[/bold red]]')
            return False, 'No configuration found'
        self.console.print(f'  {FileSystem.PIPERIDER_CONFIG_PATH}: [[bold green]OK[/bold green]]')
        return True, ''


class CheckDataSources(AbstractChecker):
    def check_function(self, configurator: Configuration) -> (bool, str):
        all_passed = True
        failed_reasons = []
        for ds in configurator.dataSources:
            passed, reasons = ds.validate()
            if passed:
                self.console.print(f'  {ds.name}: [[bold green]OK[/bold green]]')
            else:
                all_passed = False
                self.console.print(f'  {ds.name}: [[bold red]FAILED[/bold red]]')
                for reason in reasons:
                    self.console.print(f'    {reason}')
                failed_reasons.extend(reasons)
        return all_passed, failed_reasons


class CheckConnections(AbstractChecker):
    def check_function(self, configurator: Configuration) -> (bool, str):
        all_passed = True
        reason = ''
        for ds in configurator.dataSources:
            dbt = ds.args.get('dbt')
            name = ds.name
            type = ds.type_name

            if dbt:  # dbt provider
                from piperider_cli.dbt import dbt_version
                self.console.print('  DBT: ', end='')
                self.console.print('[[bold green]OK[/bold green]]')
                self.console.print(f'    Version: {dbt_version}')
                self.console.print(f'    Adapter: {ds.type_name}')
                self.console.print(f'    Profile: {dbt["profile"]}')
                self.console.print(f'    Target:  {dbt["target"]} ')

            self.console.print(f'  Name: {name}')
            self.console.print(f'  Type: {type}')

            err = ds.verify_connector()
            if err:
                all_passed = False
                reason = err
                self.console.print(f'  Connector: [[bold red]FAILED[/bold red]] reason: {err}')
                self.console.print(f'\n{escape(err.hint)}\n')
                continue
            else:
                self.console.print('  Connector: [[bold green]OK[/bold green]]')

            try:
                ds.verify_connection()
                self.console.print('  Connection: [[bold green]OK[/bold green]]')
            except Exception as e:
                self.console.print(f'  Connection: [[bold red]FAILED[/bold red]] reason: {e}')
                all_passed = False
                reason = e

        return all_passed, reason


class CloudAccountChecker(AbstractChecker):
    def check_function(self, configurator: Configuration) -> (bool, str):
        if not piperider_cloud.available:
            msg = 'API Token is configured, but cannot connect to the service.'
            self.console.print(f'  [bold red]{msg}[/bold red]')
            return False, msg
        else:
            self.console.print(f"  Run as user: [bold green]{piperider_cloud.me.get('email')}[/bold green]")
            self.console.print(f"    User Name: [bold green]{piperider_cloud.me.get('username', 'N/A')}[/bold green]")
            self.console.print(f"    Full Name: [bold green]{piperider_cloud.me.get('fullname', 'N/A')}[/bold green]")
            self.console.print(f"  Auto Upload: {piperider_cloud.config.get('auto_upload', False)}")
            self.console.print(
                f"  Default Project: [bold green]{piperider_cloud.config.get('default_project', 'N/A')}[bold green]")
            return True, ""


class Validator():
    @staticmethod
    def diagnose(dbt_profile: str = None, dbt_target: str = None):
        handler = CheckingHandler(dbt_profile=dbt_profile, dbt_target=dbt_target)
        handler.set_checker('config files', CheckConfiguration)
        handler.set_checker('format of data sources', CheckDataSources)
        handler.set_checker('connections', CheckConnections)
        if piperider_cloud.has_configured():
            handler.set_checker('cloud account', CloudAccountChecker)
        return handler.execute()
