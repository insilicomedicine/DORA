import asyncio

from django.utils import timezone
from mcp import ClientSession
from mcp.client.sse import sse_client

from general.defs import ConfigKeyType, ToolSourceEnum
from general.models import Config
from kernel.models import MCPServer, Tool


def mcp_call_tool(url: str, token: str, tool_name: str, tool_args: dict):
    async def aio_mcp_call_tool():
        async with sse_client(url=url, headers={"Authorization": f"Bearer {token}"}) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                resp = await session.call_tool(tool_name, tool_args)
                return resp

    return asyncio.run(aio_mcp_call_tool())


def mcp_list_tools(url: str, token: str):
    headers = {"Authorization": f"Bearer {token}"} if token else None

    async def aio_mcp_list_tools():
        async with sse_client(url=url, headers=headers) as (read, write):
            async with ClientSession(read, write) as session:
                await session.initialize()
                resp = await session.list_tools()
                return resp

    return asyncio.run(aio_mcp_list_tools())


def sync_mcp_server_tools(server: MCPServer):
    result_bibliography_types = Config.get(ConfigKeyType.MCP_TOOL_RESULT_BIBLIOGRAPHY_TYPES, {})
    tools_data = mcp_list_tools(server.url, server.api_key)
    for tool_data in tools_data.tools:
        tool_name = f"{server.name}_{tool_data.name}"
        result_bibliography_type = result_bibliography_types.get(tool_name)
        tool, _ = Tool.objects.update_or_create(
            name=tool_name,
            defaults={
                "description": tool_data.description,
                "source": ToolSourceEnum.MCP.value,
                "args": tool_data.inputSchema,
                "path": tool_data.name,
                "result_bibliography_type": result_bibliography_type,
            },
        )
        server.tools.add(tool)
    server.last_sync = timezone.now()
    server.save()
