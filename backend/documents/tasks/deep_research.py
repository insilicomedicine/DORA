import logging
import re
import time
import uuid
from datetime import timedelta
from typing import Dict, List, Optional, Tuple

from celery import shared_task
from django.conf import settings
from django.db import models
from django.utils import timezone
from openai import APIError, OpenAI
from openai.types.responses import Response
from openai.types.responses.response_output_text import Annotation
from pydantic import BaseModel, Field

from bibliography.models import Bibliography
from documents.deep_research.defs import ChatCot, ChatMessage, ChatMessageRole, ChatMessageType
from documents.models import (
    DiagramType,
    Document,
    DocumentResearchSession,
    DocumentStage,
    DocumentStatus,
    ResearchSessionStatus,
    Section,
    SectionStatus,
)
from documents.utils import send_chat_message_notification, send_document_generated_notification
from general.defs import ConfigKeyType
from general.models import Config
from kernel.chat_models.utils import init_llm
from kernel.tasks.processing.mermaid import generate_mermaid

logger = logging.getLogger(__name__)


NON_TEXT_CHUNK_ID = "00000000-0000-0000-0000-000000000000"
PROCESSING_TIMEOUT_SECONDS = 600  # Timeout for processing to prevent stuck sessions
SESSION_EXPIRATION_SECONDS = 3600  # Expiration time for sessions (1 hour)
RESPONSE_RETRY_INTERVAL_SECONDS = 2  # Interval between retries when checking response status
RESPONSE_RETRY_TIMEOUT_SECONDS = 30 * 60  # Maximum time to wait for response completion (30 minutes)
COLLECTION_SYSTEM_MESSAGE_KEY = "collection_system_message"
RESEARCH_SYSTEM_MESSAGE_KEY = "research_system_message"
RESEARCH_USER_MESSAGE_KEY = "research_user_message"


class CollectionResponse(BaseModel):
    """Structured response from information collection phase."""

    display_message: str = Field(
        description="Friendly message to display to the user, including follow-up questions if needed"
    )
    is_ready_for_research: bool = Field(description="Whether information collection is complete")
    research_brief: Optional[str] = Field(default=None, description="Complete research brief if ready")


def _extract_title_from_report(full_content: str) -> Tuple[Optional[str], str]:
    """Extract title from report content and return both title and content without title.

    The report format is expected to start with: "# Title\n...\nContent"

    Args:
        full_content: The full report content including title

    Returns:
        A tuple of (title, content_without_title). If no title is found, returns (None, full_content)
    """
    # Pattern to match "# Title\n" at the beginning
    # Using \n+ to match one or more newlines for flexibility
    title_pattern = r"^# (.+?)\n+"
    title_match = re.match(title_pattern, full_content)

    if title_match:
        title = title_match.group(1).strip()  # Extract and clean the title text

        # Remove markdown bold syntax (**...**) if present
        bold_pattern = r"^\*\*(.+)\*\*$"
        bold_match = re.match(bold_pattern, title)
        if bold_match:
            title = bold_match.group(1).strip()

        content_without_title = full_content[title_match.end() :]  # Remove the matched part
        return title, content_without_title

    return None, full_content


def _parse_cot_message(message_content: str) -> Optional[ChatCot]:
    """Parse COT (Chain of Thought) message content to extract title and content.

    Extract the markdown bold title and the remaining content.
    Otherwise, return empty title with full content.

    Args:
        message_content: Raw message content string

    Returns:
        ChatCot dict with title and content fields, or None if empty
    """
    # Extract title from markdown bold (between ** and **)
    title_match = re.match(r"\*\*([^*]+)\*\*", message_content)
    if title_match:
        title = title_match.group(1).strip()
        # Content is everything after the title line
        content = message_content[title_match.end() :].strip()
    else:
        # No bold title found, use empty title and full content
        title = None
        content = message_content

    if not title and not content:
        return None

    return ChatCot(title=title, content=content)


