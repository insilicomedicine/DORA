from celery import shared_task

from app.celery import app
from kernel.llm_agent_tools.helpers.mcp_client import sync_mcp_server_tools
from kernel.models import MCPServer
from kernel.services.telemetry import instrument_telemetry
from kernel.tasks.decorators import handle_task_timeout_and_error
from kernel.tasks.processing.document import generate_document_content, generate_document_plan
from kernel.tasks.processing.dynamic_section import create_sub_sections
from kernel.tasks.processing.polish import polish_document

instrument_telemetry()


@shared_task
@handle_task_timeout_and_error
def polish_document_task(document_id: str):
    polish_document(document_id)


@shared_task
@handle_task_timeout_and_error
def generate_document_task(document_id: str) -> None:
    create_sub_sections(document_id)
    generate_document_plan(document_id)
    generate_document_content(document_id)


@app.task(name="sync_mcp_server_task")
def sync_mcp_server_task():
    """Daily task to sync tools from all active MCP servers."""
    for server in MCPServer.objects.filter():
        sync_mcp_server_tools(server)
