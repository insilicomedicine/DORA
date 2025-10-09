import uuid
from typing import Any, Dict, List, Optional, Type

import sentry_sdk
from django.conf import settings
from langchain.schema import StrOutputParser
from langchain.schema.runnable import RunnablePassthrough
from langchain.tools import BaseTool
from langchain_core.prompts import PromptTemplate
from pydantic import BaseModel
from requests.exceptions import ConnectionError, Timeout
from tenacity import RetryError, retry, retry_if_exception_type, stop_after_attempt, wait_fixed

from base.utils import normalize_bibliography_reference
from bibliography.logic.chunks import get_custom_bibliography_chunks
from dwh.metadata.postprocessing import cache_used_chunks
from dwh.scientific_publication.publication_chunks import get_publication_chunks, merge_publication_chunks
from general.defs import ConfigKeyType, PublicationChunksFeature
from general.models import Config
from kernel.chat_models.utils import init_llm
from kernel.defs import SearchResource
from kernel.llm_agent_tools.defs import (
    MAX_EXECUTION_COUNT_REACHED_MESSAGE,
    PUBMED_ABSTRACT_SIMILARITY_SEARCH_PROMPT,
    ToolNames,
)
from kernel.llm_agent_tools.helpers.document_utils import format_docs
from kernel.utils import capture_and_suppress_exception

from .input_models import QueryInputModel

MAX_TOKENS = 32000
START_YEAR = 2010


@retry(
    retry=(retry_if_exception_type((ConnectionError, Timeout))),
    stop=stop_after_attempt(settings.EXTERNAL_API_MAX_RETRIES),
    wait=wait_fixed(settings.EXTERNAL_API_RETRY_WAIT),
)
def get_similar_documents(
    query: str,
    top_k: int,
    start_year: int,
    article_types: List[str],
    filter_article_types: bool,
    custom_bibliography_file_pks: List[str],
    sort_by=Optional[str],
    resources=List[str],
) -> List[Dict[str, Any]]:
    abstract_chunks, fulltext_chunks = get_publication_chunks(
        query=query,
        max_chunks=top_k,
        start_year=start_year,
        article_types=article_types,
        filter_article_types=filter_article_types,
        sort_by=sort_by,
        resources=resources,
        use_separate_settings_for_resources=True,
        feature=PublicationChunksFeature.PUBMED_ABSTRACT_SIMILARITY_SEARCH,
    )

    try:
        # If the files exist (custom_bibliography_file_pks not empty)
        # it automatically means that the custom bibliography was enabled
        custom_bibliography_chunks = (
            get_custom_bibliography_chunks(query, custom_bibliography_file_pks)
            if custom_bibliography_file_pks
            else []
        )
    except Exception as exc:
        sentry_sdk.capture_exception(exc)
        custom_bibliography_chunks = []

    result = merge_publication_chunks(
        custom_bibliography_chunks=custom_bibliography_chunks,
        fulltext_chunks=fulltext_chunks,
        abstract_chunks=abstract_chunks,
    )

    mapping = {
        "chunk_text": "chunk",
        "fulltext_chunk": "chunk",
        "abstract_chunk": "chunk",
        "bib_id": "temp_bib_id",
        "pk": "chunk_id",
    }

    mapped_result = []
    for item in result:
        mapped_result.append(
            {mapping[key] if mapping.get(key) else key: value for key, value in item.items()}
        )

    return mapped_result


def append_temp_bib_id(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    pubmed_id_tem_id_mapping = {}
    for doc in docs:
        if doc.get("temp_bib_id"):
            continue

        if temp_bib_id := pubmed_id_tem_id_mapping.get(doc["pubmed_id"]):
            doc["temp_bib_id"] = temp_bib_id
        else:
            doc["temp_bib_id"] = str(uuid.uuid4())
            pubmed_id_tem_id_mapping[doc["pubmed_id"]] = doc["temp_bib_id"]
    return docs


class PubmedAbstractSimilaritySearchTool(BaseTool):
    name: str = ToolNames.PUBMED_ABSTRACT_SIMILARITY_SEARCH_TOOL
    args_schema: Type[BaseModel] = QueryInputModel
    description: str = (
        "Necessary when you want to get scientific evidence based on PubMed abstracts."
        " Always provide BIB_ID and CHUNK_ID in the resulting text."
    )

    TOP_K: int = 50
    TOKEN_FOR_ANSWER: int = 10000
    TEMPERATURE: float = 0.0
    execution_count: int = 0
    max_execution_count: int = 10

    # publication settings
    start_year: int = START_YEAR
    article_types: List[str] = []
    filter_article_types: bool = False
    sort_by: Optional[str] = ""
    custom_bibliography_file_pks: List[str] = []
    resources: List[str] = [SearchResource.PUBMED, SearchResource.PMC]

    @capture_and_suppress_exception
    def _run(self, query: str) -> Any:
        if self.execution_count < self.max_execution_count:
            self.execution_count += 1

            try:
                docs = get_similar_documents(
                    query,
                    top_k=self.TOP_K,
                    start_year=self.start_year,
                    article_types=self.article_types,
                    filter_article_types=self.filter_article_types,
                    custom_bibliography_file_pks=self.custom_bibliography_file_pks,
                    sort_by=self.sort_by,
                    resources=self.resources,
                )
            except RetryError as exc:
                sentry_sdk.capture_exception(exc)
                return ""

            docs = append_temp_bib_id(docs)

            formatted_docs = format_docs(docs, self.TOKEN_FOR_ANSWER, settings.OPENAI_API_MODEL, MAX_TOKENS)

            llm = init_llm(temperature=self.TEMPERATURE)

            prompt_tempate = Config.get(ConfigKeyType.TOOL_PROMPTS, {}).get(
                self.name, PUBMED_ABSTRACT_SIMILARITY_SEARCH_PROMPT
            )
            rag_prompt_custom = PromptTemplate(
                input_variables=["context", "question"],
                template=prompt_tempate,
            )
            rag_chain = RunnablePassthrough() | rag_prompt_custom | llm | StrOutputParser()
            result = rag_chain.invoke({"context": formatted_docs, "question": query})
            result = normalize_bibliography_reference(result)

            cache_used_chunks(docs, result)

            return result
        else:
            return MAX_EXECUTION_COUNT_REACHED_MESSAGE.format(tool_name=self.name)

    def get_tool_result(self, query: str) -> Any:
        self.execution_count = 0
        return self._run(query)
