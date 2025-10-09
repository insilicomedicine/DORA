import logging
from typing import Any, Dict, List, Optional, Tuple, Union

import sentry_sdk
from requests import RequestException

from dwh.external_api.dwh import DwhRequest
from dwh.requests.api_schema import get_dwh_endpoint_config

logger = logging.getLogger(__name__)


def make_dwh_api_request(
    endpoint: str,
    params: Union[Dict[Any, Any], List[Tuple[str, Any]], None] = None,
) -> Optional[Dict[Any, Any]]:
    dwh = DwhRequest(
        params=params,
        **get_dwh_endpoint_config(endpoint=endpoint),
    )
    try:
        result = dwh.send_request()
    except RequestException as exc:
        logger.error(f"DWH query failed: endpoint={endpoint}, params={params}, exception={str(exc)}")
        sentry_sdk.capture_exception(exc)
        return None

    if err_msg := result.get("error"):
        logger.error(f"DWH query failed: endpoint={endpoint}, params={params}, reason={err_msg}")
        return None

    return result


class BaseDwhRequest:
    endpoint = ""

    def __init__(self, **kwargs) -> None:
        self._params = kwargs

    def make_request(self) -> Any:
        logger.debug(f"Making DWH request to {self.endpoint} with params {self._params}")

        response = make_dwh_api_request(endpoint=self.endpoint, params=self._params)
        if response is None:
            raise ValueError("Failed to retrieve data from DWH")

        try:
            data, _ = response["data"], response["total"]
        except KeyError:
            raise ValueError(f"Unexpected response from DWH: {response}")

        return data
