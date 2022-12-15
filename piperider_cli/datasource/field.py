import os
from abc import ABCMeta, abstractmethod
from typing import List, Callable

import inquirer
from rich.console import Console
from rich.prompt import Prompt


def _default_validate_func(answer, current) -> bool:
    if current is None:
        return False
    if isinstance(current, str):
        return current.strip() != ''
    return True


class DataSourceField(metaclass=ABCMeta):

    def __init__(self, name, type, value=None, default=None, description=None, validate=_default_validate_func,
                 optional=False, ignore=False):
        self.name = name
        self.type = type
        self.default = default
        self.description = description if not optional else f'{description} (optional)'
        self.value = value
        self.optional = optional
        self.ignore = ignore
        self.callback: Callable = None
        if not isinstance(ignore, bool) and not isinstance(ignore, Callable):
            raise ValueError('ignore must be a callable function or a boolean type')
        if optional is True:
            self.validate = True
        else:
            self.validate = validate

    def get(self):
        return self.value

    def set(self, value):
        self.value = value

    @abstractmethod
    def question(self):
        raise NotImplementedError

    def choose_by_rich(self):
        choices = self.default
        console = Console()
        console.print(f'[[yellow]?[/yellow]] Please choose one of the following {self.description}:')
        i = 0
        for v in choices:
            console.print(f'  [green]{i + 1}[/green]: {v}')
            i += 1

        while True:
            try:
                type_idx = Prompt.ask('[[yellow]?[/yellow]] Select a number')
                type_idx = int(type_idx)
            except Exception:
                type_idx = 0
            if type_idx > len(choices) or type_idx < 1:
                console.print('    [[red]Error[/red]] Input is not a valid index value. Please try again.')
            else:
                answer = choices[type_idx - 1]
                break
        return answer if answer is not None else ''

    def question_by_rich(self, answers):
        default = self.default
        password = False
        is_path = False

        ignore = self.ignore
        if isinstance(ignore, bool) and ignore is True or isinstance(ignore, Callable) and ignore(answers):
            return None
        if isinstance(default, Callable):
            default = default(answers)

        if self.type == 'password':
            password = True
        elif self.type == 'path':
            is_path = True
        elif self.type == 'number':
            default = str(default)
        elif self.type == 'list':
            return self.choose_by_rich()

        console = Console()
        while True:
            answer = Prompt.ask(f'[[yellow]?[/yellow]] {self.description}', password=password, default=default)
            if is_path and answer:
                answer = os.path.expanduser(answer)
            if self.validate is None \
                or (isinstance(self.validate, bool) and self.validate is True) \
                or self.validate(None,
                                 answer):
                # Passed validation
                if is_path is True and os.path.exists(answer) is False:
                    console.print('    [[red]Error[/red]] Input path does not exist.')
                    continue
                break
            else:
                if answer is None:
                    console.print('    [[red]Error[/red]] Input value is required. Please try again.')
                else:
                    console.print(f'    [[red]Error[/red]] Invalid input: {answer}')
        return answer if answer is not None else ''


class TextField(DataSourceField):
    def __init__(self, name, value=None, default=None, description=None, validate=_default_validate_func,
                 optional=False, ignore=False):
        super().__init__(name, "text", value, default, description, validate, optional, ignore)

    def question(self):
        return inquirer.Text(self.name, message=self.description, default=self.default, validate=self.validate,
                             ignore=self.ignore)


class PathField(DataSourceField):
    def __init__(self, name, value=None, default=None, description=None, validate=_default_validate_func,
                 optional=False, ignore=False):
        super().__init__(name, "path", value, default, description, validate, optional, ignore)

    def question(self):
        return inquirer.Path(self.name, message=self.description, default=self.default, normalize_to_absolute_path=True,
                             exists=True, ignore=self.ignore)


class NumberField(DataSourceField):
    def __init__(self, name, value=None, default=None, description=None, validate=_default_validate_func,
                 optional=False, ignore=False):
        def _is_numeric_func(answer, current) -> bool:
            return current.strip().isnumeric()

        def _is_numeric_or_empty_func(answer, current) -> bool:
            return current.strip().isnumeric() or current == ''

        if value and not (isinstance(value, int) or isinstance(value, float)):
            raise ValueError("Value must be a number")
        if default and not (isinstance(default, int) or isinstance(default, float)):
            raise ValueError("Default value must be a number")
        if optional:
            validate = _is_numeric_or_empty_func
        else:
            validate = _is_numeric_func
        super().__init__(name, "number", value, default, description, validate, optional, ignore)

    def question(self):
        return inquirer.Text(self.name, message=self.description, default=str(self.default), validate=self.validate,
                             ignore=self.ignore)


class PasswordField(DataSourceField):
    def __init__(self, name, value=None, default=None, description=None, validate=_default_validate_func,
                 optional=False, ignore=False):
        super().__init__(name, "password", value, default, description, validate, optional, ignore)

    def question(self):
        return inquirer.Password(self.name, message=self.description, default=self.default, validate=self.validate,
                                 ignore=self.ignore)


class ListField(DataSourceField):
    def __init__(self, name, value=None, default=None, description=None, validate=_default_validate_func,
                 optional=False, ignore=False):
        if not isinstance(default, List):
            raise ValueError("[ListField] default must be a list. Please provide the choices in default.")
        super().__init__(name, "list", value, default, description, validate, optional, ignore)

    def question(self):
        return inquirer.List(self.name, message=self.description, choices=self.default, validate=self.validate,
                             ignore=self.ignore)