def _prepare_web_bibliography_data(
    citations: List[Annotation],
) -> Tuple[Dict[str, str], Dict[Tuple[str, str], Dict[str, str]]]:
    """Prepare web bibliography data from citations.

    Args:
        citations: List of citation annotations from OpenAI response

    Returns:
        Tuple of (citation_bib_id_url_mapping, web_data)
    """
    citation_bib_id_url_mapping = {}
    url_bib_id_mapping = {}
    web_data = {}

    for citation in citations:
        url = citation.url
        title = citation.title or ""
        bib_id = url_bib_id_mapping.setdefault(url, str(uuid.uuid4()))
        citation_bib_id_url_mapping[bib_id] = url
        web_data[(bib_id, NON_TEXT_CHUNK_ID)] = {
            "source": url,
            "title": title,
            "chunk": None,
        }

    return citation_bib_id_url_mapping, web_data


def _build_citation_replacement_mapping(
    citation_bib_id_url_mapping: Dict[str, str], bib_chunk_id_mapping: Dict[Tuple[str, str], Tuple[str, str]]
) -> Dict[str, str]:
    """Build citation text replacement mapping.

    Args:
        citation_bib_id_url_mapping: Mapping from bib_id to URL
        bib_chunk_id_mapping: Mapping from (bib_id, chunk_id) to (new_bib_id, new_chunk_id)

    Returns:
        Mapping from URL to replacement text
    """
    url_bib_id_mapping = {}
    for (bib_id, _), (new_bib_id, new_chunk_id) in bib_chunk_id_mapping.items():
        citation_text = citation_bib_id_url_mapping.get(bib_id)
        if citation_text:
            url_bib_id_mapping[citation_text] = f"BIB_ID:{new_bib_id}, CHUNK_ID:{new_chunk_id}"

    return url_bib_id_mapping


def _replace_citations_in_content(content: str, url_bib_id_mapping: Dict[str, str]) -> str:
    """Replace citation texts in content with bibliography references.

    Args:
        content: Content containing citation URLs
        url_bib_id_mapping: Mapping from URL to replacement text

    Returns:
        Content with citations replaced
    """
    # Pattern that handles URLs containing parentheses
    # Matches: [text](url) where url can contain balanced parentheses like (20)
    # (?:[^()\s]|\([^()]*\))+ matches either non-paren/non-space chars or balanced parens
    pattern = r"\[([^\]]+?)\]\((https?://(?:[^()\s]|\([^()]*\))+)\)"
    return re.sub(pattern, lambda match: url_bib_id_mapping.get(match.group(2), ""), content)


def _replace_with_web_bibliographies(citations: List[Annotation], content: str) -> str:
    """Replace Azure AI URL citations with bibliography references.

    Args:
        citations: List of citation annotations from OpenAI response
        content: Content containing citation URLs

    Returns:
        Content with citations replaced by bibliography references
    """
    citation_bib_id_url_mapping, web_data = _prepare_web_bibliography_data(citations)
    bib_chunk_id_mapping = Bibliography.update_and_create_web_bibliographies(web_data)
    url_bib_id_mapping = _build_citation_replacement_mapping(
        citation_bib_id_url_mapping, bib_chunk_id_mapping
    )
    return _replace_citations_in_content(content, url_bib_id_mapping)


def _create_openai_client() -> OpenAI:
    """Create and configure OpenAI client for deep research.

    Returns:
        Configured OpenAI client instance
    """
    o3_deep_research_api_key = settings.O3_DEEP_RESEARCH_API_KEY
    o3_deep_research_api_endpoint = settings.O3_DEEP_RESEARCH_API_ENDPOINT
    if not o3_deep_research_api_key or not o3_deep_research_api_endpoint:
        raise ValueError("O3 Deep Research API key or endpoint is not set")
    return OpenAI(
        api_key=o3_deep_research_api_key,
        base_url=o3_deep_research_api_endpoint,
    )


def _get_research_system_and_user_messages() -> Tuple[str, str]:
    """Get and validate research system and user messages from config.

    Returns:
        Tuple of (research system message, research user message)

    Raises:
        ValueError: If research system message or research user message not found in configuration
    """
    deep_research_prompts = Config.get(ConfigKeyType.DEEP_RESEARCH_PROMPTS, {})
    research_system_message = deep_research_prompts.get(RESEARCH_SYSTEM_MESSAGE_KEY)
    research_user_message_template = deep_research_prompts.get(RESEARCH_USER_MESSAGE_KEY)
    if not research_system_message or not research_user_message_template:
        raise ValueError("Research system message or research user message not found in config")
    return research_system_message, research_user_message_template


