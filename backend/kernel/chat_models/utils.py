from django.conf import settings
from langchain_openai.chat_models.base import BaseChatOpenAI

from base.defs.llm import OpenAiApiType
from kernel.chat_models.models import AzureChatOpenAIWithBackup, ChatOpenAIWithBackup


def init_llm(temperature: float = 0.2) -> BaseChatOpenAI:
    # Use fixed temperature if configured (e.g., for GPT-5 which requires temperature=1.0)
    temperature = settings.OPENAI_API_FIXED_TEMPERATURE or temperature

    if settings.OPENAI_API_TYPE == OpenAiApiType.azure:
        return AzureChatOpenAIWithBackup(
            temperature=temperature,
            model=settings.OPENAI_API_MODEL,
            azure_endpoint=settings.OPENAI_API_BASE_URL,
            deployment_name=settings.OPENAI_API_DEPLOYMENT_NAME,
            openai_api_version=settings.OPENAI_API_VERSION,
            openai_api_key=settings.OPENAI_API_KEY,
            openai_api_type=settings.OPENAI_API_TYPE,
            request_timeout=settings.OPENAI_API_TIMEOUT,
            # backup
            backup_api_type=settings.BACKUP_OPENAI_API_TYPE,
            backup_model_name=settings.BACKUP_OPENAI_API_MODEL,
            backup_api_version=settings.BACKUP_OPENAI_API_VERSION,
            backup_azure_deployment=settings.BACKUP_OPENAI_API_DEPLOYMENT_NAME,
            backup_api_key=settings.BACKUP_OPENAI_API_KEY,
            backup_base_url=settings.BACKUP_OPENAI_API_BASE_URL,
        )
    else:
        return ChatOpenAIWithBackup(
            temperature=temperature,
            model=settings.OPENAI_API_MODEL,
            openai_api_key=settings.OPENAI_API_KEY,
            openai_api_base=settings.OPENAI_API_BASE_URL,
            request_timeout=settings.OPENAI_API_TIMEOUT,
            # backup
            backup_api_type=settings.BACKUP_OPENAI_API_TYPE,
            backup_model_name=settings.BACKUP_OPENAI_API_MODEL,
            backup_api_version=settings.BACKUP_OPENAI_API_VERSION,
            backup_azure_deployment=settings.BACKUP_OPENAI_API_DEPLOYMENT_NAME,
            backup_api_key=settings.BACKUP_OPENAI_API_KEY,
            backup_base_url=settings.BACKUP_OPENAI_API_BASE_URL,
        )


def init_llm_mini(temperature: float = 0.2) -> BaseChatOpenAI:
    if not settings.MINI_OPENAI_API_KEY:
        return init_llm(temperature)

    # Use fixed temperature if configured (e.g., for GPT-5 which requires temperature=1.0)
    temperature = settings.MINI_OPENAI_API_FIXED_TEMPERATURE or temperature

    if settings.OPENAI_API_TYPE == OpenAiApiType.azure:
        return AzureChatOpenAIWithBackup(
            temperature=temperature,
            model=settings.MINI_OPENAI_API_MODEL,
            azure_endpoint=settings.MINI_OPENAI_API_BASE_URL,
            deployment_name=settings.MINI_OPENAI_API_DEPLOYMENT_NAME,
            openai_api_version=settings.MINI_OPENAI_API_VERSION,
            openai_api_key=settings.MINI_OPENAI_API_KEY,
            openai_api_type=settings.OPENAI_API_TYPE,
            request_timeout=settings.OPENAI_API_TIMEOUT,
            # backup
            backup_api_type=settings.BACKUP_OPENAI_API_TYPE,
            backup_model_name=settings.BACKUP_MINI_OPENAI_API_MODEL,
            backup_api_version=settings.BACKUP_MINI_OPENAI_API_VERSION,
            backup_azure_deployment=settings.BACKUP_MINI_OPENAI_API_DEPLOYMENT_NAME,
            backup_api_key=settings.BACKUP_MINI_OPENAI_API_KEY,
            backup_base_url=settings.BACKUP_MINI_OPENAI_API_BASE_URL,
        )
    else:
        return ChatOpenAIWithBackup(
            temperature=temperature,
            model=settings.OPENAI_API_MODEL,
            openai_api_key=settings.OPENAI_API_KEY,
            openai_api_base=settings.OPENAI_API_BASE_URL,
            request_timeout=settings.OPENAI_API_TIMEOUT,
            # backup
            backup_api_type=settings.BACKUP_OPENAI_API_TYPE,
            backup_model_name=settings.BACKUP_OPENAI_API_MODEL,
            backup_api_version=settings.BACKUP_OPENAI_API_VERSION,
            backup_azure_deployment=settings.BACKUP_OPENAI_API_DEPLOYMENT_NAME,
            backup_api_key=settings.BACKUP_OPENAI_API_KEY,
            backup_base_url=settings.BACKUP_OPENAI_API_BASE_URL,
        )
