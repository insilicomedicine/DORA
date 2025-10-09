import logging

import requests
import sentry_sdk
from django.conf import settings
from yarl import URL

# Use level=logging.WARNING to remove info messages
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PandaomicsClientSettings:
    def __init__(self, host) -> None:
        self.base_url = URL(host)
        logger.warning(f"Attention! You use {host}")


class PandaomicsAPIClient:
    def __init__(
        self,
        token: str,
        pandaomics_client_settings: PandaomicsClientSettings,
        use_ssl: bool = True,
    ) -> None:
        self.token = token
        self.__validate_token()

        self.pandaomics_client_settings = pandaomics_client_settings
        self._use_ssl = use_ssl
        self.session = requests.Session()

    @staticmethod
    def _format_response_info(response: requests.Response) -> str:
        return f"http_code={response.status_code}, text={response.text}"

    @staticmethod
    def _format_params_dict(method: str, params: dict) -> dict:
        if method == "GET":
            return {"params": params}
        elif method == "POST":
            return {"json": params}
        else:
            return {"data": params}

    def __validate_token(self) -> None:
        if not self.token:
            logger.error("Attention! You must specify token!")

    def __make_request(self, method: str, url: str, **kwargs) -> requests.Response:
        params = kwargs.pop("params", {})
        if params:
            formatted_params = self._format_params_dict(method, params)
            kwargs.update(**formatted_params)

        if method == "POST" and "data" in kwargs:
            logger.warning(
                "You're using 'data=' argument with POST method which can lead to"
                " truncation of some keys with dict-formatted request data. Consider"
                " using 'params=' argument which will convert your request arguments"
                " the right way (as JSON body)"
            )

        response = self.session.request(
            method=method,
            url=url,
            verify=self._use_ssl,
            headers={"Authorization": f"Bearer {self.token}"},
            **kwargs,
        )

        try:
            response.raise_for_status()
        except Exception as exc:
            logger.error(f"request failed: {self._format_response_info(response)}, reason: {exc}")
            sentry_sdk.capture_exception(exc)
        return response

    def call_api(self, http_method, api_endpoint, params=None, **kwargs) -> requests.Response:
        url = str(self.pandaomics_client_settings.base_url) + api_endpoint
        return self.__make_request(
            method=http_method,
            url=url,
            params=params,
            **kwargs,
        )


def call_pandaomics_api(
    http_method: str,
    api_endpoint: str,
    params: dict = None,
    **kwargs,
) -> requests.Response:
    client_settings = PandaomicsClientSettings(settings.PANDAOMICS_CLIENT_API_BASE)
    pandora_client = PandaomicsAPIClient(
        token=settings.PANDAOMICS_CLIENT_TOKEN,
        pandaomics_client_settings=client_settings,
        use_ssl=settings.PANDAOMICS_CLIENT_USE_SSL,
    )
    return pandora_client.call_api(http_method, api_endpoint, params, **kwargs)
