import logging
import time
from typing import Any, List, Optional, Union

import openai
from langchain_core.language_models.base import LanguageModelInput
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, BaseMessage, ToolMessage
from langchain_core.runnables import RunnableConfig
from openai import APIStatusError, BadRequestError

from base.defs.llm import OpenAiApiType

logger = logging.getLogger(__name__)


def gen_missing_tool_messages(messages: List[BaseMessage]) -> List[BaseMessage]:
    if not messages:
        return []

    last_ai_message_index = next(
        (index for index in reversed(range(len(messages))) if isinstance(messages[index], AIMessage)), None
    )
    if last_ai_message_index is None:
        return []

    last_ai_message = messages[last_ai_message_index]
    tool_calls = last_ai_message.additional_kwargs.get("tool_calls", [])
    tool_call_ids = {tool_call["id"] for tool_call in tool_calls}

    responded_tool_call_ids = {
        message.tool_call_id
        for message in messages[last_ai_message_index + 1 :]
        if isinstance(message, ToolMessage)
    }

    missing_responses = tool_call_ids - responded_tool_call_ids

    return [ToolMessage(content="", tool_call_id=missing_id) for missing_id in missing_responses]


class BackupInvokeMixin(BaseChatModel):
    backup_api_type: Union[str, None] = None
    backup_api_key: Union[str, None] = None
    backup_model_name: Union[str, None] = None
    backup_api_version: Union[str, None] = None
    backup_base_url: Union[str, None] = None
    backup_azure_deployment: Union[str, None] = None

    def reload_backup_configs(self) -> bool:
        if self.backup_api_key is None:
            return False

        self.model_name = self.backup_model_name

        if self.backup_api_type == OpenAiApiType.azure:
            client_params = {
                "api_version": self.backup_api_version,
                "azure_endpoint": self.backup_base_url,
                "azure_deployment": self.backup_azure_deployment,
                "api_key": self.backup_api_key,
                "timeout": self.request_timeout,
                "max_retries": self.max_retries,
            }
            self.client = openai.AzureOpenAI(**client_params).chat.completions
        else:
            client_params = {
                "api_key": self.backup_api_key,
                "base_url": self.backup_base_url,
                "timeout": self.request_timeout,
                "max_retries": self.max_retries,
            }
            self.client = openai.OpenAI(**client_params).chat.completions

        return True

    def invoke(
        self,
        input: LanguageModelInput,
        config: Optional[RunnableConfig] = None,
        *,
        stop: Optional[List[str]] = None,
        **kwargs: Any,
    ) -> BaseMessage:
        try:
            return super().invoke(input, config, stop=stop, **kwargs)
        except BadRequestError as exc:
            logger.info(f"<start of input> {input} <end of input>")
            if hasattr(input, "messages"):
                missing_tool_messages = gen_missing_tool_messages(input.messages)
                if missing_tool_messages:
                    logger.error(
                        f"Missing tool messages {exc},  filling with empty tool messages"
                        f" {missing_tool_messages} and retrying"
                    )
                    input.messages.extend(missing_tool_messages)
                    return super().invoke(
                        input,
                        config=config,
                        stop=stop,
                        **kwargs,
                    )
            raise exc
        except APIStatusError as exc:
            previous_model_name = self.model_name
            if self.reload_backup_configs():
                logger.error(
                    f"Error in invoke {previous_model_name}: {exc}, "
                    f"retrying with backup model {self.model_name} in 1 minute, "
                )
                logger.info(f"<start of input> {input} <end of input>")
                time.sleep(60)
                return super().invoke(input, config, stop=stop, **kwargs)
            else:
                raise exc
