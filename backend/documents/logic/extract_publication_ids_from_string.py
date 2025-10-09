import re
from typing import Tuple


def remove_and_collect_substrings(string: str, pattern: str) -> tuple[list[str], str]:
    removed_substrings = re.findall(pattern, string)
    updated_string = re.sub(pattern, "", string)
    return removed_substrings, updated_string


def remove_duplicates(array: list) -> list[str]:
    return list(set(array))


def multiple_replace(string: str, substrings: list[str], replacement: str) -> str:
    for char in substrings:
        string = string.replace(char, replacement)
    return string


def extract_pmcid_from_string(string: str) -> Tuple[str, list[str]]:
    string = string.lower()
    regex_pattern = r"pmc(?:id[-:]?|id[ :]?|:?)?\s?\d+"
    pmc_ids, updated_string = remove_and_collect_substrings(string, regex_pattern)
    pmc_ids = [
        multiple_replace(pmc_id, ["-", ":", " "], "").replace("pmcid", "PMC").replace("pmc", "PMC")
        for pmc_id in pmc_ids
    ]
    return updated_string, remove_duplicates(pmc_ids)


def extract_doi_from_string(string: str) -> Tuple[str, list[str]]:
    regex_pattern = r"10\.\S+\/\S+"
    doi_ids, updated_string = remove_and_collect_substrings(string, regex_pattern)
    return updated_string, remove_duplicates(doi_ids)


def extract_pubmed_from_string(string: str) -> Tuple[str, list[str]]:
    regex_pattern = r"\d+"
    pubmed_ids, updated_string = remove_and_collect_substrings(string, regex_pattern)
    return updated_string, remove_duplicates(pubmed_ids)


def extract_publication_ids_from_string(string: str) -> Tuple[str, list, list, list]:
    string = string.lower()
    updated_string, doi_nums = extract_doi_from_string(string)
    updated_string, pmc_ids = extract_pmcid_from_string(updated_string)
    updated_string, pubmed_ids = extract_pubmed_from_string(updated_string)
    updated_string = re.sub(r"\s+", "", updated_string, flags=re.UNICODE)
    substring_to_remove = [
        "https://doi.org/",
        "doi.org/",
        "https://pmc.ncbi.nlm.nih.gov/articles/",
        "https://pubmed.ncbi.nlm.nih.gov/",
        "pubmed",
        "pmid",
        "pmc",
        "doi",
        "id",
        "/",
        ":",
        ";",
        ",",
        ".",
        "-",
        "_",
        "(",
        ")",
        "|",
        "\\",
        "'",
        '"',
        "=",
    ]
    updated_string = multiple_replace(string=updated_string, substrings=substring_to_remove, replacement="")

    return updated_string, doi_nums, pmc_ids, pubmed_ids
