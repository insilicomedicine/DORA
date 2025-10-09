from typing import List

from django.conf import settings
from langchain_community.callbacks.manager import get_openai_callback
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables.base import RunnableSequence
from openai import APITimeoutError

from base.decorators import retry
from general.defs import ConfigKeyType
from general.models import Config
from kernel.agents.llm_agent import LLMAgent
from kernel.defs import AgentResponse
from users.defs import TokenUsage


class WordFilteringAgent(LLMAgent):
    @retry(times=settings.GENERATION_RETRY_TIMES, exceptions=(APITimeoutError,))
    def process(self, content: str) -> AgentResponse:
        return self.text_filtering(content)

    def text_filtering(self, content: str) -> AgentResponse:
        text_filtering_config = self._get_text_filtering_config()
        words_phrases_list = text_filtering_config.get("words_phrases_list", [])
        filtering_prompt = text_filtering_config.get("prompt", "")

        filtered_texts = [word for word in words_phrases_list if word.lower() in content.lower()]
        if filtered_texts:
            filter_prompt = self._format_filter_prompt(filtering_prompt, content, words_phrases_list)
            return self._execute(filter_prompt)
        else:
            return AgentResponse(
                content=content,
                token_usage=TokenUsage(),
            )

    def _get_text_filtering_config(self) -> dict:
        return Config.get(ConfigKeyType.WORD_FILTERING_FEATURE, {})

    def _format_filter_prompt(self, prompt, content: str, words_phrases_list: List[str]) -> str:
        words_phrases_list = ", ".join(words_phrases_list)
        return prompt.format(words_phrases_list=words_phrases_list, content=content)

    def _execute(self, prompt: str) -> AgentResponse:
        prompt_template = self._get_prompt_template()
        chain = prompt_template | self.llm | self.parser
        return self._invoke_chain(chain, prompt)

    def _invoke_chain(self, chain: RunnableSequence, prompt: str) -> AgentResponse:
        with get_openai_callback() as cb:
            input = {"input": prompt}
            response = chain.invoke(input)
            return AgentResponse(
                content=response,
                token_usage=TokenUsage(
                    prompt_tokens=cb.prompt_tokens,
                    completion_tokens=cb.completion_tokens,
                    total_tokens=cb.total_tokens,
                ),
            )

    def _get_prompt_template(self) -> ChatPromptTemplate:
        return ChatPromptTemplate.from_messages([("user", "{input}")])
