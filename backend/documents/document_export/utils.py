import io
import logging
from typing import TYPE_CHECKING, Any, Dict, List, Optional, Tuple

from PIL import Image as PILImage

from bibliography.models import BibliographyType
from bibliography.utils import extract_source_identifier_from_url
from documents.document_export.defs import (
    DOI_URL_PATTERN,
    PMC_URL_PATTERN,
    PUBMED_URL_PATTERN,
    UNKNOWN_AUTHOR_NAME,
)
from kernel.diagrams.storage import MermaidStorage

if TYPE_CHECKING:
    from documents.models import Document

logger = logging.getLogger(__name__)


def fix_authors_list(authors: Optional[List[str]]) -> List[str]:
    if not authors:
        return [UNKNOWN_AUTHOR_NAME]
    return [author if author else UNKNOWN_AUTHOR_NAME for author in authors]


def format_author_str(pmid_info: dict) -> str:
    authors = fix_authors_list(pmid_info.get("authors"))
    pub_year = pmid_info.get("pub_year")
    if len(authors) == 1:
        authors_str = f"{authors[0]}, {pub_year}"
    elif len(authors) == 2:
        authors_str = f"{authors[0]} & {authors[1]}, {pub_year}"
    else:
        authors_str = f"{authors[0]} et al., {pub_year}"
    return authors_str


def format_inline_reference_for_websearch(metadata):
    if pmid := metadata.get("pubmed_id"):
        authors_str = format_author_str(metadata)
        hyperlink = PUBMED_URL_PATTERN.format(pmid=pmid)
    elif pmc_id := metadata.get("pmc_id"):
        authors_str = format_author_str(metadata)
        hyperlink = PMC_URL_PATTERN.format(pmc_id=pmc_id)
    elif doi := metadata.get("doi"):
        authors_str = format_author_str(metadata)
        hyperlink = DOI_URL_PATTERN.format(doi=doi)
    else:
        hyperlink = metadata.get("url")
        authors_str = simplify_url(hyperlink)
    return authors_str, hyperlink


def format_reference_string(metadata):
    authors = fix_authors_list(metadata["authors"])
    title = metadata["title"]
    pub_year = metadata["pub_year"]
    journal_name = metadata["journal_name"]
    if len(authors) == 1:
        author_info = authors[0]
    elif len(authors) < 6:
        author_info = ", ".join(authors[:-1]) + f" & {authors[-1]}"
    elif len(authors) >= 6:
        author_info = authors[0] + " et al."
    else:
        author_info = ""
    reference_str = f"{author_info} {title} {journal_name} ({pub_year})."
    return reference_str


def format_file_name(file_name: str) -> str:
    name, ext = file_name.rsplit(".", 1)
    if len(name) > 30:
        name = name[:30] + "... "
    return f"{name}.{ext}"


def simplify_url(url: str) -> str:
    if "://" in url:
        url = url.split("://", 1)[1]

    if url.startswith("www."):
        url = url[4:]

    _, _, identifier = extract_source_identifier_from_url(url)
    if identifier:
        return identifier

    parts = url.split("/", 2)
    main_domain = parts[0]

    if len(parts) > 1:
        first_path = parts[1]
        simplified_url = f"{main_domain}/{first_path}"
    else:
        simplified_url = main_domain

    return simplified_url[:30]


def get_formatted_references(doc_bibliographies: List[Dict[str, Any]]) -> List[str]:
    file_references = []
    pubmed_references = []
    websearch_references = []
    for bibliography in doc_bibliographies:
        metadata = bibliography["metadata"]
        if bibliography["type"] == BibliographyType.PUBMED:
            reference_str = format_reference_string(metadata)
            pubmed_references.append(reference_str)
        elif bibliography["type"] == BibliographyType.FILE:
            file_references.append(metadata.get("file_name", ""))
        elif bibliography["type"] == BibliographyType.WEBSEARCH:
            if metadata.get("authors"):
                reference_str = format_reference_string(metadata)
                pubmed_references.append(reference_str)
            else:
                websearch_references.append(metadata.get("url", ""))
    return sorted(file_references) + sorted(pubmed_references) + sorted(websearch_references)


def get_mermaid_image_stream_and_size(
    document: "Document",
) -> Tuple[Optional[Any], Optional[Tuple[int, int]]]:
    if not document.mermaid_diagram:
        return None, None

    image_data = MermaidStorage().get_png(document.mermaid_diagram.pk)
    if not image_data:
        return None, None

    try:
        image_stream = io.BytesIO(image_data)
        pil_image = PILImage.open(image_stream)
    except Exception as e:
        logger.error(f"Error opening image: {e}")
        return None, None
    return image_stream, pil_image.size


def is_markdown_heading(text: str) -> Tuple[bool, int]:
    text = text.rstrip()

    if text.startswith("#"):
        level = 0
        while level < len(text) and text[level] == "#":
            level += 1
        if level > 0 and text[level] == " ":
            return True, min(level, 4)
    return False, 0
