import logging
from typing import Any, Dict, Optional

from langchain_core.agents import AgentAction, AgentFinish
from langchain_core.callbacks.base import BaseCallbackHandler


class LogCallbackHandler(BaseCallbackHandler):
    def __init__(self, logger: logging.Logger) -> None:
        self.logger = logger

    def on_chain_start(self, serialized: Dict[str, Any], inputs: Dict[str, Any], **kwargs: Any) -> None:
        if serialized:
            class_name = serialized.get("name", serialized.get("id", ["<unknown>"])[-1])
            self.logger.info(f"\n\n\033[1m> Entering new {class_name} chain...\033[0m")

    def on_chain_end(self, outputs: Dict[str, Any], **kwargs: Any) -> None:
        self.logger.info("\n\033[1m> Finished chain.\033[0m")

    def on_agent_action(self, action: AgentAction, color: Optional[str] = None, **kwargs: Any) -> Any:
        self.logger.info(action.log)

    def on_tool_end(
        self,
        output: Any,
        color: Optional[str] = None,
        observation_prefix: Optional[str] = None,
        llm_prefix: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        output = str(output)
        if observation_prefix is not None:
            self.logger.info(f"\n{observation_prefix}")
        self.logger.info(repr(output))
        if llm_prefix is not None:
            self.logger.info(f"\n{llm_prefix}")

    def on_text(
        self,
        text: str,
        color: Optional[str] = None,
        end: str = "",
        **kwargs: Any,
    ) -> None:
        self.logger.info(f"{text}{end}")

    def on_agent_finish(self, finish: AgentFinish, color: Optional[str] = None, **kwargs: Any) -> None:
        self.logger.info(f"{finish.log}\n")
