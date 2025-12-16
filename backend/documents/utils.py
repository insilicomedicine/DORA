import logging
from typing import Any, Dict, List, Optional, Union
from uuid import UUID

from django.contrib.auth.models import User
from rest_framework.exceptions import APIException

from app.notifications import (
    NotificationStatus,
    NotificationType,
    get_notification_payload,
    send_ws_notification,
)
from documents.deep_research.defs import ChatMessage
from documents.models import Document, DocumentStage, DocumentStatus, Section, SectionStatus
from kernel.agents.ai_action_agent import AIActionAgent
from users.models import AITokenUsageType
from users.record_token_usage import record_token_usage
from users.utils import send_document_generated_email

logger = logging.getLogger(__name__)


def execute_ai_action(
    user: User,
    document: Document,
    action_type: str,
    text: str,
    text_context: str,
    metadata: Optional[List[Dict[str, str]]] = None,
    custom_prompt: Optional[str] = None,
) -> str:
    logger.info("Execute AI action...")

    agent = AIActionAgent(action_type, text, text_context, metadata, custom_prompt)
    try:
        agent_response = agent.process()
    except Exception as exc:
        logger.error(f"Error generating ai action content: {exc}")
        raise APIException("Error execute ai action.")

    record_token_usage(user, document, agent_response.token_usage, AITokenUsageType.AI_ACTION)

    logger.info("Executed AI action.")
    return agent_response.content


def apply_refined(section: Section, refined: bool):
    fields_to_update = {"is_edited": False, "refined_result": None}

    if section.status == SectionStatus.FAILED:
        fields_to_update["status"] = SectionStatus.COMPLETED
    elif refined:
        fields_to_update["result"] = section.refined_result

    section.update_fields(fields_to_update)

    # if all sections are refined, update document stage
    document = section.document
    if all(
        section.refined_result is None and section.status == SectionStatus.COMPLETED
        for section in document.sections.all()
        if not section.is_title
    ):
        document.update_fields(
            {
                "stage": DocumentStage.POLISHED,
                "status": DocumentStatus.COMPLETED,
            }
        )


def replace_multiple_values(values_dict: Dict[str, str], text: str):
    for key, value in values_dict.items():
        text = text.replace(key, value)
    return text


def check_document_not_ready_for_modification(document: Document) -> Optional[str]:
    if (
        document.status == DocumentStatus.IN_PROGRESS
        or document.stage
        not in [DocumentStage.CONTENT_GENERATED, DocumentStage.POLISHED, DocumentStage.POLISHING]
        or (document.stage == DocumentStage.POLISHING and document.status != DocumentStatus.FAILED)
    ):
        return "Document is not ready for modification."
    return None


def check_no_sections_edited(sections: List[Section]) -> Optional[str]:
    if not any([section.is_edited for section in sections]):
        return "Document doesn't have any edited sections."
    return None


def check_sections_with_in_progress_status(sections: List[Section]) -> Optional[str]:
    if SectionStatus.IN_PROGRESS in [section.status for section in sections]:
        return "Document contains sections that are still in progress."
    return None


def get_documents_sections(document_ids: List[Union[str, UUID]]) -> Dict[UUID, List[Dict[str, Any]]]:
    """
    Efficiently fetch sections for multiple documents in a single database query.

    Args:
        document_ids: List of document IDs to fetch sections for

    Returns:
        Dictionary mapping document IDs to their respective top-level sections
        Each section contains nested sub_sections according to the hierarchy
    """
    if not document_ids:
        return {}

    # Fetch all sections for the given documents in a single query
    all_sections = (
        Section.objects.filter(document_id__in=document_ids, is_title=False, deleted_at=None)
        .values("id", "title", "document_id", "parent_id", "status", "refined_result", "slug")
        .order_by("created_at")
    )

    # Create section data structure with proper nesting
    section_map = {}  # Maps section ID to section data
    sections_by_doc = {}  # Maps document ID to list of top-level sections

    # First, initialize all sections and organize by document
    for section in all_sections:
        doc_id = section["document_id"]
        section_id = section["id"]
        parent_id = section["parent_id"]
        status = section["status"]
        refined_result = section["refined_result"]

        # Create section data structure
        section_data = {
            "id": section_id,
            "title": section["title"],
            "sub_sections": [],
            "status": status,
            "is_refined": refined_result is not None,
            "slug": section["slug"],
        }

        # Store in section map for quick lookup
        section_map[section_id] = section_data

        # For top-level sections (parent is None), add to document's section list
        if parent_id is None:
            if doc_id not in sections_by_doc:
                sections_by_doc[doc_id] = []
            sections_by_doc[doc_id].append(section_data)

    # Then, build the hierarchy by connecting children to parents
    for section in all_sections:
        section_id = section["id"]
        parent_id = section["parent_id"]

        # Skip top-level sections as they're already in the right place
        if parent_id is not None and parent_id in section_map:
            # Add this section to its parent's sub_sections list
            section_map[parent_id]["sub_sections"].append(section_map[section_id])

    return sections_by_doc


def send_chat_message_notification(document: Document, chat_message: ChatMessage) -> None:
    """Send notification when a new chat message is received from the agent."""
    notification_data = {"id": str(document.id), "type": NotificationType.CHAT_EVENTS, "data": chat_message}
    ws_notification_args = get_notification_payload(
        user_id=document.created_by.id,
        data=notification_data,
        status=NotificationStatus.SUCCESS,
        message="New chat message received",
    )
    send_ws_notification(**ws_notification_args)


def send_document_generated_notification(document: Document) -> None:
    notification_data = {"id": str(document.id), "type": NotificationType.DOCUMENT_GENERATED}
    ws_notification_args = get_notification_payload(
        user_id=document.created_by.id,
        data=notification_data,
        status=NotificationStatus.SUCCESS,
        message="Research document generated successfully",
    )
    send_ws_notification(**ws_notification_args)
    send_document_generated_email(document)
