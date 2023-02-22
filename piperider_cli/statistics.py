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
        if field not in self.statistic:
            self.statistic[field] = 0
        self.statistic[field] += 1

    def display_statistic(self):
        if self.statistic['total'] == 0:
            return
        console = Console()
        num_skip = sum(self.statistic.values()) - self.statistic['total']
        if num_skip > 0:
            msg = ", ".join([f"{k}={v}" for k, v in self.statistic.items() if k != 'total' and v != 0])
            console.print(f"profile {self.statistic['total'] - num_skip} models, skip {num_skip} models ({msg})\n")
