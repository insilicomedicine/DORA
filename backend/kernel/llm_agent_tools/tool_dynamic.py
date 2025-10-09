import logging
from typing import Any

import sentry_sdk
from django.conf import settings
from langchain_core.tools import BaseTool
from mcp.types import CallToolResult, TextContent

from kernel.llm_agent_tools.defs import MAX_EXECUTION_COUNT_REACHED_MESSAGE
from kernel.llm_agent_tools.helpers.mcp_client import mcp_call_tool
from kernel.models import MCPServer, Tool
from kernel.services.pandaomics_client import call_pandaomics_api

logger = logging.getLogger(__name__)


class DynamicTool(BaseTool):
    use_execution_limit: int = settings.TOOL_EXECUTION_COUNT_LIMIT
    max_execution_count: int = settings.TOOL_MAX_EXECUTION_COUNT
    execution_count: int = 0

    def _check_execution_limit(self):
        if self.use_execution_limit:
            if self.execution_count >= self.max_execution_count:
                return MAX_EXECUTION_COUNT_REACHED_MESSAGE.format(tool_name=self.name)
            self.execution_count += 1

    def _run(self, **kwargs) -> Any:
        raise NotImplementedError


class PandaomicsDynamicTool(DynamicTool):
    def _run(self, **kwargs) -> Any:
        if message := self._check_execution_limit():
            return message

        tool_setting: Tool = Tool.objects.filter(name=self.name).first()
        if tool_setting:
            response = call_pandaomics_api(
                http_method=tool_setting.method,
                api_endpoint=tool_setting.path,
                json=kwargs,
            )
            try:
                result = response.json()
                return result.get("data")
            except Exception as e:
                logger.error(f"Error calling tool: {e}")


class MCPDynamicTool(DynamicTool):
    def _run(self, **kwargs) -> Any | list[Any]:
        if message := self._check_execution_limit():
            return message

        tool_setting: Tool = Tool.objects.filter(name=self.name).first()
        if not tool_setting:
            logger.error(f"Tool '{self.name}' not found")
            return None

        mcp_server: MCPServer = MCPServer.objects.filter(tools=tool_setting).first()
        if not mcp_server:
            logger.error(f"No MCP server found for tool '{self.name}'")
            return None

        response: CallToolResult = mcp_call_tool(
            url=mcp_server.url,
            token=mcp_server.api_key,
            tool_name=tool_setting.path,
            tool_args=kwargs,
        )
        try:
            data: list[str] = [
                content.text for content in response.content if isinstance(content, TextContent)
            ]
            return data[0] if len(data) == 1 else data
        except Exception as exp:
            sentry_sdk.capture_exception(exp)
            return None
