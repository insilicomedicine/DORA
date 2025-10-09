import logging
from typing import Any, Dict, List, Tuple

from bibliography.utils import fix_invalid_bib_chunk_pairs, remove_invalid_bib_id_chunk_id
from documents.models import Section
from dwh.metadata.postprocessing import (
    get_bib_id_chunk_id_list,
    get_cached_pubmed_data,
    get_cached_web_chunks,
)
from kernel.agents.word_filtering_agent import WordFilteringAgent
from kernel.tasks.post_processing.bibliography import (
    update_and_create_pubmed_bibliographies,
    update_and_create_web_bibliographies,
)
from users.defs import TokenUsage

logger = logging.getLogger(__name__)


def filter_words(section: Section) -> TokenUsage:
    logger.info(f"Filtering words from section {section.id}")

    agent = WordFilteringAgent()
    agent_response = agent.process(section.result.get("data", ""))
    section.update_fields({"result": {"data": agent_response.content}})

    logger.info(f"Filtering words from section {section.id} completed.")
    return agent_response.token_usage


def get_section_websearch_data(
    section_content: str, websearch_data: Dict[Tuple[str, str], Dict[str, Any]]
) -> Dict[Tuple[str, str], Dict[str, Any]]:
    bib_id_chunk_id_list = get_bib_id_chunk_id_list(section_content)
    return {
        (bib_id, chunk_id): data
        for (bib_id, chunk_id), data in websearch_data.items()
        if (bib_id, chunk_id) in bib_id_chunk_id_list
    }


def create_bibliographies(
    section: Section,
    external_websearch_data: Dict[Tuple[str, str], Dict[str, Any]] | None = None,
) -> List[Tuple[str, str]]:
    logger.info(f"Creating bibliographies for section {section.id}")
    logger.info(f"External websearch data: {external_websearch_data}")

    section_content = section.result.get("data", "")

    pubmed_data = get_cached_pubmed_data(section_content)

    websearch_data = get_cached_web_chunks(section_content)
    if external_websearch_data:
        websearch_data.update(get_section_websearch_data(section_content, external_websearch_data))
        logger.info(f"Section {section.id} websearch data: {websearch_data}")

    if pubmed_data:
        logger.info(f"Section {section.id} update pubmed bibliographies")
        section_content = update_and_create_pubmed_bibliographies(pubmed_data, section_content)

    if websearch_data:
        logger.info(f"Section {section.id} update web bibliographies")
        section_content = update_and_create_web_bibliographies(websearch_data, section_content)

    bib_id_chunk_id_list = get_bib_id_chunk_id_list(section_content)
    if bib_id_chunk_id_list:
        section_content, invalid_ref_pairs = remove_invalid_bib_id_chunk_id(
            section_content, bib_id_chunk_id_list
        )
        if invalid_ref_pairs:
            invalid_pairs_str = ", ".join(
                [f"(BIB_ID:{bib_id}, CHUNK_ID:{chunk_id})" for bib_id, chunk_id in invalid_ref_pairs]
            )
            logger.info(f"Section {section.id} invalid references found: {invalid_pairs_str}")

    section_content = fix_invalid_bib_chunk_pairs(section_content)

    if section_content != section.result.get("data", ""):
        section.update_fields({"result": {"data": section_content}})

    logger.info(f"Creating bibliographies for section {section.id} completed.")
    return bib_id_chunk_id_list
