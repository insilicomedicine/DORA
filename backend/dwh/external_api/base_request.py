from typing import Any, Dict, List, Optional, Tuple, Union

import requests
from django.conf import settings
from requests.auth import AuthBase
from requests.exceptions import HTTPError, RequestException

from base.defs.http import HttpRequestMethod
from base.utils import is_json


class ExternalAPIRequest:
    """
    External API request base class

    :param api_url: string, full path including api_key if it is required as param,
                    for example: https://resource.org/api/endpoint?api_key=1234567
                    or: https://resource.org/api/{api_key}/endpoint
    :param api_method: string, lowercase HTTP method
    :param params: (optional) dict, list of tuples or None
    :param auth_hook: (optional) auth hook as implemented in requests library
    :raises: RequestException in case of connection problems or HTTP error response
    """

    API_NAME: Optional[str] = None
    SUPPORTED_METHODS: Tuple[str, str] = (HttpRequestMethod.GET, HttpRequestMethod.POST)

    def __init__(
        self,
        api_url: str,
        api_method: str,
        params: Union[Dict[Any, Any], List[Tuple[str, Any]], None] = None,
        auth_hook: Optional[AuthBase] = None,
    ) -> None:
        if not self.API_NAME:
            raise NotImplementedError("API_NAME must be defined in a child class")

        if api_method not in self.SUPPORTED_METHODS:
            raise ValueError(f"{self.API_NAME} error: unsupported method {api_method}")

        self._url = api_url
        self._method = api_method
        self._params = params
        self._auth = auth_hook

    def _format_params_dict(self) -> Dict[str, Any]:
        if self._method == HttpRequestMethod.GET:
            return {"params": self._params}
        elif self._method == HttpRequestMethod.POST:
            return {"json": self._params}
        else:
            return {"data": self._params}

    def send_request(self) -> Dict[Any, Any]:
        response = None

        try:
            response = requests.request(
                method=self._method,
                url=self._url,
                auth=self._auth,
                timeout=settings.EXTERNAL_API_MAX_REQUEST_TIMEOUT,
                **self._format_params_dict(),
            )
            response.raise_for_status()
        except HTTPError as exc:
            err_msg = response.json() if response is not None and is_json(response.text) else None
            err_description = err_msg or self._strip_sensitive_data(str(exc))
            raise RequestException(f"{self.API_NAME} error: {err_description}")

        return response.json()

    def _strip_sensitive_data(self, msg: str) -> str:
        return msg.replace(f" for url: {self._url}", "")
