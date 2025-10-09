import json
import logging
from typing import Optional, Union

from django.core.cache import cache

logger = logging.getLogger(__name__)


class ResponseCachingMixin:
    """
    Add to some external API integration class like this:
        class APIQuery(ResponseCachingMixin, ...)
    """

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self.__cache_key: Optional[str] = None
        self.__cache_timeout: Optional[int] = None
        self.__is_response_caching_enabled = False

    def init_response_caching(
        self,
        cache_key_based_on: Union[dict, list, str, None],
        cache_key_prefix: str,
        cache_timeout: int,
    ) -> None:
        if cache_key_based_on is None:
            cache_key_based_on = {}

        self.__cache_key = self.__get_cache_key(cache_key_based_on, cache_key_prefix)
        self.__cache_timeout = cache_timeout
        self.__is_response_caching_enabled = True

    @staticmethod
    def __get_cache_key(based_on: Union[dict, list, str], prefix: str) -> str:
        formatted_prefix = prefix.strip().replace(" ", "").lower()
        params = json.dumps(based_on).replace('"', "").replace(" ", "")
        return f"{formatted_prefix}_{params}"

    @property
    def response_caching_enabled(self) -> bool:
        return self.__is_response_caching_enabled

    @property
    def cached_response(self) -> Union[dict, list, None]:
        return cache.get(self.__cache_key)

    @cached_response.setter
    def cached_response(self, data: Union[dict, list]) -> None:
        cache.set(self.__cache_key, data, self.__cache_timeout)

    @cached_response.deleter
    def cached_response(self) -> None:
        cache.delete(self.__cache_key)
