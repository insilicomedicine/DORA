import logging
from typing import Dict, List

from django.conf import settings
from django.core.cache import cache
from langchain_openai import AzureOpenAIEmbeddings, OpenAIEmbeddings

from base.defs.llm import OpenAiApiType

logger = logging.getLogger(__name__)


def validate_embedding_openai_api_configs(configs: Dict, is_azure: bool) -> None:
    required_keys = ["model", "api_key"]

    if is_azure:
        required_keys += ["version", "deployment_name", "base_url"]

    if not configs:
        raise ValueError("Invalid embedding config. Must be a list of dictionaries.")
    for config in configs:
        if not isinstance(config, dict):
            raise ValueError("Invalid embedding config. Must be a dictionary.")
        for key in required_keys:
            if not config.get(key):
                raise ValueError(f"Invalid embedding config. Missing {key}.")


class RoundRobinConfigSelector:
    def __init__(self, key: str, config_list: List[dict]):
        self.cache = cache
        self.key = key
        self.config_list = config_list

    def get_next_index(self):
        current_value = self.cache.get(self.key)
        if current_value is None:
            current_value = 0
            self.cache.set(self.key, current_value, timeout=60 * 60)
        index = (self.cache.incr(self.key) - 1) % len(self.config_list)
        return index

    def get_next_config(self):
        index = self.get_next_index()
        logger.info(f"Config {self.key} {index} selected")
        return self.config_list[index]


def init_embedding_model() -> AzureOpenAIEmbeddings:
    embedding_round_robin_selector = RoundRobinConfigSelector(
        key="embedding_model_index", config_list=settings.EMBEDDING_OPENAI_API_CONFIGS
    )
    embedding_config = embedding_round_robin_selector.get_next_config()
    if settings.OPENAI_API_TYPE == OpenAiApiType.azure:
        return AzureOpenAIEmbeddings(
            model=embedding_config["model"],
            azure_endpoint=embedding_config["base_url"],
            openai_api_version=embedding_config["version"],
            deployment=embedding_config["deployment_name"],
            openai_api_key=embedding_config["api_key"],
        )
    else:
        return OpenAIEmbeddings(
            model=embedding_config["model"],
            api_key=embedding_config["api_key"],
            base_url=embedding_config["base_url"],
        )
