from enum import Enum


class HttpRequestMethod(str, Enum):
    GET = "get"
    POST = "post"
    PUT = "put"
    DELETE = "delete"
    PATCH = "patch"

    @classmethod
    def get_valid_choices(cls) -> tuple:
        methods = [method.value for method in cls]
        return tuple(zip(methods, methods))
