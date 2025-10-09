from typing import Any, Dict, List, Optional, Tuple

from django.core.cache import caches

from dwh.metadata.make_dwh_chunks import make_dwh_chunks_or_metadata_request
from dwh.metadata.parser import BibIdChunkIdParser


def get_chunks(pmid_list: List[int]) -> Dict[str, Any]:
    chunks_endpoint = "/scientific_publication/abstract/chunks"
    chunks = {}

    for pm_id in pmid_list:
        params = {"pubmed_id": pm_id}
        response = make_dwh_chunks_or_metadata_request(endpoint=chunks_endpoint, params=params)

        chunks.update(
            {
                item["chunk_id"]: {
                    "pubmed_id": pm_id,
                    "abstract_chunk": item["abstract_chunk"],
                }
                for item in response
            }
        )

    return chunks


def _update_metadata(metadata: Dict[str, Any], item: Dict[str, Any], key: str) -> None:
    metadata.update(
        {
            item[key]: {
                "pubmed_id": item["pubmed_id"],
                "pmc_id": item["pmc_id"],
                "doi": item["doi"],
                "text": item["text"],
                "citation_count": item["citation_count"],
                "journal_name": item["journal_name"],
                "pub_type": item["pub_type"],
                "pub_year": item["pub_year"],
                "title": item["title"],
                "authors": item["authors"] or [],
            }
        }
    )


def get_metadata(
    pmid_list: Optional[List[int]] = None,
    pmc_list: Optional[List[str]] = None,
    doi_list: Optional[List[str]] = None,
) -> Tuple[Dict[int, Any], Dict[str, Any], Dict[str, Any]]:
    if pmid_list is None:
        pmid_list = []
    if pmc_list is None:
        pmc_list = []
    if doi_list is None:
        doi_list = []

    pubmed_metadata = {}
    pmc_metadata = {}
    doi_metadata = {}
    if any([pmid_list, pmc_list, doi_list]):
        params = {
            "pubmed_ids": pmid_list,
            "pmc_ids": pmc_list,
            "doi_nums": doi_list,
        }
        metadata_endpoint = "/scientific_publication/metadata"
        response = make_dwh_chunks_or_metadata_request(endpoint=metadata_endpoint, params=params)

        for item in response:
            if item.get("pubmed_id") and item.get("pubmed_id") in pmid_list:
                _update_metadata(pubmed_metadata, item, "pubmed_id")
            if item.get("pmc_id") and item.get("pmc_id") in pmc_list:
                _update_metadata(pmc_metadata, item, "pmc_id")
            if item.get("doi") and item.get("doi") in doi_list:
                _update_metadata(doi_metadata, item, "doi")

    return pubmed_metadata, pmc_metadata, doi_metadata


def get_bib_id_chunk_id_list(data: str) -> List[Tuple[str, str]]:
    parser = BibIdChunkIdParser(input_text=data)
    parser.parse()
    return parser.bib_id_chunk_id_list


def cache_used_chunks(docs: List[Dict[str, Any]], text: str) -> None:
    used_bib_id_chunk_id_list = get_bib_id_chunk_id_list(text)
    used_bib_id_chunk_id_map = {bib_id_chunk_id: True for bib_id_chunk_id in used_bib_id_chunk_id_list}

    cache = caches["chunks"]
    for doc in docs:
        if pmid := doc.get("pubmed_id"):
            cache_key = (doc["temp_bib_id"], doc["chunk_id"])
            if cache_key in used_bib_id_chunk_id_map:
                cache.set(cache_key, {"pmid": pmid, "chunk": doc["chunk"]}, timeout=60 * 60 * 2)


def get_cached_pubmed_chunks(bib_id_chunk_id_list: List[Tuple[str, str]]) -> Dict[str, Any]:
    cache = caches["chunks"]

    pubmed_chunks = {}
    for temp_bib_id, chunk_id in bib_id_chunk_id_list:
        chunk_cache_key = (temp_bib_id, chunk_id)
        if chunk_data := cache.get(chunk_cache_key):
            if temp_bib_id in pubmed_chunks:
                chunks = pubmed_chunks[temp_bib_id]["chunks"]
                chunks.update({chunk_id: chunk_data["chunk"]})
            else:
                pubmed_chunks[temp_bib_id] = {
                    "pmid": chunk_data["pmid"],
                    "chunks": {chunk_id: chunk_data["chunk"]},
                }
    return pubmed_chunks


def get_cached_web_chunks(data: str) -> Dict[str, Any]:
    cache = caches["webchunks"]
    if not (bib_id_chunk_id_list := get_bib_id_chunk_id_list(data)):
        return {}

    web_chunks = {}
    for bib_id, chunk_id in bib_id_chunk_id_list:
        chunk_cache_key = (bib_id, chunk_id)
        if chunk_data := cache.get(chunk_cache_key):
            web_chunks[(bib_id, chunk_id)] = chunk_data
    return web_chunks


def get_cached_pubmed_data(data: str) -> Dict[int, Any]:
    if not (bib_id_chunk_id_list := get_bib_id_chunk_id_list(data)):
        return {}

    pubmed_chunks = get_cached_pubmed_chunks(bib_id_chunk_id_list=bib_id_chunk_id_list)
    pmids = [value["pmid"] for value in pubmed_chunks.values()]
    if not pmids:
        return {}

    try:
        pubmed_metadata, _, _ = get_metadata(pmid_list=pmids)
    except ValueError:
        return {}

    pubmed_data = {}
    for temp_bib_id, data in pubmed_chunks.items():
        pmid = data["pmid"]
        metadata = pubmed_metadata.get(pmid)
        if metadata:
            pubmed_data[pmid] = {
                "temp_bib_id": temp_bib_id,
                "metadata": metadata,
                "chunks": data["chunks"],
            }

    return pubmed_data
