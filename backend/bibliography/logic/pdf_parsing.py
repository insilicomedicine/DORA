import io
import re
from datetime import datetime
from typing import Dict, Tuple, Union

from pypdf import PdfReader

from base.storage.factory import get_storage
from bibliography.defs import CustomBibliographyFileS3Template

METADATA_TYPE = Dict[str, Union[datetime, str, None]]


def get_file_metadata(pdf_reader: PdfReader) -> METADATA_TYPE:
    normalized_metadata = {}
    if pdf_reader.metadata:
        for key, value in pdf_reader.metadata.items():
            new_key = key.replace("/", "")
            if len(new_key) > 0:
                new_key = new_key[0].lower() + new_key[1:]
                normalized_metadata[new_key] = value

    # If no title in metadata and we have pages, try to extract from first page
    if not normalized_metadata.get("title") and len(pdf_reader.pages) > 0:
        first_page_text = pdf_reader.pages[0].extract_text()
        if first_page_text:
            # Get first substantial line as a fallback title
            lines = first_page_text.split("\n")
            for line in lines:
                if line.strip() and len(line.strip()) > 10:
                    normalized_metadata["title"] = line.strip()
                    break

    return normalized_metadata


def compile_cleanup_regexes() -> Dict[str, re.Pattern]:
    """Compile regexes according to texts cleanup rules from DWH-588"""
    no_letters_row_re = re.compile(r"^[^a-zA-Z]+$", flags=re.M)
    part_title_re = re.compile(r"^(\d\.|[a-z]\.|I{1,3}\.){1,4}\s?[a-z0-9.\-_()αβγδ ]+$", flags=re.M | re.I)
    short_addition_re = re.compile(r"^\((.*?)\)$", flags=re.M | re.I)
    only_uppercase_re = re.compile(r"^[A-Z]$", flags=re.M)
    figure_reference_re = re.compile(r"^figure(.*?)$", flags=re.M | re.I)
    reference_re = re.compile(r"\s+\[[0-9\-, ]+]")
    space_symbols_re = re.compile(r"\s+")

    return {
        "no_letters_row_re": no_letters_row_re,
        "part_title_re": part_title_re,
        "short_addition_re": short_addition_re,
        "only_uppercase_re": only_uppercase_re,
        "figure_reference_re": figure_reference_re,
        "reference_re": reference_re,
        "space_symbols_re": space_symbols_re,
    }


def cleanup_text(text: str, regexes: Dict[str, re.Pattern]) -> str:
    for name, pattern in regexes.items():
        if name == "space_symbols_re":
            text = pattern.sub(" ", text)
        else:
            text = pattern.sub("", text)

    return text


def remove_non_printable_characters(text: str) -> str:
    return re.sub(r"[\x00-\x1F\x7F-\x9F]", "", text)


def clean_raw_text(text: str) -> str:
    regexes = compile_cleanup_regexes()
    cleaned_text = cleanup_text(text, regexes)
    cleaned_text = remove_non_printable_characters(cleaned_text)
    return cleaned_text


def get_file_text(pdf_reader: PdfReader) -> str:
    parts = []

    for page in pdf_reader.pages:
        parts.append(page.extract_text())

    text_body = " ".join(parts)

    cleaned_body = clean_raw_text(text_body)

    return cleaned_body


def get_file_content(
    custom_bibliography_file_pk: str, custom_bibliography_file_name: str
) -> Tuple[METADATA_TYPE, str]:
    file_path = CustomBibliographyFileS3Template.format(pk=custom_bibliography_file_pk)
    storage = get_storage()
    if not storage.key_exists(file_path):
        raise ValueError(f"file with pk {custom_bibliography_file_pk} doesn't downloaded")

    file = io.BytesIO(storage.get_file_contents(file_path))
    pdf_reader = PdfReader(file)
    metadata = get_file_metadata(pdf_reader)
    text = get_file_text(pdf_reader)

    metadata["file_name"] = custom_bibliography_file_name
    return metadata, text
