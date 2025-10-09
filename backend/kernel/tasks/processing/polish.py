import json
import logging
from typing import Dict, List, Tuple

import sentry_sdk
from django.conf import settings
from wrapt_timeout_decorator import timeout

from app.notifications import NotificationType
from base.utils import fix_markdown_bullet_points_spacing, normalize_bibliography_reference
from documents.models import Document, DocumentStage, DocumentStatus, Section, SectionStatus
from kernel.agents.section_agent import SectionAgent
from kernel.services.telemetry import telemetry
from kernel.tasks.notifications import send_ws_notification_message
from users.defs import TokenUsage
from users.models import AITokenUsageType
from users.record_token_usage import record_token_usage

logger = logging.getLogger(__name__)


def get_prior_sub_sections(section: Section) -> List[str]:
    if not section.parent:
        return []

    sub_sections = [
        section.key for section in Section.objects.filter(parent=section.parent).order_by("created_at")
    ]
    index = sub_sections.index(section.key)
    return sub_sections[:index]


def get_prior_sections(
    section: Section, dependency_map: Dict[str, List[str]], shared_memory: Dict[str, List[str]]
) -> List[str]:
    prior_sections = get_prior_sub_sections(section)

    if section.slug:
        for source_map in (dependency_map, shared_memory):
            dependency_sections = source_map.get(section.slug, [])
            for dependency_section in dependency_sections:
                if dependency_section not in prior_sections:
                    prior_sections.append(dependency_section)
    return prior_sections


def get_prior_sections_text(
    section: Section,
    dependency_map: Dict[str, List[str]],
    shared_memory: Dict[str, List[str]],
    changed_sections_map: Dict[str, str],
) -> str:
    prior_sections = get_prior_sections(section, dependency_map, shared_memory)

    prior_sections_map = {
        changed_sections_map[section_key]["title"]: changed_sections_map[section_key]["content"]
        for section_key in prior_sections
        if section_key in changed_sections_map
    }
    return json.dumps(prior_sections_map) if prior_sections_map else ""


def update_polish_section_fields(section: Section, section_content: str, token_usage: TokenUsage) -> None:
    section.update_fields(
        {
            "status": SectionStatus.COMPLETED,
            "refined_result": {
                "data": section_content,
                "metadata": section.result.get("metadata"),
            },
        }
    )
    record_token_usage(
        section.document.created_by,
        section,
        token_usage,
        AITokenUsageType.POLISH_SECTION,
    )


def handle_polish_section_failure(document: Document, section: Section, error: Exception) -> None:
    logger.error(f"Error polishing section content: {error}")
    sentry_sdk.capture_exception(error)

    generation_log = section.generation_log or {}
    generation_log["error"] = error
    section.update_fields({"status": SectionStatus.FAILED, "generation_log": generation_log})
    document.sections.filter(status=SectionStatus.IN_PROGRESS).update(status=SectionStatus.FAILED)
    document.update_fields({"stage": DocumentStage.POLISHING, "status": DocumentStatus.FAILED})


def polish_section(document: Document, section: Section, prior_sections_text: str) -> Tuple[str, int]:
    try:
        section_agent = SectionAgent(section)
        agent_response = section_agent.polish(prior_sections_text)

        section_content = fix_markdown_bullet_points_spacing(agent_response.content)
        section_content = normalize_bibliography_reference(section_content)

        update_polish_section_fields(section, section_content, agent_response.token_usage)
        return section_content, agent_response.token_usage.total_tokens
    except Exception as exc:
        handle_polish_section_failure(document, section, exc)
        raise exc


def update_polish_changed_sections_map(
    section: Section, section_content: str, changed_sections_map: Dict[str, Dict[str, str]]
) -> None:
    changed_sections_map[section.key] = {
        "title": section.title,
        "content": section_content,
    }
    if section.parent:
        parent_key = section.parent.key
        if parent_key in changed_sections_map:
            changed_sections_map[parent_key]["content"] += f"\n{section_content}"
        else:
            changed_sections_map[parent_key] = {
                "title": section.parent.title,
                "content": section_content,
            }


@timeout(settings.GENERATION_TASK_TIMEOUT, use_signals=True)
def polish_document(document_id: str) -> None:
    logger.info(f"Document {document_id} polishing...")

    document_tokens_used = 0
    document: Document = Document.objects.get(id=document_id)
    ordered_sections: List[Section] = document.polish_ordered_sections()
    dependency_map = document.sections_dependency_map
    shared_memory = document.shared_memory
    changed_sections_map: Dict[str, Dict[str:str]] = {}

    has_polishable_sections = False

    for section in ordered_sections:
        if not section.prompt or not (section.result or {}).get("data"):
            section.update_fields({"status": SectionStatus.COMPLETED})
            continue

        has_polishable_sections = True
        prior_sections_text = get_prior_sections_text(
            section, dependency_map, shared_memory, changed_sections_map
        )

        with telemetry(document, section, "polish_section"):
            section_content, tokens_used = polish_section(document, section, prior_sections_text)

        update_polish_changed_sections_map(section, section_content, changed_sections_map)

        document_tokens_used += tokens_used
        send_ws_notification_message(
            document, NotificationType.SECTION_STATUS_UPDATED, "section", tokens_used
        )

    document_updates = {"status": DocumentStatus.COMPLETED}
    if not has_polishable_sections:
        document_updates["stage"] = DocumentStage.POLISHED
    document.update_fields(document_updates)

    send_ws_notification_message(
        document, NotificationType.DOCUMENT_POLISH_UPDATED, "document", document_tokens_used
    )

    logger.info(f"Document {document_id} polished.")
