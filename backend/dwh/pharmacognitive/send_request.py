import logging
import os
from typing import Callable, Optional

import requests
import sentry_sdk
from django.conf import settings
from django.core.cache import cache
from requests.exceptions import RequestException, Timeout

from app.settings import PHARMACOGNITIVE_MAX_REQUEST_TIMEOUT
from base.defs.pharmacognitive import (
    API_V1_VERSION,
    API_V2_VERSION,
    CACHING_TIME,
    PC_API_URL_V1,
    PC_API_V2_TOKEN,
    PHARMACOGNITIVE_API_URL,
)

logger = logging.getLogger(__name__)


def _get_url(version: str, path: Optional[str] = None) -> str:
    if version == API_V1_VERSION:
        return PC_API_URL_V1
    elif version == API_V2_VERSION:
        if not path:
            raise ValueError("The path must be specified for V2 API")

        return os.path.join(PHARMACOGNITIVE_API_URL, version, path)
    else:
        raise ValueError("Unsupported PC API version")


def _get_headers(version: str) -> dict:
    if version == API_V2_VERSION:
        return {"headers": {"Authorization": f"Bearer {PC_API_V2_TOKEN}"}}
    return {}


def _get_payload_by_method(method: Callable, params: dict) -> dict:
    if method == requests.get:
        return {"params": params}
    elif method == requests.post:
        return {"json": params}
    else:
        raise ValueError("Unsupported method for PC API")


def _get_request_params(
    version: str,
    method: Callable,
    path: Optional[str],
    params: dict,
) -> dict:
    request_params = {
        "url": _get_url(version=version, path=path),
        "timeout": PHARMACOGNITIVE_MAX_REQUEST_TIMEOUT,
        **_get_headers(version),
        **_get_payload_by_method(method=method, params=params),
    }

    return request_params


def _send_request(
    method: Callable, request_params: dict, expected_timeout: Optional[float]
) -> Optional[dict]:
    try:
        if expected_timeout:
            request_params["timeout"] = expected_timeout
        response = method(**request_params)

        response.raise_for_status()
    except Timeout as exc:
        if expected_timeout:
            logger.info(f"PharmaCognitive request timed out after {expected_timeout} seconds")
        else:
            logger.error(f"PharmaCognitive request timed out: {str(exc)}")
            sentry_sdk.capture_exception(exc)
        return None
    except RequestException as exc:
        logger.error(f"Cannot connect to PharmaCognitive: {str(exc)}")
        sentry_sdk.capture_exception(exc)
        return None

    if not response.ok:
        logger.warning(f"PharmaCognitive query failed: {response.text} (HTTP {response.status_code})")
        return None

    if not (data := response.json()):
        logger.error("PharmaCognitive query failed: no json data in response")
        return None

    if isinstance(data, dict) and data.get("error"):
        logger.error(f"PharmaCognitive query failed: {data.get('error')}")
        return None

    return data


def send_request(
    params: dict,
    version: str = API_V1_VERSION,
    method: Callable = requests.post,
    path: Optional[str] = None,
    expected_timeout: Optional[float] = None,
    use_cache: bool = settings.PHARMACOGNITIVE_CACHING_ENABLED,
) -> Optional[dict]:
    cache_key = f"pc_{version}_{method}_{params}"

    if use_cache and (data := cache.get(cache_key)):
        return data

    request_params = _get_request_params(
        version=version,
        method=method,
        path=path,
        params=params,
    )

    logger.info(f"Sending request to PharmaCognitive with params: {params}")
    data = _send_request(method, request_params, expected_timeout=expected_timeout)

    if data and use_cache:
        cache.set(cache_key, data, CACHING_TIME)

    return data
