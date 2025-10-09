import json
import logging
from typing import Any, Dict, List, Tuple

import sentry_sdk

from app.notifications import NotificationType
from bibliography.models import BibliographyType
from documents.models import Document
from documents.transparency.utils import send_ws_transparency_message, serialize_transparency
from kernel.defs import AgentAction
from kernel.models import Tool
from kernel.services.telemetry import telemetry
from kernel.tasks.post_processing.polish import polish_document_content
from kernel.tasks.post_processing.section import create_bibliographies, filter_words
from kernel.utils import capture_and_suppress_exception
from users.defs import TokenUsage
from users.models import AITokenUsageType
from users.record_token_usage import record_token_usage

logger = logging.getLogger(__name__)


def filter_words_for_document(document: Document) -> None:
    logger.info(f"Filtering words for document {document.id}")
    token_usage = TokenUsage()
    for section in document.sections.all():
        if section.is_title or not section.result.get("data", ""):
            continue

        try:
            section_token_usage = filter_words(section)
            token_usage += section_token_usage
        except Exception as exc:
            sentry_sdk.capture_exception(exc)

    record_token_usage(
        document.created_by,
        document,
        token_usage,
        AITokenUsageType.WORD_FILTERING,
    )

    logger.info(f"Filtering words for document {document.id} completed.")


def get_websearch_data_from_agent_actions(
    agent_actions: List[AgentAction],
) -> Dict[Tuple[str, str], Dict[str, Any]]:
    tool_names = [action.tool for action in agent_actions]
    tools = Tool.objects.filter(name__in=tool_names, result_bibliography_type__isnull=False)
    tool_name_to_tool = {tool.name: tool for tool in tools}
    if not tool_name_to_tool:
        return {}

    websearch_data = {}
    for action in agent_actions:
        tool = tool_name_to_tool.get(action.tool)
        if not tool:
            logger.warning(f"Tool {action.tool} not in tool_name_to_tool")
            continue

        if tool.result_bibliography_type == BibliographyType.WEBSEARCH:
            result = json.loads(action.tool_output)
            data = result.get("data", [])
            for item in data:
                websearch_data[(item["bib_id"], item["chunk_id"])] = {
                    "source": item["link"],
                    "title": item["metadata"].get("title", ""),
                    "bib_id": item["bib_id"],
                    "chunk_id": item["chunk_id"],
                    "chunk": item["chunk"],
                }
    return websearch_data


def create_bibliographies_for_document(document: Document, agent_actions: List[AgentAction]) -> None:
    logger.info(f"Creating bibliographies for document {document.id}")

    external_websearch_data = get_websearch_data_from_agent_actions(agent_actions)

    bib_id_chunk_id_list = []
    for section in document.sections.all():
        if section.is_title or not section.result.get("data", ""):
            continue

        section_bib_id_chunk_id_list = create_bibliographies(section, external_websearch_data)
        bib_id_chunk_id_list.extend(section_bib_id_chunk_id_list)

    if bib_id_chunk_id_list:
        document.refresh_bibliographies()

    logger.info(f"Creating bibliographies for document {document.id} completed.")


def update_generation_log(document: Document, message: str) -> None:
    generation_log = document.generation_log or {}
    agents_result = generation_log.get("agents_result", [])
    agents_result.append(
        {
            "text": message,
            "agents": [],
        }
    )
    generation_log["agents_result"] = agents_result
    document.update_fields({"generation_log": generation_log})
    send_ws_transparency_message(
        document, NotificationType.GENERATION_LOG_UPDATED, "generation_log", serialize_transparency(document)
    )


@capture_and_suppress_exception
def post_process_document(document: Document) -> None:
    logger.info(f"Post processing document {document.id}")

    update_generation_log(document, "Document postprocessing...")

    with telemetry(document=document, section=None, task="post_process_document"):
        is_polished = polish_document_content(document)
        if not is_polished:
            filter_words_for_document(document)

    logger.info(f"Post processing document {document.id} completed.")
