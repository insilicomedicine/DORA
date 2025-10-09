from typing import Any, Callable, Dict, List, Optional
from uuid import UUID

from langchain_core.callbacks import BaseCallbackHandler

from documents.transparency.defs import ToolRecord, ToolStatus
from documents.transparency.utils import create_tool_level_record, hash_md5


class TransparencyCallbackHandler(BaseCallbackHandler):
    def __init__(
        self,
        callback_writer: Callable,
    ):
        self._last_tool: Optional[ToolRecord] = None
        self.callback_writer = callback_writer

    def on_tool_start(
        self,
        serialized: Dict[str, Any],
        input_str: str,
        *,
        run_id: UUID,
        parent_run_id: Optional[UUID] = None,
        tags: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None,
        inputs: Optional[Dict[str, Any]] = None,
        **kwargs: Any,
    ) -> Any:
        self._last_tool = ToolRecord(serialized["name"], input_str)
        self.callback_writer(
            create_tool_level_record(
                hashid=hash_md5(self._last_tool.name + self._last_tool.input_str),
                tool_title=self._last_tool.name,
                message=self._last_tool.input_str,
                status=ToolStatus.IN_PROGRESS,
            )
        )

    def on_tool_end(
        self,
        output: Any,
        color: Optional[str] = None,
        observation_prefix: Optional[str] = None,
        llm_prefix: Optional[str] = None,
        **kwargs: Any,
    ) -> None:
        if self._last_tool:
            self.callback_writer(
                create_tool_level_record(
                    hashid=hash_md5(self._last_tool.name + self._last_tool.input_str),
                    tool_title=self._last_tool.name,
                    message=self._last_tool.input_str,
                    status=ToolStatus.COMPLETED,
                    result=output if output else None,
                )
            )
