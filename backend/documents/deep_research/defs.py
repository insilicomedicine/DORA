from enum import Enum
from typing import List, Literal, TypedDict


class ChatCot(TypedDict):
    title: str | None
    content: str


class ChatMessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"


class ChatMessageType(str, Enum):
    MESSAGE = "message"
    COT = "cot"
    ERROR = "error"


class ChatMessage(TypedDict):
    role: Literal[ChatMessageRole.USER, ChatMessageRole.ASSISTANT]
    type: Literal[ChatMessageType.MESSAGE, ChatMessageType.COT, ChatMessageType.ERROR]
    id: str
    content: str | None
    done: bool
    cot: List[ChatCot] | None
    error: str | None
