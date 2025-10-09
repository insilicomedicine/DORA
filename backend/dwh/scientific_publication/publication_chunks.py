import logging
import random
from concurrent.futures import ThreadPoolExecutor
from typing import List, Optional

from dwh.pharmacognitive.api_interface import (
    get_publications_abstracts_similarity_search,
    get_publications_fulltext_similarity_search,
)
from general.defs import (
    DEFAULT_PUBLICATION_CHUNK_MERGE_RULES,
    ConfigKeyType,
    PublicationChunksEnum,
    PublicationChunksFeature,
    ShuffleStrategyEnum,
)
from general.models import Config
from kernel.defs import SearchResource

logger = logging.getLogger(__name__)


def update_api_call_parameters_with_default(
    default_settings: dict,
    config_key: ConfigKeyType,
    feature: PublicationChunksFeature,
) -> dict:
    custom_settings = Config.get(config_key, {}).get(feature.value, {})
    return {**default_settings, **custom_settings}


def get_publication_chunks(
    query: str,
    max_chunks: int = 50,
    start_year: int = 2010,
    article_types: Optional[List[str]] = None,
    filter_article_types: bool = False,
    sort_by: Optional[List[str]] = None,
    resources: Optional[List[str]] = None,
    fuzzy_search_limit: int = 5000,
    use_separate_settings_for_resources: bool = False,
    feature: PublicationChunksFeature = PublicationChunksFeature.PUBMED_ABSTRACT_SIMILARITY_SEARCH,
) -> tuple[list, list]:
    num_threads = 0
    if SearchResource.PUBMED in resources:
        num_threads += 1
    if SearchResource.PMC in resources:
        num_threads += 2

    if not num_threads:
        return [], []

    call_kwargs = {
        "query_text": query,
        "top_n": max_chunks,
        "start_year": start_year,
        "search_mode": "hybrid",
        "use_synonyms": False,
        "priority_full_text": True,
        "chunks_on_fly": False,
        "fuzzy_search_limit": fuzzy_search_limit,
        "vector_search_probes": 0,
        "article_types": article_types or [],
        "filter_article_types": filter_article_types,
        "sort_by": sort_by or [],
    }

    if use_separate_settings_for_resources:
        abstract_search_kwargs = update_api_call_parameters_with_default(
            default_settings=call_kwargs,
            config_key=ConfigKeyType.PUB_CHUNKS_ABSTRACT_SEARCH,
            feature=feature,
        )
        fulltext_search_kwargs = update_api_call_parameters_with_default(
            default_settings=call_kwargs,
            config_key=ConfigKeyType.PUB_CHUNKS_FULLTEXT_SEARCH,
            feature=feature,
        )
    else:
        abstract_search_kwargs = call_kwargs
        fulltext_search_kwargs = call_kwargs

    external_api_calls = []
    abstract_chunks = []
    fulltext_chunks = []

    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        if SearchResource.PUBMED in resources:
            # abstracts are more likely to find something, so in case fulltext won't find anything,
            # we can provide needed chunks with abstracts
            abstract_search_kwargs["search_mode"] = "hybrid"
            abstract_search_kwargs["top_n"] = max_chunks * 2
            external_api_calls.append(
                executor.submit(
                    get_publications_abstracts_similarity_search,
                    **abstract_search_kwargs,
                )
            )

        if SearchResource.PMC in resources:
            # PMC hybrid search is too heavy as a single query
            # separate it to two lighter queries as we can just concatenate the results because fulltext mode
            # is prioritized for PMC search
            fulltext_search_kwargs["search_mode"] = "vector"
            fulltext_search_kwargs["top_n"] = max_chunks
            external_api_calls.append(
                executor.submit(
                    get_publications_fulltext_similarity_search,
                    **fulltext_search_kwargs,
                )
            )

            fulltext_search_kwargs["search_mode"] = "fulltext"
            fulltext_search_kwargs["fuzzy_search_limit"] = 5000
            fulltext_search_kwargs["top_n"] = max_chunks
            external_api_calls.append(
                executor.submit(
                    get_publications_fulltext_similarity_search,
                    **fulltext_search_kwargs,
                )
            )

        if SearchResource.PUBMED in resources:
            abstract_chunks = external_api_calls.pop(0).result().get("data", [])

        if SearchResource.PMC in resources:
            fulltext_vector_chunks = external_api_calls.pop(0).result().get("data", [])
            fulltext_keyword_chunks = external_api_calls.pop(0).result().get("data", [])

            fulltext_chunks = fulltext_keyword_chunks
            fulltext_pubmed_ids = {fulltext_chunk["pubmed_id"] for fulltext_chunk in fulltext_chunks}
            for fulltext_vector_chunk in fulltext_vector_chunks:
                if len(fulltext_chunks) >= max_chunks:
                    break
                if fulltext_vector_chunk["pubmed_id"] not in fulltext_pubmed_ids:
                    fulltext_chunks.append(fulltext_vector_chunk)

    return abstract_chunks, fulltext_chunks


def merge_publication_chunks(
    custom_bibliography_chunks: Optional[List[dict]] = None,
    fulltext_chunks: Optional[List[dict]] = None,
    abstract_chunks: Optional[List[dict]] = None,
    chunk_merge_rules: Optional[dict] = None,
) -> list:
    if custom_bibliography_chunks is None:
        custom_bibliography_chunks = []
    if fulltext_chunks is None:
        fulltext_chunks = []
    if abstract_chunks is None:
        abstract_chunks = []
    if chunk_merge_rules is None:
        chunk_merge_rules = Config.get(
            ConfigKeyType.PUBLICATION_CHUNK_MERGE_RULES, DEFAULT_PUBLICATION_CHUNK_MERGE_RULES
        )
    logger.info(
        f"Applying chunk merge rules: {chunk_merge_rules} on {len(custom_bibliography_chunks)} custom, "
        f"{len(fulltext_chunks)} fulltext and {len(abstract_chunks)} abstract chunks"
    )

    merged_chunks = []
    chunk_sources = {
        PublicationChunksEnum.CUSTOM_BIBLIOGRAPHY_CHUNKS.value: custom_bibliography_chunks,
        PublicationChunksEnum.FULLTEXT_CHUNKS.value: fulltext_chunks,
        PublicationChunksEnum.ABSTRACT_CHUNKS.value: abstract_chunks,
    }

    for chunk_type, chunks in chunk_sources.items():
        limit = chunk_merge_rules["chunk_limits"].get(chunk_type, len(chunks))
        chunk_sources[chunk_type] = chunks[:limit]

    if chunk_merge_rules["shuffle_strategy"] == ShuffleStrategyEnum.ROUND_ROBIN:
        while any(chunk_sources.values()) and len(merged_chunks) < chunk_merge_rules["max_total_chunks"]:
            for chunk_type in chunk_merge_rules["order"]:
                if chunk_sources[chunk_type]:
                    merged_chunks.append(chunk_sources[chunk_type].pop(0))
                    if len(merged_chunks) >= chunk_merge_rules["max_total_chunks"]:
                        break
    elif chunk_merge_rules["shuffle_strategy"] == ShuffleStrategyEnum.RANDOM:
        random.shuffle(merged_chunks)
    else:
        for chunk_type in chunk_merge_rules["order"]:
            merged_chunks.extend(chunk_sources[chunk_type])
            if len(merged_chunks) >= chunk_merge_rules["max_total_chunks"]:
                break
        merged_chunks = merged_chunks[: chunk_merge_rules["max_total_chunks"]]

    logger.info(f"Merged to {len(merged_chunks)} chunks")

    return merged_chunks
