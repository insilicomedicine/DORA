import concurrent.futures
import logging
from typing import Dict, List, Optional, Tuple

import sentry_sdk
from django.conf import settings
from wrapt_timeout_decorator import timeout

from app.notifications import NotificationType
from base.utils import (
    clean_markdown_format,
    fix_markdown_bullet_points_spacing,
    normalize_bibliography_reference,
)
from documents.models import DiagramType, Document, DocumentStage, DocumentStatus, Section, SectionStatus
from documents.transparency.shortcuts import (
    transparency_log_complete_final_text,
    transparency_log_custom_data_analyze,
    transparency_log_dependencies_analyze,
    transparency_log_plan_analyze,
    transparency_log_section_tools_analyze,
)
from kernel.agents.section_agent import SectionAgent
from kernel.defs import AgentAction, AgentResponse
from kernel.services.telemetry import telemetry
from kernel.tasks.notifications import send_ws_notification_message
from kernel.tasks.post_processing.document import create_bibliographies_for_document, post_process_document
from kernel.tasks.processing.mermaid import generate_mermaid
from kernel.tasks.processing.section import generate_section_content, handle_section_failure
from kernel.utils import topological_sort_sections
from users.models import AITokenUsageType
from users.record_token_usage import record_token_usage
from users.utils import send_document_generated_email

logger = logging.getLogger(__name__)


def complete_document(document: Document, tokens_used: int) -> None:
    document.update_fields({"status": DocumentStatus.COMPLETED, "stage": DocumentStage.CONTENT_GENERATED})
    send_ws_notification_message(document, NotificationType.DOCUMENT_STATUS_UPDATED, "document", tokens_used)
    send_document_generated_email(document)


def update_document_title(document: Document, title: str) -> None:
    try:
        document.update_fields({"title": title})
    except Exception as exc:
        logger.error(f"Error updating document title: {exc}")
        sentry_sdk.capture_exception(exc)


def update_section(
    document: Document,
    section: Section,
    status: SectionStatus,
    agent_response: Optional[AgentResponse],
    error: str,
):
    if agent_response and section.is_title:
        section_content = clean_markdown_format(agent_response.content)
        update_document_title(document, section_content.strip('"'))

    update_fields = {"status": status, "result": {"data": agent_response.content if agent_response else ""}}
    if error:
        generation_log = section.generation_log or {}
        generation_log["error"] = error
        update_fields["generation_log"] = generation_log
    section.update_fields(update_fields)


def process_section(
    document: Document,
    section: Section,
    section_message_map: Dict[str, Dict],
    agent_actions: List[AgentAction] = None,
) -> Tuple[int, SectionStatus, Dict]:
    logger.info(f"Processing section {section.id}")

    transparency_log_section_tools_analyze(section)
    transparency_log_custom_data_analyze(section)
    transparency_log_plan_analyze(section)
    transparency_log_dependencies_analyze(section, document)

    if section.prompt and (
        (section.dynamic_template_subsection and not section.sub_sections.exists())
        or not section.dynamic_template_subsection
    ):
        with telemetry(document, section, "generate_document_content"):
            (
                agent_response,
                section_status,
                section_error,
                section_messages,
            ) = generate_section_content(document, section, section_message_map, agent_actions)
    else:
        (
            agent_response,
            section_status,
            section_error,
            section_messages,
        ) = (
            None,
            SectionStatus.COMPLETED,
            "",
            {},
        )

    update_section(document, section, section_status, agent_response, section_error)

    if agent_response:
        record_token_usage(
            section.document.created_by,
            section,
            agent_response.token_usage,
            AITokenUsageType.GEN_SECTION,
        )

    total_tokens = agent_response.token_usage.total_tokens if agent_response else 0

    transparency_log_complete_final_text(section)
    send_ws_notification_message(document, NotificationType.SECTION_STATUS_UPDATED, "section", total_tokens)

    if section_status == SectionStatus.FAILED:
        logger.error(f"Process section {section.id} failed")
        handle_section_failure(document)
        return total_tokens, SectionStatus.FAILED, section_messages

    logger.info(f"Section {section.id} processed successfully")
    return total_tokens, section_status, section_messages


def correct_document_formatting(document: Document) -> None:
    logger.info(f"Correcting formatting for document {document.id}")

    for section in document.sections.all():
        section_content = (section.result or {}).get("data", "")
        if not section_content or section.is_title:
            continue

        section_content = section.result.get("data", "")
        section_content = fix_markdown_bullet_points_spacing(section_content)
        section_content = normalize_bibliography_reference(section_content)
        section.result = {"data": section_content}
        section.save()

    logger.info(f"Correcting formatting for document {document.id} completed.")


@timeout(settings.GENERATION_TASK_TIMEOUT, use_signals=True)
def generate_document_plan(document_id):
    document: Document = Document.objects.get(id=document_id)
    sections = document.sections.all().filter(requires_plan=True).exclude(slug=None)
    sections = [section for section in sections if not section.display_on_plan_overview]
    if not sections:
        return

    logger.info(f"Document {document_id} plan generating...")

    plan_tokens_used = 0

    for section in sections:
        with telemetry(document, section, "generate_document_plan"):
            section_agent = SectionAgent(section)
            agent_response = section_agent.generate_plan()

        section.update_fields({"status": SectionStatus.INITIALIZED, "plan": agent_response.content})
        plan_tokens_used += agent_response.token_usage.total_tokens

        record_token_usage(
            document.created_by,
            section,
            agent_response.token_usage,
            AITokenUsageType.GEN_PLAN,
        )

        document.refresh_from_db()
        if document.is_deleted:
            return

    send_ws_notification_message(document, NotificationType.DOCUMENT_PLAN_UPDATED, "plan", plan_tokens_used)
    logger.info(f"Document {document_id} plan generated.")


@timeout(settings.GENERATION_TASK_TIMEOUT, use_signals=True)
def generate_document_content(document_id: str) -> None:
    logger.info(f"Generating document {document_id} content...")

    document_tokens_used = 0
    document: Document = Document.objects.get(id=document_id)
    sections = document.sections.all().exclude(slug=None)
    section_slug_map = {section.slug: section for section in sections}
    section_generation_levels = topological_sort_sections(document.get_section_dependencies())

    section_message_map = {}
    agent_actions: List[AgentAction] = []
    with concurrent.futures.ThreadPoolExecutor() as executor:
        for level in section_generation_levels:
            future_to_section = {
                executor.submit(
                    process_section,
                    document,
                    section_slug_map[section_slug],
                    section_message_map,
                    agent_actions,
                ): section_slug
                for section_slug in level
            }
            for future in concurrent.futures.as_completed(future_to_section):
                section_slug = future_to_section[future]
                try:
                    section_tokens_used, section_status, section_messages = future.result()
                except Exception as exc:
                    logger.error(f"Error generating section {section_slug} content: {exc}")
                    sentry_sdk.capture_exception(exc)
                    return
                else:
                    document_tokens_used += section_tokens_used

                    section_message_map[section_slug] = section_messages

                    if section_status == SectionStatus.FAILED:
                        return

            # if document is deleted, stop generating sections and return
            document.refresh_from_db()
            if document.is_deleted:
                return

    post_process_document(document)
    correct_document_formatting(document)
    create_bibliographies_for_document(document, agent_actions)
    generate_mermaid(document, DiagramType.FLOWCHART)
    complete_document(document, document_tokens_used)

    logger.info(f"Document {document_id} content generated.")
