import logging
import re
from collections import Counter
from typing import Any, Dict, List, Tuple

import nltk
import textstat
from nltk.tokenize import word_tokenize

from documents.models import Document
from documents.serializers import DocumentDetailSerializer

logger = logging.getLogger(__name__)

try:
    nltk.data.find("tokenizers/punkt")
except LookupError:
    nltk.download("punkt")


def flatten_sections(sections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    collection = []
    counter = Counter()

    def update_collection(section: Dict[str, Any], level: int) -> None:
        title = section.get("title", "Unnamed Section")
        if num := counter[title]:
            title = f"{title} {num + 1}"
        collection.append(
            {
                "title": title,
                "text": section.get("result", {}).get("data", "No data"),
                "level": level,
            }
        )
        counter[title] += 1

    def recursive_collect(section: Dict[str, Any], level: int) -> None:
        for sub_section in section.get("sub_sections", []):
            update_collection(sub_section, level)
            recursive_collect(sub_section, level + 1)

    for section in sections:
        update_collection(section, level=1)
        recursive_collect(section, level=2)

    return collection


def get_plain_text(flattened_sections: List[Dict[str, Any]]) -> str:
    document_parts = []
    for section in flattened_sections:
        indent = "#" * section["level"]
        document_parts.append(f"{indent} {section['title']}\n")
        document_parts.append(f"{section['text']}\n")
    return "\n".join(document_parts)


def count_characters_and_words(text: str) -> Tuple[int, int]:
    text = text.lower()
    text = re.sub(r"[^\w\s]", "", text)
    words = word_tokenize(text)
    return len(text), len(words)


def calculate_reading_time(word_count: int, wpm: int = 238) -> float:
    return round(word_count / wpm, 1)


def count_references(input_dict: Dict[str, List[str]]) -> int:
    return len(set(input_dict.keys()))


def count_bib_chunk_occurrences(text: str) -> int:
    pattern = r"BIB_ID:[\w-]+,\s*CHUNK_ID:[\w-]+"
    matches = re.findall(pattern, text)
    return len(matches)


def get_publication_years(dora_full_json: Dict[str, Any]) -> List[int]:
    publication_years = []
    for entry in dora_full_json.get("bibliographies", []):
        if entry.get("type") == "pubmed":
            year = entry.get("metadata", {}).get("pub_year")
            if year:
                try:
                    publication_years.append(int(year))
                except ValueError:
                    logging.warning(f"Invalid publication year: {year}")
    return publication_years


def calculate_metrics(document: "Document") -> Dict[str, Any]:
    full_json = DocumentDetailSerializer(document).data
    flattened_sections = flatten_sections(full_json["sections"])
    text_plain = get_plain_text(flattened_sections)

    total_characters, total_words = count_characters_and_words(text_plain)
    reading_time = calculate_reading_time(total_words)
    words_characters_count = {
        section["title"]: count_characters_and_words(section["text"]) for section in flattened_sections
    }

    fk_score = textstat.flesch_kincaid_grade(text_plain)

    bibliographies = {
        record.get("id"): list(record.get("chunks", {}).keys())
        for record in full_json.get("bibliographies", [])
    }
    unique_references = count_references(bibliographies)
    total_references = sum(count_bib_chunk_occurrences(section["text"]) for section in flattened_sections)
    publication_years = get_publication_years(full_json)
    year_counts = Counter(publication_years)

    metrics = {
        "language_and_style": {
            "total_word_count": total_words,
            "total_character_count": total_characters,
            "reading_time_minutes": reading_time,
            "section_word_character_counts": words_characters_count,
        },
        "readability_and_structure": {
            "flesch_kincaid_grade": fk_score,
        },
        "argumentation_and_evidence": {
            "total_references": total_references,
            "unique_references": unique_references,
            "publication_year_distribution": {str(k): v for k, v in dict(year_counts).items()},
        },
    }

    return metrics
