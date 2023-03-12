import inquirer.errors as errors
import inquirer.themes as themes
from inquirer.questions import Checkbox as CheckboxQuestion
from inquirer.render.console import ConsoleRender
from inquirer.render.console._checkbox import Checkbox
from inquirer.render.console._confirm import Confirm
from inquirer.render.console._editor import Editor
from inquirer.render.console._list import List
from inquirer.render.console._password import Password
from inquirer.render.console._path import Path
from inquirer.render.console._text import Text
from readchar import key


class HackedConsoleRender(ConsoleRender):
    def render_factory(self, question_type):
        matrix = {
            "text": Text,
            "editor": Editor,
            "password": Password,
            "confirm": Confirm,
            "list": List,
            "checkbox": Checkbox,
            "limited_checkbox": LimitedCheckbox,
            "path": Path,
        }

        if question_type not in matrix:
            raise errors.UnknownQuestionTypeError()
        return matrix.get(question_type)


class LimitedCheckboxQuestion(CheckboxQuestion):
    kind = 'limited_checkbox'

    def __init__(self, name, message="", choices=None, default=None, ignore=False, validate=True, carousel=False,
                 limited=0):
        super().__init__(name, message=message, choices=choices, default=default, ignore=ignore, validate=validate)
        self.carousel = carousel
        if limited > 0 and limited <= len(choices):
            self.limited = limited


class LimitedCheckbox(Checkbox):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.limited = self.question.limited
        if self.limited > 0 and self.limited <= len(self.selection):
            self.selection = self.selection[-self.limited:]

    def process_input(self, pressed):
        question = self.question
        if pressed == key.UP:
            if question.carousel and self.current == 0:
                self.current = len(question.choices) - 1
            else:
                self.current = max(0, self.current - 1)
            return
        elif pressed == key.DOWN:
            if question.carousel and self.current == len(question.choices) - 1:
                self.current = 0
            else:
                self.current = min(len(self.question.choices) - 1, self.current + 1)
            return
        elif pressed == key.SPACE:
            if self.current in self.selection:
                self.selection.remove(self.current)
            else:
                if question.limited != 0 and len(self.selection) == question.limited:
                    self.selection.pop(0)
                self.selection.append(self.current)
        elif pressed == key.LEFT:
            if self.current in self.selection:
                self.selection.remove(self.current)
        elif pressed == key.RIGHT:
            if self.current not in self.selection:
                self.selection.append(self.current)
        elif pressed == key.ENTER:
            result = []
            for x in self.selection:
                value = self.question.choices[x]
                result.append(getattr(value, "value", value))
            raise errors.EndOfInput(result)
        elif pressed == key.CTRL_C:
            raise KeyboardInterrupt()


def prompt_ex(questions, render=None, answers=None, theme=themes.Default(), raise_keyboard_interrupt=False):
    render = render or HackedConsoleRender(theme=theme)
    answers = answers or {}

    try:
        for question in questions:
            answers[question.name] = render.render(question, answers)
        return answers
    except KeyboardInterrupt:
        if raise_keyboard_interrupt:
            raise
        print("")
        print("Cancelled by user")
        print("")
