import os
import sys
import traceback
import typing as t

import sentry_sdk
from click.core import Command, Context
from rich.console import Console

from piperider_cli import event

_enable_trackback: bool = os.environ.get('PIPERIDER_PRINT_TRACKBACK') == '1'


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
        status = False
        try:
            ret = super(TrackCommand, self).invoke(ctx)
            status = True
            return ret
        except Exception as e:
            if _enable_trackback:
                print(traceback.format_exc())
            self._show_error_message(e, ctx.params)
            sentry_sdk.capture_exception(e)
            sentry_sdk.flush()
            sys.exit(1)
        finally:
            event.log_event(ctx.command.name, ctx.params, status)
            pass
