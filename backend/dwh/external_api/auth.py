from requests import PreparedRequest
from requests.auth import AuthBase


def add_api_key_to_url(api_url: str, api_key: str) -> str:
    return api_url.format(api_key=api_key)


class BearerAuth(AuthBase):
    def __init__(self, token: str) -> None:
        self.token = token

    def __call__(self, request: PreparedRequest) -> PreparedRequest:
        request.headers["Authorization"] = "Bearer " + self.token
        return request
