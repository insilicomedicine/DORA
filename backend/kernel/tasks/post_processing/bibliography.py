from typing import Any, Dict, Tuple

from bibliography.models import Bibliography


def update_and_create_pubmed_bibliographies(pubmed_data: Dict[int, Any], section_content: str) -> str:
    pmid_bib_id_mapping = Bibliography.update_and_create_pubmed_bibliographies(pubmed_data)

    temp_bib_id_bib_id_mapping = {
        data["temp_bib_id"]: pmid_bib_id_mapping[pmid]
        for pmid, data in pubmed_data.items()
        if pmid in pmid_bib_id_mapping
    }

    for temp_bib_id, bib_id in temp_bib_id_bib_id_mapping.items():
        section_content = section_content.replace(f"BIB_ID:{temp_bib_id}", f"BIB_ID:{bib_id}")
    return section_content


def update_and_create_web_bibliographies(
    web_data: Dict[Tuple[str, str], Dict[str, Any]], section_content: str
) -> str:
    bib_chunk_id_mapping = Bibliography.update_and_create_web_bibliographies(web_data)

    for (bib_id, chunk_id), (new_bib_id, new_chunk_id) in bib_chunk_id_mapping.items():
        section_content = section_content.replace(
            f"BIB_ID:{bib_id}, CHUNK_ID:{chunk_id}", f"BIB_ID:{new_bib_id}, CHUNK_ID:{new_chunk_id}"
        )
    return section_content
