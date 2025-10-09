import logging
from typing import Dict, List, Optional, Union

import requests

from base.defs.pharmacognitive import API_V2_VERSION
from dwh.drugs_and_trials.annotations import DrugsAndTrialsPCRows
from dwh.pharmacognitive.send_request import send_request
from kernel.llm_agent_tools.defs import EntitiesVersions

logger = logging.getLogger(__name__)

TOP_N = 30
START_YEAR = 2010
SEARCH_MODE = "vector"


def get_publications_abstracts_similarity_search(
    query_text: str,
    top_n: int = TOP_N,
    start_year: int = START_YEAR,
    search_mode: str = SEARCH_MODE,
    use_synonyms: bool = False,
    priority_full_text: bool = False,
    chunks_on_fly: bool = False,
    fuzzy_search_limit: int = 0,
    vector_search_probes: int = 0,
    article_types: Optional[List[str]] = None,
    filter_article_types: bool = False,
    sort_by: Optional[str] = None,
    fulltext_similarity_score_threshold: Optional[float] = None,
    vector_similarity_score_threshold: Optional[float] = None,
) -> dict:
    if article_types is None:
        article_types = []

    path = "scientific_publication/abstract/similarity_search"

    params = {
        "query_text": query_text,
        "top_n": top_n,
        "start_year": start_year,
        "search_mode": search_mode,
        "use_synonyms": use_synonyms,
        "priority_full_text": priority_full_text,
        "chunks_on_fly": chunks_on_fly,
        "fuzzy_search_limit": fuzzy_search_limit,
        "vector_search_probes": vector_search_probes,
        "article_types": article_types,
        "filter_article_types": filter_article_types,
        "sort_by": sort_by,
        "fulltext_similarity_score_threshold": fulltext_similarity_score_threshold,
        "vector_similarity_score_threshold": vector_similarity_score_threshold,
    }

    result = send_request(
        params=params,
        version=API_V2_VERSION,
        method=requests.get,
        path=path,
    )

    return result or {}


def get_publications_fulltext_similarity_search(
    query_text: str,
    top_n: int = TOP_N,
    start_year: int = START_YEAR,
    search_mode: str = SEARCH_MODE,
    use_synonyms: bool = False,
    priority_full_text: bool = False,
    chunks_on_fly: bool = False,
    fuzzy_search_limit: int = 0,
    vector_search_probes: int = 0,
    article_types: Optional[List[str]] = None,
    filter_article_types: bool = False,
    sort_by: Optional[str] = None,
    fulltext_similarity_score_threshold: Optional[float] = None,
    vector_similarity_score_threshold: Optional[float] = None,
) -> dict:
    if article_types is None:
        article_types = []

    path = "scientific_publication/fulltext/similarity_search"

    params = {
        "query_text": query_text,
        "top_n": top_n,
        "start_year": start_year,
        "search_mode": search_mode,
        "use_synonyms": use_synonyms,
        "priority_full_text": priority_full_text,
        "chunks_on_fly": chunks_on_fly,
        "fuzzy_search_limit": fuzzy_search_limit,
        "vector_search_probes": vector_search_probes,
        "article_types": article_types,
        "filter_article_types": filter_article_types,
        "sort_by": sort_by,
        "fulltext_similarity_score_threshold": fulltext_similarity_score_threshold,
        "vector_similarity_score_threshold": vector_similarity_score_threshold,
    }

    result = send_request(
        params=params,
        version=API_V2_VERSION,
        method=requests.get,
        path=path,
    )

    return result or {}


def get_publications_metadata_search(title: str, top_n: int = TOP_N) -> dict:
    path = "scientific_publication/metadata/search"
    params = {
        "title": title,
        "top_n": top_n,
        "fuzzy_search_limit": 0,
    }

    result = send_request(
        params=params,
        version=API_V2_VERSION,
        method=requests.get,
        path=path,
        expected_timeout=1.5,  # timeout value for title search - DORA-597
    )

    return result or {}


def get_clinical_trial_drugs_and_trials_gene(gene_ensembl_id: str) -> DrugsAndTrialsPCRows:
    path = "clinical_trial/drugs_and_trials/gene/"
    params = {
        "gene_ensembl_id": gene_ensembl_id,
        "gene_ensembl_version": EntitiesVersions.HUMAN_PROTEIN_ATLAS_ENSG,
    }

    result = send_request(
        params=params,
        version=API_V2_VERSION,
        method=requests.get,
        path=path,
    )

    if result is None:
        raise ValueError(
            f"We received an incorrect response from the PC API for {gene_ensembl_id=}: {result}"
        )

    return result.get("data") or []


def get_clinical_trial_drugs_and_trials_disease(disease_efo_id: str) -> DrugsAndTrialsPCRows:
    path = "clinical_trial/drugs_and_trials/disease/"
    params = {
        "efo_id": disease_efo_id,
        "efo_version": EntitiesVersions.DRUGS_AND_TRIALS_EFO,
    }

    result = send_request(
        params=params,
        version=API_V2_VERSION,
        method=requests.get,
        path=path,
    )

    if result is None:
        raise ValueError(f"We received an incorrect response from the PC API for {disease_efo_id=}: {result}")

    return result.get("data") or []


def get_clinical_trial_drugs_and_trials_association(
    gene_ensembl_id: str, disease_efo_id: str
) -> DrugsAndTrialsPCRows:
    path = "clinical_trial/drugs_and_trials/association/"
    params = {
        "gene_ensembl_id": gene_ensembl_id,
        "gene_ensembl_version": EntitiesVersions.HUMAN_PROTEIN_ATLAS_ENSG,
        "efo_id": disease_efo_id,
        "efo_version": EntitiesVersions.DRUGS_AND_TRIALS_EFO,
    }

    result = send_request(
        params=params,
        version=API_V2_VERSION,
        method=requests.get,
        path=path,
    )

    if result is None:
        raise ValueError(f"We received an incorrect response from the PC API: {result}")

    return result.get("data") or []


def get_gene_symbol_mapping(gene_list: list[str]) -> list:
    path = "gene_symbol_mapping"
    params: Dict[str, Union[str, list]] = {
        "gene_list": gene_list,
        "ensg_version": EntitiesVersions.HUMAN_PROTEIN_ATLAS_ENSG,
        "hgnc_version": EntitiesVersions.HUMAN_PROTEIN_ATLAS_HGNC,
        "gene_list_case_sensitive": "false",
    }

    result = send_request(
        params=params,
        version=API_V2_VERSION,
        method=requests.get,
        path=path,
    )

    if result is None:
        raise ValueError(f"We received an incorrect response from the PC API for {gene_list=}: {result}")

    return result.get("data") or []


def get_disease_metadata() -> dict:
    path = "disease/metadata"
    params: Dict[str, Union[str, list]] = {
        "efo_version": EntitiesVersions.DRUGS_AND_TRIALS_EFO,
    }

    result = send_request(
        params=params,
        version=API_V2_VERSION,
        method=requests.get,
        path=path,
        expected_timeout=60,
    )

    return result.get("data") or []
