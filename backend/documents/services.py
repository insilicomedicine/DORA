import logging
import uuid
from typing import Any, Dict, List

import sentry_sdk
from rest_framework.exceptions import APIException

from documents.models import Document
from kernel.agents.section_agent import SectionAgent
from kernel.llm_agent_tools.defs import WebSearchProvider
from kernel.llm_agent_tools.web_search.retriever_factory import (
    get_flex_bare_serper_search,
)
from kernel.services.telemetry import telemetry
from users.models import AITokenUsageType
from users.record_token_usage import record_token_usage

logger = logging.getLogger(__name__)


def generate_plan(document: Document) -> str:
    logger.info("Generate document plan...")
    flat_sections = document.template.flat_sections
    plan_section_slug = next(
        (section.get("slug") for section in flat_sections if section.get("display_on_plan_overview")), None
    )

    if not plan_section_slug:
        raise APIException("No plan section found in template.")

    section = document.sections.all().filter(slug=plan_section_slug).first()
    if not section:
        raise APIException("No plan section found in document.")

    with telemetry(document, section, "generate_document_plan"):
        section_agent = SectionAgent(section)
        try:
            agent_response = section_agent.generate_plan()
        except Exception as exc:
            logger.error(f"Error generating section {section.id} plan: {exc}")
            sentry_sdk.capture_exception(exc)
            raise APIException("Error generating plan.")

    record_token_usage(
        document.created_by,
        section,
        agent_response.token_usage,
        AITokenUsageType.GEN_PLAN,
        section_agent.llm.model_name,
    )

    logger.info("Generated document plan.")
    return agent_response.content


def get_websearch_chunks(query: str) -> List[Dict[str, Any]]:
    retriever = get_flex_bare_serper_search(
        num_results=20, use_embeddings=False, provider=WebSearchProvider.DUCKDUCKGO
    )
    docs = retriever.invoke(query)

    chunks = []
    for doc in docs:
        url = doc.metadata.get("link") or doc.metadata.get("source", "")
        if not url:
            continue

        title = doc.metadata.get("title", "No title")
        chunk = doc.page_content if doc.page_content else "No content available"

        chunks.append(
            {
                "metadata": {
                    "title": title,
                    "url": url,
                },
                "chunk": chunk,
                "chunk_id": str(uuid.uuid4()),
            }
        )
    return chunks
