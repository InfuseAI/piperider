class RunEventPayload:

    def __init__(self):
        self.status = False
        self.reason = None
        self.step = None
        self.datasource_type = None
        self.skip_datasource = None
        self.tables = 0
        self.columns = []
        self.rows = []
        self.passed_assertions = 0
        self.failed_assertions = 0
        self.passed_dbt_testcases = 0
        self.failed_dbt_testcases = 0
        self.build_in_assertions = 0
        self.custom_assertions = 0
        self.recommended_assertions = 0

    def to_dict(self):
        return self.__dict__


class CompareEventPayload:

    def __init__(self):
        self.status = False
        self.reason = None
        self.step = None
        self.datasource_type = None
        self.skip_datasource = None

    def to_dict(self):
        return self.__dict__
