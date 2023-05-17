from rich.console import Console


class Statistics:
    _instance = None
    statistic = {}

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def reset(self):
        self.statistic = {}

    def add_field(self, field: str, num: int):
        if field not in self.statistic:
            self.statistic[field] = 0
        self.statistic[field] += num

    def add_field_one(self, field: str):
        self.add_field(field, 1)

    def display_statistic(self, action, subject):
        console = Console()
        if self.statistic.get('total', 0) == 0:
            console.print(f"No {subject}s to {action}")
            return
        num_skip = sum(self.statistic.values()) - self.statistic['total']
        if self.statistic['total'] - num_skip == 0:
            console.print(f"No {subject}s to {action}")
        elif num_skip > 0:
            subject = subject + 's' if num_skip > 1 else subject
            msg = ", ".join([f"{k}={v}" for k, v in self.statistic.items() if k != 'total' and v != 0])
            console.print(
                f"{action} {self.statistic['total'] - num_skip} {subject}, skip {num_skip} {subject} ({msg})\n")