def _create_streaming_response(
    client: OpenAI,
    research_system_message: str,
    research_user_message: str,
    previous_response_id: Optional[str] = None,
):
    """Create streaming response from OpenAI API.

    Args:
        client: Configured OpenAI client
        research_system_message: The research system message
        research_user_message: The research user message
        previous_response_id: Optional response ID to continue from a previous incomplete response

    Returns:
        Streaming response iterator
    """
    create_params = {
        "model": settings.O3_DEEP_RESEARCH_MODEL,
        "instructions": research_system_message,
        "input": research_user_message if not previous_response_id else "Continue",
        "stream": True,
        "background": True,
        "reasoning": {"summary": "detailed"},
        "tools": [
            {"type": "web_search_preview"},
        ],
        "timeout": settings.O3_DEEP_RESEARCH_TIMEOUT,
    }

    if previous_response_id:
        create_params["previous_response_id"] = previous_response_id

    return client.responses.create(**create_params)


def _execute_research_with_retry(
    client: OpenAI,
    research_system_message: str,
    research_user_message: str,
    doc_research_session: DocumentResearchSession,
    max_retries: int = 3,
) -> Optional[Response]:
    """Execute research with retry logic for API errors.

    This function handles OpenAI API errors during both streaming response creation
    and event processing. It will retry up to max_retries times, continuing from
    the last response_id if available.

    Args:
        client: Configured OpenAI client
        research_system_message: The research system message
        research_user_message: The research user message
        doc_research_session: Research session to get/update response_id
        max_retries: Maximum number of retry attempts (default: 3)

    Returns:
        Completed response if received from streaming events, None otherwise

    Raises:
        Exception: If all retry attempts fail
    """

    previous_response_id = doc_research_session.response_id
    last_error = None

    for attempt in range(max_retries):
        try:
            logger.info(
                f"Executing research for session {doc_research_session.id}, "
                f"attempt {attempt + 1}/{max_retries}, "
                f"previous_response_id: {previous_response_id}"
            )

            # Create streaming response (may continue from previous response)
            streaming_response = _create_streaming_response(
                client,
                research_system_message,
                research_user_message,
                previous_response_id=previous_response_id,
            )

            # Process streaming events (may also fail)
            completed_response = _process_streaming_events(streaming_response, doc_research_session)

            # If we reach here, both steps succeeded
            logger.info(f"Research execution completed successfully for session {doc_research_session.id}")
            return completed_response

        except APIError as e:
            last_error = e
            logger.warning(
                f"API error on attempt {attempt + 1}/{max_retries} "
                f"for session {doc_research_session.id}: {e}",
                exc_info=True,
            )

            # Refresh to get the latest response_id (may have been saved during event processing)
            doc_research_session.refresh_from_db()
            if doc_research_session.response_id:
                previous_response_id = doc_research_session.response_id
                logger.info(f"Will retry with previous_response_id: {previous_response_id}")
            else:
                # No response_id available, cannot continue
                logger.error(f"No response_id available for retry on session {doc_research_session.id}")
                raise

            # If this is not the last attempt, continue to retry
            if attempt < max_retries - 1:
                continue
            else:
                # All retries exhausted
                logger.error(
                    f"All {max_retries} retry attempts exhausted for session {doc_research_session.id}"
                )
                raise

        except Exception as e:
            # For non-API errors, also attempt retry if we have response_id
            last_error = e
            logger.warning(
                f"Non-API error on attempt {attempt + 1}/{max_retries} "
                f"for session {doc_research_session.id}: {e}",
                exc_info=True,
            )

            # Refresh to get the latest response_id
            doc_research_session.refresh_from_db()
            if doc_research_session.response_id:
                previous_response_id = doc_research_session.response_id
                logger.info(
                    f"Will retry with previous_response_id: {previous_response_id} after non-API error"
                )

                # Only retry if we have response_id and haven't exhausted attempts
                if attempt < max_retries - 1:
                    continue

            # Re-raise if no response_id or exhausted retries
            raise

    # Should not reach here, but raise the last error if we do
    if last_error:
        raise last_error


