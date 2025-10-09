import logging
from typing import List, Tuple

import nltk
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from langchain.text_splitter import NLTKTextSplitter
from pgvector.django import L2Distance

from bibliography.defs import CustomBibliographyFileStatus
from bibliography.models import Bibliography, CustomBibliographyChunkEmbeddings, CustomBibliographyFile
from kernel.embeddings.embedding_utils import init_embedding_model
from kernel.services.token_counter import TokenCounter

logger = logging.getLogger(__name__)

CHUNK_SIZE = 500
CHUNK_OVERLAP = 50

try:
    nltk.data.find("tokenizers/punkt_tab")
except LookupError:
    nltk.download("punkt_tab")

try:
    nltk.data.find("tokenizers/punkt")
except LookupError:
    nltk.download("punkt")


def get_chunks_from_text(
    text: str,
    chunk_size: int = CHUNK_SIZE,
    chunk_overlap: int = CHUNK_OVERLAP,
) -> List[str]:
    logger.info(f"Getting chunks for {len(text)} text")
    text_splitter = NLTKTextSplitter(separator=" ", chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    chunks = []
    for chunk in text_splitter.create_documents([text]):
        if 100 <= len(chunk.page_content) <= 3000:
            chunks.append(chunk.page_content)
    return chunks


def get_embedding_token_usage(chunks: List[str]) -> int:
    total_tokens = 0
    token_counter = TokenCounter(settings.EMBEDDING_OPENAI_API_CONFIGS[0].get("model"))
    for chunk in chunks:
        total_tokens += token_counter.count_tokens(chunk)
    return total_tokens


def calculate_embeddings(chunks: List[str]) -> Tuple[List[List[float]], int]:
    logger.info(f"Got {len(chunks)} chunks for embedding")
    total_tokens = get_embedding_token_usage(chunks)
    fulltext_content = []
    for chunk in chunks:
        fulltext_content.extend([chunk])
    return init_embedding_model().embed_documents(fulltext_content), total_tokens


def get_custom_bibliography_chunks(
    query: str,
    custom_bibliography_files_pks: List[str],
    max_chunks: int = 30,
) -> list:
    embeddings = init_embedding_model().embed_query(query)

    chunks = (
        CustomBibliographyChunkEmbeddings.objects.annotate(similarity=L2Distance("embeddings", embeddings))
        .filter(
            custom_bibliography_file_id__in=custom_bibliography_files_pks,
            custom_bibliography_file__status=CustomBibliographyFileStatus.PROCESSED,
        )
        .order_by("similarity")
        .values("pk", "custom_bibliography_file_id", "chunk_text")
    )[:max_chunks]

    content_type = ContentType.objects.get_for_model(CustomBibliographyFile)
    custom_bibliography_files_ids = [chunk["custom_bibliography_file_id"] for chunk in chunks]
    bibliographies = Bibliography.objects.filter(
        content_type=content_type, object_id__in=custom_bibliography_files_ids
    ).values("pk", "object_id")
    if bibliographies:
        bib_id_map = {biblio["object_id"]: biblio["pk"] for biblio in bibliographies}
        for chunk in chunks:
            chunk["bib_id"] = bib_id_map.get(chunk["custom_bibliography_file_id"])

    return list(chunks)
