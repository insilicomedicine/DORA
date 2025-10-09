import hashlib
import re
from typing import Dict, List, Tuple

from bibliography.defs import NON_CHUNK_ID, UUID_REGEX, PublicationTypes
from bibliography.models import Bibliography


def extract_bib_references_map(text: str) -> Dict[str, List[Tuple[str, str]]]:
    pattern = r"\(BIB_ID:[\w-]+, CHUNK_ID:[\w-]+(?:; BIB_ID:[\w-]+, CHUNK_ID:[\w-]+)*\)"
    matches = re.findall(pattern, text)

    references = {}

    for match in matches:
        pairs = match.strip("()").split("; ")
        ref_list = []
        for pair in pairs:
            bib_chunk_match = re.match(r"BIB_ID:([\w-]+), CHUNK_ID:([\w-]+)", pair)
            if bib_chunk_match:
                bib_id = bib_chunk_match.group(1)
                chunk_id = bib_chunk_match.group(2)

                if (bib_id, chunk_id) not in ref_list:
                    ref_list.append((bib_id, chunk_id))

        references[match] = ref_list

    return references


def remove_invalid_bib_id_chunk_id(
    text: str, bib_id_chunk_id_list: List[Tuple[str, str]]
) -> Tuple[str, List[Tuple[str, str]]]:
    bib_ids, chunk_ids = zip(*bib_id_chunk_id_list)
    bibliography_objects = Bibliography.objects.filter(id__in=set(bib_ids))

    valid_bib_ids = {str(bibliography.id) for bibliography in bibliography_objects}

    chunk_ids_set = set(chunk_ids)
    valid_chunk_ids = [
        chunk_id
        for bibliography in bibliography_objects
        for chunk_id in bibliography.chunks.keys()
        if chunk_id in chunk_ids_set
    ]

    bib_references_map = extract_bib_references_map(text)

    invalid_pairs = []
    valid_bib_references = {}
    for ref, pairs in bib_references_map.items():
        valid_pairs = [pair for pair in pairs if pair[0] in valid_bib_ids and pair[1] in valid_chunk_ids]
        valid_bib_references[ref] = valid_pairs
        invalid_pairs.extend([pair for pair in pairs if pair not in valid_pairs])

    for ref, pairs in valid_bib_references.items():
        valid_ref = (
            f"({'; '.join([f'BIB_ID:{bib_id}, CHUNK_ID:{chunk_id}' for bib_id, chunk_id in pairs])})"
            if pairs
            else ""
        )
        if ref != valid_ref:
            original_ref = ref
            if not valid_ref:
                original_ref = f" {ref}"
            text = text.replace(original_ref, valid_ref)

    return text, list(set(invalid_pairs))


def fix_invalid_bib_chunk_pairs(text: str) -> str:
    pattern = re.compile(
        r"(\()?BIB_ID:([\w-]+)(?:,\s*CHUNK_ID:?([\w-]+)?)?(\))?|(\()?CHUNK_ID:?([\w-]+)(\))?"
    )

    def replace_pair(match):
        open_paren = match.group(1) or match.group(5) or ""
        bib_id = match.group(2)
        chunk_id = match.group(3) or match.group(6)
        close_paren = match.group(4) or match.group(7) or ""

        if bib_id and re.match(UUID_REGEX, bib_id):
            if chunk_id and re.match(UUID_REGEX, chunk_id):
                return f"{open_paren}BIB_ID:{bib_id}, CHUNK_ID:{chunk_id}{close_paren}"

            if Bibliography.objects.filter(id=bib_id).exists():
                return f"{open_paren}BIB_ID:{bib_id}, CHUNK_ID:{NON_CHUNK_ID}{close_paren}"

        return ""

    processed_text = pattern.sub(replace_pair, text)

    return processed_text


def extract_source_identifier_from_url(url: str) -> Tuple[str, str, str]:
    source_type = None
    source_id = None
    inline_ref = None

    patterns_map = {
        PublicationTypes.PUBMED: [
            r"pubmed\.ncbi\.nlm\.nih\.gov/(\d+)",
            r"www\.ncbi\.nlm\.nih\.gov/pubmed/(\d+)",
        ],
        PublicationTypes.PMC: [
            r"pmc\.ncbi\.nlm\.nih\.gov/articles/PMC(\d+)",
            r"www\.ncbi\.nlm\.nih\.gov/pmc/articles/PMC(\d+)",
        ],
    }

    for pub_type, patterns in patterns_map.items():
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                source_type = pub_type.name
                source_id = f"PMC{match.group(1)}" if pub_type == PublicationTypes.PMC else match.group(1)
                inline_ref = f"{pub_type.inline_ref_prefix}{match.group(1)}"
                return source_type, source_id, inline_ref

    return source_type, source_id, inline_ref


def get_hashed_link(url: str) -> str:
    return hashlib.sha256(url.encode()).hexdigest()