def _get_completed_response(client: OpenAI, response_id: str) -> Response:
    """Retrieve and validate completed response from OpenAI.

    Args:
        client: OpenAI client instance
        response_id: ID of the response to retrieve

    Returns:
        Completed response object

    Raises:
        Exception: If response is not completed within timeout or has invalid status
    """
    start_time = time.time()

    while True:
        response = client.responses.retrieve(response_id)
        status = getattr(response, "status", "<unknown>")

        if status == "completed":
            return response
        elif status == "in_progress":
            # Check if we've exceeded the timeout
            elapsed_time = time.time() - start_time
            if elapsed_time >= RESPONSE_RETRY_TIMEOUT_SECONDS:
                raise Exception(
                    f"Response {response_id} timed out after {RESPONSE_RETRY_TIMEOUT_SECONDS} seconds"
                )

            # Wait before retrying
            time.sleep(RESPONSE_RETRY_INTERVAL_SECONDS)
        else:
            # Any other status is an error
            raise Exception(f"Response {response_id} has invalid status: {status}")


def _get_url_citations(response: Response) -> List[Annotation]:
    """Extract URL citations from response output.

    Args:
        response: OpenAI response object

    Returns:
        List of URL citation annotations
    """
    url_citations = []
    for output in response.output:
        if output.type == "message":
            for content in output.content:
                if content.type == "output_text":
                    for annotation in content.annotations:
                        if annotation.type == "url_citation":
                            url_citations.append(annotation)

    return url_citations


def _get_chat_messages(research_session: DocumentResearchSession) -> List[Dict[str, str]]:
    """Get all chat messages from chat history with system prompt.

    Args:
        research_session: Research session containing chat history

    Returns:
        List of message dictionaries with role and content

    Raises:
        ValueError: If collection system message not found
    """
    deep_research_prompts = Config.get(ConfigKeyType.DEEP_RESEARCH_PROMPTS, {})
    collection_system_message = deep_research_prompts.get(COLLECTION_SYSTEM_MESSAGE_KEY)
    if not collection_system_message:
        raise ValueError(f"Collection system message not found for key {COLLECTION_SYSTEM_MESSAGE_KEY}")

    messages = [{"role": "system", "content": collection_system_message}]
    for message in research_session.chat_history:
        messages.append({"role": message["role"], "content": message["content"]})
    return messages


def _update_or_create_section(
    document: Document, section_title: str, section_data: str, is_title: bool = False
) -> Section:
    """Update or create a section with the given data.

    Args:
        document: Document to update
        section_title: Title of the section
        section_data: Content data for the section
        is_title: Whether this is the title section

    Returns:
        Created or updated Section instance
    """
    if is_title:
        section = document.sections.filter(is_title=True).first()
    else:
        section = document.sections.exclude(is_title=True).first()

    section_fields = {
        "status": SectionStatus.COMPLETED,
        "result": {"data": section_data},
    }

    if section:
        section.update_fields(section_fields)
    else:
        section = Section.objects.create(
            document=document, title=section_title, is_title=is_title, **section_fields
        )

    return section


def _handle_research_session_error(
    doc_research_session_id: str,
    error: Exception,
    error_message: str = "An error occurred while processing the research session. Please try again later.",
) -> None:
    """Handle research session error by updating session status and sending notification.

    Args:
        doc_research_session_id: ID of the research session
        error: The exception that occurred
        error_message: User-facing error message to display
    """
    try:
        doc_research_session = DocumentResearchSession.objects.get(id=doc_research_session_id)
        chat_message = ChatMessage(
            role=ChatMessageRole.ASSISTANT,
            type=ChatMessageType.MESSAGE,
            id=str(uuid.uuid4()),
            content=error_message,
            done=True,
            cot=None,
        )
        doc_research_session.update_fields(
            {
                "chat_history": [*doc_research_session.chat_history, chat_message],
                "status": ResearchSessionStatus.FAILED,
                "error_message": str(error),
                "processing_started_at": None,
            }
        )
        doc_research_session.document.update_fields(
            {
                "status": DocumentStatus.FAILED,
            }
        )
        send_chat_message_notification(doc_research_session.document, chat_message)
    except Exception as save_error:
        logger.error(
            f"Failed to save error state for research session {doc_research_session_id}: {save_error}"
        )


