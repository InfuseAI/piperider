from abc import ABCMeta, abstractmethod
from typing import List

from rich.console import Console
from rich.markup import escape

from piperider_cli.assertion_engine import AssertionEngine, ValidationResult
from piperider_cli.cloud import PipeRiderCloud
from piperider_cli.configuration import Configuration, PIPERIDER_CONFIG_PATH
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
    def __init__(self):
        self.configurator = None
        self.checker_chain = []
        self.console = Console()

    def set_checker(self, name: str, checker: AbstractChecker):
        self.checker_chain.append({'name': name, 'cls': checker()})

    def execute(self):
        if not self.configurator:
            try:
                self.configurator = Configuration.load()
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
                self.console.print(CONSOLE_MSG_FAIL)
                self.console.print(f"[bold red]Error:[/bold red] {checker['cls'].__class__.__name__}: {error_msg}")
                if hint:
                    self.console.print(f'[bold yellow]Hint[/bold yellow]:\n  {escape(hint)}')
                return False
            self.console.print(CONSOLE_MSG_PASS)

        self.console.print(CONSOLE_MSG_ALL_SET)
        return True


class CheckConfiguration(AbstractChecker):
    def check_function(self, configurator: Configuration) -> (bool, str):
        if not configurator:
            self.console.print(f'  {PIPERIDER_CONFIG_PATH}: [[bold red]FAILED[/bold red]]')
            return False, 'No configuration found'
        self.console.print(f'  {PIPERIDER_CONFIG_PATH}: [[bold green]OK[/bold green]]')
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
                self.console.print(f'  DBT: {ds.type_name} > {dbt["profile"]} > {dbt["target"]} ', end='')
                self.console.print('[[bold green]OK[/bold green]]')

            self.console.print(f'  Name: {name}')
            self.console.print(f'  Type: {type}')

            err = ds.verify_connector()
            if err:
                all_passed = False
                reason = err
                self.console.print(f'  connector: [[bold red]FAILED[/bold red]] reason: {err}')
                self.console.print(f'\n{escape(err.hint)}\n')
                continue
            else:
                self.console.print('  connector: [[bold green]OK[/bold green]]')

            try:
                ds.verify_connection()
                self.console.print('  Connection: [[bold green]OK[/bold green]]')
            except Exception as e:
                self.console.print(f'  Connection: [[bold red]FAILED[/bold red]] reason: {e}')
                all_passed = False
                reason = e

        return all_passed, reason


class CheckAssertionFiles(AbstractChecker):
    def check_function(self, configurator: Configuration) -> (bool, str):
        engine = AssertionEngine(None)
        passed_files, failed_files = engine.load_all_assertions_for_validation()
        results: List[ValidationResult] = engine.validate_assertions()

        for file in passed_files:
            self.console.print(f'  {file}: [[bold green]OK[/bold green]]')

        for file in failed_files:
            self.console.print(f'  {file}: [[bold red]FAILED[/bold red]]')

        newline_section = False
        validate_fail = False
        error_msg = ''
        for result in results:
            if result.has_errors():
                if not newline_section:
                    self.console.line()
                    newline_section = True
                self.console.print(f'  [[bold red]FAILED[/bold red]] {result.as_user_report()}')
                validate_fail = True

        if validate_fail or len(failed_files):
            error_msg = 'Syntax problem of PipeRider assertion yaml files'
            self.console.line()

        return error_msg == '', error_msg


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
            return True, ""


class Validator():
    @staticmethod
    def diagnose():
        handler = CheckingHandler()
        handler.set_checker('config files', CheckConfiguration)
        handler.set_checker('format of data sources', CheckDataSources)
        handler.set_checker('connections', CheckConnections)
        handler.set_checker('assertion files', CheckAssertionFiles)
        if piperider_cloud.has_configured():
            handler.set_checker('cloud account', CloudAccountChecker)
        return handler.execute()
