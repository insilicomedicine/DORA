import re
from typing import List, Tuple

PMID_IDENTIFIER_NAME = "PMID"
CHUNK_ID_IDENTIFIER_NAME = "CHUNK_ID"

PMID_CHUNK_ID_REGEX = (
    r"\b"
    + PMID_IDENTIFIER_NAME
    + r":(\d+)\s*,\s*"
    + CHUNK_ID_IDENTIFIER_NAME
    + r":([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\b"
)


BIB_ID_CHUNK_ID_REGEX = (
    r"\b"
    + "BIB_ID"
    + r":([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\s*,\s*"
    + "CHUNK_ID"
    + r":([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\b"
)


class PmIdChunkIdParser:
    def __init__(self, input_text: str) -> None:
        self._input_text: str = input_text
        self._pmid_list: List[int] = []
        self._chunk_id_list: List[str] = []
        self._pmid_chunk_id_list: List[Tuple[int, str]] = []

    def parse(self) -> None:
        matches = re.findall(PMID_CHUNK_ID_REGEX, self._input_text, re.IGNORECASE)
        if matches:
            self._pmid_list = [int(pmid) for pmid, _ in matches]
            self._chunk_id_list = [chunk_id for _, chunk_id in matches]
            self._pmid_chunk_id_list = [(int(pmid), chunk_id) for pmid, chunk_id in matches]

    @property
    def pmid_list(self) -> List[int]:
        return self._pmid_list

    @property
    def chunk_id_list(self) -> List[str]:
        return self._chunk_id_list

    @property
    def pmid_chunk_id_list(self) -> List[Tuple[int, str]]:
        return self._pmid_chunk_id_list


class BibIdChunkIdParser:
    def __init__(self, input_text: str) -> None:
        self._input_text: str = input_text
        self._bib_id_chunk_id_list: List[Tuple[str, str]] = []

    def parse(self) -> None:
        matches = re.findall(BIB_ID_CHUNK_ID_REGEX, self._input_text, re.IGNORECASE)
        if matches:
            self._bib_id_chunk_id_list = [(bib_id, chunk_id) for bib_id, chunk_id in matches]

    @property
    def bib_id_chunk_id_list(self) -> List[Tuple[str, str]]:
        return self._bib_id_chunk_id_list