def _start_research_phase(doc_research_session: DocumentResearchSession, research_brief: str) -> None:
    """Start the research phase by updating session status and queuing research task.

    Args:
        doc_research_session: Research session to update
        research_brief: The compiled research brief from collection phase
    """
    doc_research_session.update_fields(
        {
            "status": ResearchSessionStatus.RESEARCHING,
            "research_brief": research_brief,
            "processing_started_at": None,
        }
    )
    doc_research_session.document.update_fields(
        {
            "status": DocumentStatus.IN_PROGRESS,
            "stage": DocumentStage.CONTENT_GENERATING,
        }
    )
    deep_research_task.delay(doc_research_session.id)
    logger.info(f"Started research phase for session {doc_research_session.id}")


def _send_follow_up_questions(doc_research_session: DocumentResearchSession, display_message: str) -> None:
    """Send follow-up questions to user to collect more information.

    Args:
        doc_research_session: Research session to update
        display_message: Message with follow-up questions for user
    """
    new_message = ChatMessage(
        role=ChatMessageRole.ASSISTANT,
        type=ChatMessageType.MESSAGE,
        id=str(uuid.uuid4()),
        content=display_message,
        done=True,
        cot=None,
    )
    doc_research_session.update_fields(
        {
            "chat_history": [*doc_research_session.chat_history, new_message],
            "status": ResearchSessionStatus.WAITING_USER,
            "processing_started_at": None,
        }
    )
    send_chat_message_notification(doc_research_session.document, new_message)


def _process_pending_research_session(doc_research_session_id: str) -> None:
    """Process a pending research session by collecting information or initiating research.

    This function determines if enough information has been collected to start research:
    - If ready: Updates session to RESEARCHING and triggers deep_research_task
    - If not ready: Sends follow-up questions to user

    Args:
        doc_research_session_id: ID of the research session to process
    """
    try:
        doc_research_session = DocumentResearchSession.objects.get(id=doc_research_session_id)
        logger.info(
            f"Processing pending research session {doc_research_session.id} "
            f"for document {doc_research_session.document.id}"
        )

        # Get LLM response to determine if ready for research
        chat_messages = _get_chat_messages(doc_research_session)
        structured_llm = init_llm().with_structured_output(CollectionResponse)
        response = structured_llm.invoke(chat_messages)
        logger.info(
            f"Collection response for session {doc_research_session.id}: "
            f"ready={response.is_ready_for_research}"
        )

        if response.is_ready_for_research:
            _start_research_phase(doc_research_session, response.research_brief)
        else:
            _send_follow_up_questions(doc_research_session, response.display_message)

    except DocumentResearchSession.DoesNotExist:
        logger.error(f"DocumentResearchSession {doc_research_session_id} not found")
    except Exception as e:
        logger.error(
            f"Error processing pending research session {doc_research_session_id}: {e}",
            exc_info=True,
        )
        _handle_research_session_error(doc_research_session_id, e)


def _handle_response_created_event(event, doc_research_session: DocumentResearchSession) -> None:
    """Handle response.created event by storing response ID.

    Args:
        event: The response.created event
        doc_research_session: Research session to update
    """
    if hasattr(event, "response"):
        doc_research_session.update_fields({"response_id": event.response.id})


