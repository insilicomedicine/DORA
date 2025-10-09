from typing import NamedTuple


class ToolRecord(NamedTuple):
    name: str
    input_str: str


class ToolStatus:
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
