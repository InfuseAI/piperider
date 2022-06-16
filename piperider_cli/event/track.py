from click.core import Command, Context
from piperider_cli import event
from rich.console import Console
import typing as t
import sentry_sdk
import sys


class TrackCommand(Command):

    def __init__(
        self,
        name: t.Optional[str],
        context_settings: t.Optional[t.Dict[str, t.Any]] = None,
        callback: t.Optional[t.Callable[..., t.Any]] = None,
        params: t.Any = None,
        help: t.Optional[str] = None,
        epilog: t.Optional[str] = None,
        short_help: t.Optional[str] = None,
        options_metavar: t.Optional[str] = "[OPTIONS]",
        add_help_option: bool = True,
        no_args_is_help: bool = False,
        hidden: bool = False,
        deprecated: bool = False,
    ) -> None:
        super(TrackCommand, self).__init__(name, context_settings, callback, params, help, epilog, short_help,
                                           options_metavar, add_help_option, no_args_is_help, hidden, deprecated)

    def _show_error_message(self, msg, params):
        console = Console()
        if params.get('debug'):
            console.print_exception(show_locals=True)
        else:
            console.print(f'[bold red]Error:[/bold red] {msg}')

    def invoke(self, ctx: Context) -> t.Any:
        print('invoke begin')
        status = False
        try:
            print('executing command: ', ctx.command.name)
            ret = super(TrackCommand, self).invoke(ctx)
            print('finished command: ', ctx.command.name)
            status = True
            print('command status: ', status)
            return ret
        except Exception as e:
            print('entered command exception')
            print('show error message')
            self._show_error_message(e, ctx.params)
            print('sentry capture exception')
            sentry_sdk.capture_exception(e)
            print('sentry flush')
            sentry_sdk.flush()
            print('sys.exit(1)')
            sys.exit(1)
        finally:
            print('call event.log_event begin')
            event.log_event(ctx.command.name, ctx.params, status)
            print('call event.log_event end')
            pass