def _handle_reasoning_summary_text_done_event(
    reasoning_summary_text: str, doc_research_session: DocumentResearchSession
) -> None:
    """Handle completion of reasoning summary text by updating chat history.

    Args:
        reasoning_summary_text: The accumulated reasoning summary text
        doc_research_session: Research session to update
    """
    cot_message = _parse_cot_message(reasoning_summary_text)
    if not cot_message:
        return

    doc_research_session.refresh_from_db()
    chat_history = doc_research_session.chat_history or []

    # Append to existing COT message or create new one
    if chat_history and chat_history[-1]["type"] == ChatMessageType.COT:
        chat_history[-1]["cot"].append(cot_message)
    else:
        chat_history.append(
            ChatMessage(
                role=ChatMessageRole.ASSISTANT,
                type=ChatMessageType.COT,
                id=str(uuid.uuid4()),
                content=None,
                done=False,
                cot=[cot_message],
            )
        )

    doc_research_session.update_fields({"chat_history": chat_history})
    send_chat_message_notification(doc_research_session.document, chat_history[-1])


def _update_cot_messages_from_response(
    completed_response: Response, doc_research_session: DocumentResearchSession
) -> List[Dict]:
    """Update COT messages from completed response reasoning summary.

    Args:
        completed_response: Completed response from OpenAI
        doc_research_session: Research session to update

    Returns:
        Updated chat history with COT messages
    """
    # Extract all reasoning summary texts
    cot_messages = []
    for output_item in completed_response.output:
        if output_item.type == "reasoning":
            for summary in output_item.summary:
                cot_message = _parse_cot_message(summary.text)
                if cot_message:
                    cot_messages.append(cot_message)

    doc_research_session.refresh_from_db()
    chat_history = doc_research_session.chat_history or []

    if not cot_messages:
        return chat_history

    # Update or create COT message in chat history
    if chat_history and chat_history[-1]["type"] == ChatMessageType.COT:
        # Replace existing COT messages with complete ones from response
        chat_history[-1]["cot"] = cot_messages
        chat_history[-1]["done"] = True
    else:
        # Create new COT message entry
        chat_history.append(
            ChatMessage(
                role=ChatMessageRole.ASSISTANT,
                type=ChatMessageType.COT,
                id=str(uuid.uuid4()),
                content=None,
                done=True,
                cot=cot_messages,
            )
        )

    return chat_history


def _update_session_status_to_generating(doc_research_session: DocumentResearchSession) -> None:
    """Update research session status to GENERATING if not already.

    Args:
        doc_research_session: Research session to update
    """
    if doc_research_session.status != ResearchSessionStatus.GENERATING:
        doc_research_session.update_fields({"status": ResearchSessionStatus.GENERATING})
        doc_research_session.refresh_from_db()


def _process_streaming_events(
    streaming_response, doc_research_session: DocumentResearchSession
) -> Optional[Response]:
    """Process streaming events from OpenAI response.

    Args:
        streaming_response: OpenAI streaming response iterator
        doc_research_session: Research session to update with events

    Returns:
        Completed response if received in events, None otherwise
    """
    reasoning_summary_text = ""
    completed_response = None

    for event in streaming_response:
        if not event.type.endswith(".delta"):
            logger.info(f"Processing event {event.type} for session {doc_research_session.id}")

        if event.type == "response.created":
            _handle_response_created_event(event, doc_research_session)

        elif event.type == "response.reasoning_summary_text.delta":
            if hasattr(event, "delta") and event.delta:
                reasoning_summary_text += event.delta

        elif event.type == "response.reasoning_summary_text.done":
            _handle_reasoning_summary_text_done_event(reasoning_summary_text, doc_research_session)
            reasoning_summary_text = ""  # Reset for next summary

        elif event.type == "response.output_text.delta":
            _update_session_status_to_generating(doc_research_session)

        elif event.type == "response.completed":
            if hasattr(event, "response") and event.response:
                completed_response = event.response
                logger.info(f"Received completed response from event for session {doc_research_session.id}")

    return completed_response


