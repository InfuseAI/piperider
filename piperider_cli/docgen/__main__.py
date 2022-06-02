import click
import pathlib
from piperider_cli.cli import cli

md_base_template = """
# {command_name}
{description}
## Usage
```
{usage}
```
## Options
{options}
## CLI Help
```
{help}
```
"""


def _recursive_help(cmd, parent=None):
    ctx = click.core.Context(cmd, info_name=cmd.name, parent=parent)

    yield {"command": cmd, "help": cmd.get_help(ctx), "parent": parent.info_name if parent else '',
           "usage": cmd.get_usage(ctx),
           "params": cmd.get_params(ctx),
           "options": cmd.collect_usage_pieces(ctx)}

    commands = getattr(cmd, 'commands', {})
    for sub in commands.values():
        for helpdct in _recursive_help(sub, ctx):
            yield helpdct


def _strtype(type):
    if isinstance(type, click.types.Path):
        return "Path"

    return str(type)


def _dump_helper(base_command, docs_dir):
    """ Dumping help usage files from Click Help files into an md """
    docs_path = pathlib.Path(docs_dir)
    for helpdct in _recursive_help(base_command):
        command = helpdct.get("command")
        helptxt = helpdct.get("help")
        usage = helpdct.get("usage")
        parent = helpdct.get("parent", "") or ''
        options = {
            opt.name: {
                "usage": '\n'.join(opt.opts),
                "prompt": opt.prompt,
                "required": opt.required,
                "default": opt.default,
                "help": opt.help,
                "type": _strtype(opt.type)
            }
            for opt in helpdct.get('params', [])
        }
        full_command = f"{str(parent) + ' ' if parent else ''}{str(command.name)}"

        md_template = md_base_template.format(
            command_name=full_command,
            description=command.help,
            usage=usage,
            options="\n".join([
                f"* `{opt_name}`{' (REQUIRED)' if opt.get('required') else ''}: \n"
                f"  * Type: {opt.get('type')} \n"
                f"  * Default: `{str(opt.get('default')).lower()}`\n"
                f"  * Usage: `{opt.get('usage')}`\n"
                "\n"
                f"  {opt.get('help') or ''}\n"
                f"\n"
                for opt_name, opt in options.items()
            ]),
            help=helptxt
        )

        if not docs_path.exists():
            # Create md file dir if needed
            docs_path.mkdir(parents=True, exist_ok=False)

        md_file_path = docs_path.joinpath(full_command.replace(' ', '-').lower() + '.md').absolute()

        # Create the file per each command
        with open(md_file_path, 'w') as md_file:
            md_file.write(md_template)


def generate_docs():
    docs_path = "docs/commands"
    _dump_helper(cli, docs_dir=docs_path)
    print(f"doc generated at '{docs_path}'")


if __name__ == '__main__':
    generate_docs()
