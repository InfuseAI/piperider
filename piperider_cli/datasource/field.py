import os
from abc import ABCMeta, abstractmethod

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
                 optional=False):
        self.name = name
        self.type = type
        self.default = default
        self.description = description if not optional else f'{description} (optional)'
        self.value = value
        self.optional = optional
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

    def question_by_rich(self):
        default = self.default
        password = False
        is_path = False

        if self.type == 'password':
            password = True
        elif self.type == 'path':
            is_path = True
        elif self.type == 'number':
            default = str(default)

        while True:
            console = Console()
            answer = Prompt.ask(f'[[yellow]?[/yellow]] {self.description}', password=password, default=default)
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
                 optional=False):
        super().__init__(name, "text", value, default, description, validate, optional)

    def question(self):
        return inquirer.Text(self.name, message=self.description, default=self.default, validate=self.validate)


class PathField(DataSourceField):
    def __init__(self, name, value=None, default=None, description=None, validate=_default_validate_func,
                 optional=False):
        super().__init__(name, "path", value, default, description, validate, optional)

    def question(self):
        return inquirer.Path(self.name, message=self.description, default=self.default, exists=True)


class NumberField(DataSourceField):
    def __init__(self, name, value=None, default=None, description=None, validate=_default_validate_func,
                 optional=False):
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
        super().__init__(name, "number", value, default, description, validate, optional)

    def question(self):
        return inquirer.Text(self.name, message=self.description, default=str(self.default), validate=self.validate)


class PasswordField(DataSourceField):
    def __init__(self, name, value=None, default=None, description=None, validate=_default_validate_func,
                 optional=False):
        super().__init__(name, "password", value, default, description, validate, optional)

    def question(self):
        return inquirer.Password(self.name, message=self.description, default=self.default, validate=self.validate)
