import logging
from typing import Any, Dict, List, Optional
from urllib.parse import urljoin

from django.conf import settings
from requests.exceptions import ConnectionError, Timeout
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_fixed

from base.defs.http import HttpRequestMethod
from dwh.external_api.base_request import ExternalAPIRequest

logger = logging.getLogger(__name__)


class DwhEndpointConfig:
    DEFAULT_HTTP_METHOD = HttpRequestMethod.GET

    def __init__(
        self,
        url: str,
        endpoint: str,
        schema_objects: List[Any],
    ) -> None:
        self.url = ""
        self.api_version = ""
        self.http_method: Optional[str] = None

        self._url = url
        self._endpoint = endpoint
        self._schema_objs = schema_objects or []

    @staticmethod
    def _get_api_version_from_schema(schema: Dict[Any, Any]) -> str:
        try:
            server_url = schema["servers"][0]["url"]
            version = server_url.split("/")[-1]
        except (AttributeError, KeyError):
            version = ""

        return version

    def _get_http_method_from_schema(self, schema: Dict[Any, Any]) -> Optional[str]:
        try:
            return list(schema["paths"].get(self._endpoint).keys())[0]
        except (AttributeError, KeyError):
            return None

    def configure(self) -> None:
        for schema_obj in self._schema_objs:
            schema = schema_obj.get_json_schema()
            if self._endpoint in schema.get("paths", {}).keys():
                self.api_version = self._get_api_version_from_schema(schema)
                self.http_method = self._get_http_method_from_schema(schema)
                break
        else:
            self.http_method = self.DEFAULT_HTTP_METHOD

        path = self.api_version + self._endpoint if self.api_version else self._endpoint.lstrip("/")
        self.url = urljoin(self._url, path)


class DwhRequest(ExternalAPIRequest):
    API_NAME = "DWH API"

    @retry(
        reraise=True,
        retry=retry_if_exception_type((ConnectionError, Timeout)),
        stop=stop_after_attempt(settings.EXTERNAL_API_MAX_RETRIES),
        wait=wait_fixed(settings.EXTERNAL_API_RETRY_WAIT),
    )
    def send_request(self) -> Dict[Any, Any]:
        return super().send_request()