def _process_and_save_research_results(
    doc_research_session: DocumentResearchSession,
    client: OpenAI,
    completed_response: Optional[Response] = None,
) -> None:
    """Process research results and save to document.

    Args:
        doc_research_session: Research session with completed response
        client: OpenAI client for retrieving response if needed
        completed_response: Optional completed Response object from streaming events
    """
    # Get completed response if not provided from streaming events
    if completed_response is None:
        logger.info(
            f"No completed response from streaming events, retrieving via API "
            f"for session {doc_research_session.id}"
        )
        completed_response = _get_completed_response(client, doc_research_session.response_id)
    else:
        logger.info(f"Using completed response from streaming events for session {doc_research_session.id}")

    # Extract and update COT messages from reasoning summary
    updated_chat_history = _update_cot_messages_from_response(completed_response, doc_research_session)

    # Extract and process response
    title, content = _extract_title_from_report(completed_response.output_text)

    # Replace citations with bibliographies
    url_citations = _get_url_citations(completed_response)
    content = _replace_with_web_bibliographies(url_citations, content)

    # Update or create sections
    if title:
        _update_or_create_section(doc_research_session.document, title, content, is_title=True)
    _update_or_create_section(doc_research_session.document, title, content, is_title=False)

    # Update document
    doc_research_session.document.update_fields(
        {
            "title": title or doc_research_session.document.title,
            "status": DocumentStatus.COMPLETED,
            "stage": DocumentStage.CONTENT_GENERATED,
        }
    )
    doc_research_session.document.refresh_bibliographies()
    doc_research_session.document.refresh_from_db()

    # Update session status and chat history in one operation
    doc_research_session.update_fields(
        {
            "status": ResearchSessionStatus.COMPLETED,
            "processing_started_at": None,
            "chat_history": updated_chat_history,
        }
    )

    # Generate diagram and send notifications
    generate_mermaid(doc_research_session.document, DiagramType.FLOWCHART)
    send_document_generated_notification(doc_research_session.document)

    logger.info(f"Research document saved successfully for research session {doc_research_session.id}")


@shared_task(queue="research")
def process_research_session_task(doc_research_session_id: str) -> None:
    """Process a single research session asynchronously.

    This task is triggered directly when a user sends a message,
    providing faster response times than polling-based approaches.

    Args:
        doc_research_session_id: ID of the research session to process
    """
    now = timezone.now()
    timeout_threshold = now - timedelta(seconds=PROCESSING_TIMEOUT_SECONDS)

    # Atomic update to acquire processing lock and prevent duplicate processing
    updated = (
        DocumentResearchSession.objects.filter(
            id=doc_research_session_id,
            status=ResearchSessionStatus.PENDING,
        )
        .filter(
            models.Q(processing_started_at__isnull=True)
            | models.Q(processing_started_at__lt=timeout_threshold)
        )
        .update(processing_started_at=now)
    )

    if updated > 0:
        try:
            _process_pending_research_session(doc_research_session_id)
        except Exception as e:
            logger.error(f"Failed to process research session {doc_research_session_id}: {e}", exc_info=True)


@shared_task
def deep_research_task(doc_research_session_id: str) -> None:
    """Execute deep research task with streaming response processing.

    This task:
    1. Retrieves the research session and validates configuration
    2. Creates a streaming OpenAI response for the research brief
    3. Processes streaming events (reasoning summaries, output text)
    4. Extracts and saves the final report with citations
    5. Updates document status and generates diagrams

    Args:
        doc_research_session_id: ID of the research session to process
    """
    # Get and validate configuration
    research_system_message, research_user_message_template = _get_research_system_and_user_messages()

    # Get research session
    try:
        doc_research_session = DocumentResearchSession.objects.get(id=doc_research_session_id)
    except DocumentResearchSession.DoesNotExist:
        logger.error(f"DocumentResearchSession {doc_research_session_id} not found")
        return

    doc_research_session.update_fields({"processing_started_at": timezone.now()})

    try:
        # Prepare and execute research
        research_user_message = research_user_message_template.format(
            research_brief=doc_research_session.research_brief,
        )

        client = _create_openai_client()

        # Execute research with retry (includes streaming response creation and event processing)
        completed_response = _execute_research_with_retry(
            client, research_system_message, research_user_message, doc_research_session
        )

        # Process and save final results
        _process_and_save_research_results(doc_research_session, client, completed_response)

    except Exception as e:
        logger.error(
            f"Error in deep research for session {doc_research_session_id}: {e}",
            exc_info=True,
        )
        _handle_research_session_error(
            doc_research_session_id,
            e,
            error_message="An error occurred while polling the research session. Please try again later.",
        )
