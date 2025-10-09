from typing import Any, List, Optional

from bibliography.defs import NON_CHUNK_ID
from dwh.pharmacognitive.api_interface import get_publications_metadata_search
from dwh.requests.scientific_publication import ScientificPublicationMetadataRequest


def get_publication_chunks_by_title(
    title: str,
) -> list[dict[str, Any]]:
    chunks = []
    publications_metadata = get_publications_metadata_search(title=title, top_n=20).get("data")

    if publications_metadata:
        for item in publications_metadata:
            if item["text"] and len(item["text"]):
                chunk_text = item["text"]
            else:
                chunk_text = ""
            chunk = {
                "pubmed_id": item["pubmed_id"],
                "fulltext_chunk": chunk_text,
                "similarity": item["similarity"],
                "chunk_id": NON_CHUNK_ID,
                "source": "title",
            }
            if item["title"].strip().removesuffix(".").lower() == title.strip().removesuffix(".").lower():
                chunk["similarity"] = 100
                chunks.insert(0, chunk)
            else:
                chunks.append(chunk)

    return chunks


def get_publication_chunks_by_ids(
    pubmed_ids: Optional[List[int]] = None,
    doi_nums: Optional[List[str]] = None,
    pmc_ids: Optional[List[str]] = None,
) -> List[dict[str, Any]]:
    data = ScientificPublicationMetadataRequest(
        pubmed_ids=pubmed_ids,
        doi_nums=doi_nums,
        pmc_ids=pmc_ids,
    ).make_request()
    return [
        {
            "pubmed_id": item["pubmed_id"],
            "fulltext_chunk": item["text"],
            "similarity": 100,
            "chunk_id": NON_CHUNK_ID,
            "source": "id",
        }
        for item in data
    ]
