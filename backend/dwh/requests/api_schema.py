import logging
import os
from typing import Any, Dict, Optional
from urllib.parse import urljoin

from django.conf import settings

from base.defs.core import CACHE_TIMEOUT_HOUR
from base.defs.http import HttpRequestMethod
from base.defs.pharmacognitive import API_KEY_PLACEHOLDER, API_V1_VERSION, API_V2_VERSION
from dwh.external_api.auth import BearerAuth, add_api_key_to_url
from dwh.external_api.base_request import ExternalAPIRequest
from dwh.external_api.dwh import DwhEndpointConfig
from dwh.requests.response_caching import ResponseCachingMixin

logger = logging.getLogger(__name__)


OPENAPI_SCHEMA_FILE = "openapi.json"


class DwhSchema(ResponseCachingMixin, ExternalAPIRequest):
    API_NAME = "DWH OpenAPI Schema"

    def __init__(self, version: str, **kwargs: Any) -> None:
        super().__init__(**kwargs)
        self._version = version

    def get_json_schema(self) -> Optional[Dict[str, Any]]:
        if settings.PHARMACOGNITIVE_CACHING_ENABLED:
            self.init_response_caching(
                cache_key_based_on=self._version,
                cache_key_prefix=self.API_NAME,
                cache_timeout=CACHE_TIMEOUT_HOUR,
            )

        if self.response_caching_enabled and (cached_response := self.cached_response):
            return cached_response  # type: ignore

        logger.warning(f"Sending request to {self.API_NAME} to get API schema")
        schema = self.send_request()

        if self.response_caching_enabled and schema:
            self.cached_response = schema

        return schema


def get_api_schema_lazy(url: str, version: str) -> DwhSchema:
    return DwhSchema(
        api_url=urljoin(url, os.path.join(version, OPENAPI_SCHEMA_FILE)),
        api_method=HttpRequestMethod.GET,
        version=version,
    )


def get_dwh_endpoint_config(endpoint: str) -> Dict[str, Any]:
    url = settings.PHARMACOGNITIVE_API_URL
    bearer_token = settings.PHARMACOGNITIVE_API_KEY

    api_key = settings.PC_API_SECONDARY_KEY

    cfg_obj = DwhEndpointConfig(
        url=url,
        endpoint=endpoint,
        schema_objects=[
            get_api_schema_lazy(url=url, version=API_V2_VERSION),
            get_api_schema_lazy(url=url, version=API_V1_VERSION),
        ],
    )
    cfg_obj.configure()

    config: Dict[Any, Any] = {"api_method": cfg_obj.http_method}

    if cfg_obj.api_version == API_V2_VERSION:
        config.update({"api_url": cfg_obj.url, "auth_hook": BearerAuth(bearer_token)})
    else:
        url_config = {
            "api_url": urljoin(cfg_obj.url, API_KEY_PLACEHOLDER),
            "api_key": api_key,
        }
        config.update({"api_url": add_api_key_to_url(**url_config), "auth_hook": None})

    return config
