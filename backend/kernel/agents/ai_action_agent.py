import json
import logging
from typing import Dict, List, Optional

from langchain_community.callbacks.manager import get_openai_callback
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_core.runnables.base import RunnableSequence

from general.defs import ConfigKeyType
from general.models import Config
from kernel.agents.llm_agent import LLMAgent
from kernel.defs import AgentResponse
from users.defs import TokenUsage

logger = logging.getLogger(__name__)


class AIActionAgent(LLMAgent):
    def __init__(
        self,
        action_type: str,
        text: str,
        text_context: str,
        metadata: Optional[List[Dict[str, str]]] = None,
        custom_prompt: Optional[str] = None,
    ) -> None:
        super().__init__()

        self.action_type = action_type
        self.text = text
        self.text_context = text_context
        self.metadata = metadata
        self.custom_prompt = custom_prompt

    def process(self) -> AgentResponse:
        messages = self._get_prompt_messages()
        return self._execute(messages)

    def _get_prompt_messages(self) -> List[BaseMessage]:
        ai_actions_config = self._get_ai_actions_config()
        action_prompts = ai_actions_config.get(self.action_type)
        if not action_prompts or not isinstance(action_prompts, dict):
            raise Exception(f"No prompts found for {self.action_type}")

        system_message_tpl, human_message_tpl = (
            action_prompts.get("system_message"),
            action_prompts.get("human_message"),
        )
        if not system_message_tpl or not human_message_tpl:
            raise Exception(f"No system or human message found for {self.action_type}")

        system_message = system_message_tpl.format(
            text=self.text,
            text_context=self.text_context,
            metadata=json.dumps(self.metadata) if self.metadata else None,
            custom_action=self.custom_prompt,
        )
        human_message = human_message_tpl.format(
            text=self.text,
            text_context=self.text_context,
            metadata=json.dumps(self.metadata) if self.metadata else None,
            custom_action=self.custom_prompt,
        )
        return [SystemMessage(content=system_message), HumanMessage(content=human_message)]

    def _get_ai_actions_config(self) -> dict:
        return Config.get(ConfigKeyType.AI_ACTIONS_PROMPTS, {})

    def _execute(self, messages: List[BaseMessage]) -> AgentResponse:
        chain = self.llm | self.parser
        return self._invoke_chain(chain, messages)

    def _invoke_chain(self, chain: RunnableSequence, messages: List[BaseMessage]) -> AgentResponse:
        with get_openai_callback() as cb:
            response = chain.invoke(messages)
            return AgentResponse(
                content=response,
                token_usage=TokenUsage(
                    prompt_tokens=cb.prompt_tokens,
                    completion_tokens=cb.completion_tokens,
                    total_tokens=cb.total_tokens,
                ),
            )
