import os
import sys
import traceback
import typing as t
import time

import sentry_sdk
from click.core import Command, Context, Group
from rich.console import Console
from rich.markup import escape

from piperider_cli import event
from piperider_cli.error import PipeRiderError
from piperider_cli.guide import Guide

_enable_trackback: bool = os.environ.get('PIPERIDER_PRINT_TRACKBACK') == '1'

guide = Guide()

beta_message = '(Experimental)'


class BetaGroup(Group):
    def __init__(self, *args, **kwargs):
        kwargs['hidden'] = not os.environ.get('PIPERIDER_BETA', 'false').lower() == 'true'
        if kwargs.get('short_help'):
            kwargs['short_help'] = f'{beta_message} {kwargs["short_help"]}'
        super().__init__(*args, **kwargs)


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
        beta: bool = False,
    ) -> None:
        if beta:
            short_help = f'{beta_message} {short_help}'
        super(TrackCommand, self).__init__(name, context_settings, callback, params, help, epilog, short_help,
                                           options_metavar, add_help_option, no_args_is_help, hidden, deprecated)

    def _show_error_message(self, msg, params):
        console = Console()
        if params.get('debug'):
            console.print_exception(show_locals=True)
        else:
            console.print('[bold red]Error:[/bold red] ', end='')
            console.out(msg, highlight=False)

    def _show_hint_message(self, hint):
        console = Console()
        console.print(f'[bold yellow]Hint[/bold yellow]:\n  {escape(hint)}')

    def invoke(self, ctx: Context) -> t.Any:
        status = False
        start_time = time.time()

        try:
            self._apply_project_parameters(ctx)

            ret = super(TrackCommand, self).invoke(ctx)
            if ret is None or ret == 0:
                guide.show_tips(ctx.command.name)
                status = True
                reason = 'ok'
            else:
                reason = 'error'
            return ret
        except SystemExit as e:
            reason = 'error'
            raise e
        except KeyboardInterrupt as e:
            reason = 'aborted'
            raise e
        except Exception as e:
            if _enable_trackback:
                print(traceback.format_exc())

            if isinstance(e, PipeRiderError):
                if e.hint:
                    self._show_hint_message(e.hint)

            ignored = False
            if isinstance(e, EOFError):
                ignored = True
                self._show_error_message(
                    f"The '{ctx.command.name}' command could not be executed "
                    f"due to the unavailability of STDIN, which is required to receive user input.", ctx.params)

                if ctx.command.name in ['login', 'select_project']:
                    self._show_hint_message("""
Consider using the following options to select a project:

    - To automatically select the first project, use `--no-interaction` option.
    - To select a specific project, use the `--project` option by the project name.
                    """.strip())
            else:
                ignored = False
                self._show_error_message(e, ctx.params)

            if not ignored:
                event.capture_exception(e)
                reason = 'fatal'
            else:
                reason = 'error'
            event.flush_exceptions()
            sys.exit(1)
        finally:
            end_time = time.time()
            duration = end_time - start_time
            props = dict(
                command=ctx.command.name,
                status=status,
                reason=reason,
                duration=duration,
                upload=ctx.params.get('upload', False),
                share=ctx.params.get('share', False),
            )

            event.log_event(props, 'usage', params=ctx.params)

            event.flush_events(ctx.command.name)

    def _apply_project_parameters(self, ctx):
        # sc-30888 use PIPERIDER_API_PROJECT if `--project` did not set
        if 'project' in ctx.params and ctx.params.get('project') is None:
            ctx.params['project'] = os.environ.get('PIPERIDER_API_PROJECT')
