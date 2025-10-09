from typing import Optional

from langchain_core.tools import BaseTool
from pydantic import Field, create_model

from general.defs import ToolSourceEnum
from kernel.agents.utils import get_type
from kernel.llm_agent_tools.helpers.mappings import internal_tools_mapping
from kernel.llm_agent_tools.tool_dynamic import MCPDynamicTool, PandaomicsDynamicTool
from kernel.models import Tool


def get_tool_instance(tool_name: str) -> Optional[BaseTool]:
    tool_setting: Tool = Tool.objects.filter(name=tool_name).first()

    if not tool_setting:
        return

    if tool_setting.source == ToolSourceEnum.LOCAL:
        tool_class = internal_tools_mapping.get(tool_name)
        tool = tool_class()
        tool.description = tool_setting.description
    elif tool_setting.source == ToolSourceEnum.PANDOMICS:
        tool = PandaomicsDynamicTool(name=tool_name, description=tool_setting.description)
    elif tool_setting.source == ToolSourceEnum.MCP:
        tool = MCPDynamicTool(
            name=tool_name,
            description=tool_setting.description,
            args_schema=tool_setting.args,
        )
    else:
        tool = None

    if not tool:
        return

    if not tool.args_schema:
        tool.args_schema = create_model(
            "InputModel",
            **{
                arg["name"]: (get_type(arg["type"]), Field(description=arg["description"]))
                for arg in tool_setting.args
            },
        )
    return tool
