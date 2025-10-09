import json
import math
import uuid
from typing import Any, Callable, Dict, List, Optional, Tuple, Type

import pandas as pd
from django.conf import settings
from django.core.cache import caches
from langchain.prompts import PromptTemplate
from langchain.schema import StrOutputParser
from langchain.schema.runnable import RunnablePassthrough
from langchain.tools import BaseTool
from langchain_core.documents import Document
from pydantic import BaseModel, ConfigDict

from base.utils import normalize_bibliography_reference
from dwh.metadata.postprocessing import get_bib_id_chunk_id_list
from general.defs import ConfigKeyType
from general.models import Config
from kernel.chat_models.utils import init_llm
from kernel.llm_agent_tools.defs import MAX_EXECUTION_COUNT_REACHED_MESSAGE, WEB_SEARCH_PROMPT, ToolNames
from kernel.llm_agent_tools.helpers.document_utils import format_docs
from kernel.utils import capture_and_suppress_exception
from users.defs import TokenUsage

from ..models import TemplateAgent
from .input_models import QueryInputModel
from .web_search.retriever_factory import (
    get_flex_bare_serper_search,
    get_flex_openai_multisource_serper_search,
)

MAX_TOKENS = 64000
START_YEAR = 2010


def format_output(docs: pd.DataFrame) -> str:
    dict_docs = {
        i: {"PMID": pm_id, "CHUNK_ID": uuid, "TEXT": " ".join(document.split("\n\n"))}
        for i, (pm_id, uuid, document) in enumerate(zip(docs["pm_id"], docs["uuid"], docs["document"]))
    }
    return json.dumps(dict_docs)


def convert_docs(docs: List[Document]) -> List[Dict[str, Any]]:
    converted_docs = []
    bib_ids_mapping = {}
    for doc in docs:
        converted = {
            "source": doc.metadata["link"],
            "created_at": doc.metadata["created_at"],
            "title": doc.metadata["title"],
        }
        bib_id = bib_ids_mapping.get(doc.metadata["link"], None)
        if bib_id:
            converted["bib_id"] = bib_id
        else:
            bib_id = str(uuid.uuid4())
            converted["bib_id"] = bib_id
            bib_ids_mapping[doc.metadata["link"]] = bib_id
        converted["chunk_id"] = str(uuid.uuid4())

        text = doc.page_content
        if text.startswith("Title:"):
            text = " ".join(text.split("\n\n")[1:])
        else:
            text = " ".join(text.split("\n\n"))
        converted["chunk"] = text
        converted_docs.append(converted)
    return converted_docs


def get_used_docs(result: str, docs_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    tool_ids = get_bib_id_chunk_id_list(result)
    used_docs = []
    for doc in docs_list:
        if (doc["bib_id"], doc["chunk_id"]) in tool_ids:
            used_docs.append(doc)
    return used_docs


def get_source_site_mapping() -> Dict[str, str]:
    template_agents = TemplateAgent.objects.all()
    for agent in template_agents:
        if ToolNames.WEB_SEARCH_TOOL in agent.agents:
            return {
                resource["value"]: resource["site"]
                for resource in agent.resources
                if resource.get("value") and resource.get("site")
            }
    return {}


class WebSearchTool(BaseTool):
    model_config = ConfigDict(extra="allow")

    name: str = ToolNames.WEB_SEARCH_TOOL
    args_schema: Type[BaseModel] = QueryInputModel
    description: str = (
        "Necessary when you want to get any kind of evidence based on web search results."
        " Always provide BIB_ID and CHUNK_ID in the resulting text."
    )

    TOP_K: int = 10
    TOKEN_FOR_ANSWER: int = 10000
    TEMPERATURE: float = 0.0
    PAGES_PER_SOURCE: int = 3
    GENERAL_SOURCE_KEY: str = "google"
    execution_count: int = 0
    max_execution_count: int = 15
    sources: List[str] = []
    token_record_callback: Optional[Callable[[TokenUsage], None]] = None

    @capture_and_suppress_exception
    def _run(self, query: str) -> Any:
        if self.execution_count < self.max_execution_count:
            self.execution_count += 1
            source_site_mapping = get_source_site_mapping()

            docs_list, total_tokens = self._retrieve_docs(query, source_site_mapping)
            if self.token_record_callback:
                self.token_record_callback(
                    token_usage=TokenUsage(
                        prompt_tokens=total_tokens, completion_tokens=0, total_tokens=total_tokens
                    )
                )

            prompt_template = Config.get(ConfigKeyType.TOOL_PROMPTS, {}).get(self.name, WEB_SEARCH_PROMPT)
            rag_prompt_custom = PromptTemplate(
                input_variables=["context", "question"], template=prompt_template
            )
            docs_list = convert_docs(docs_list)
            docs_list_formatted = format_docs(
                docs_list, self.TOKEN_FOR_ANSWER, settings.OPENAI_API_MODEL, MAX_TOKENS
            )

            llm = init_llm(temperature=self.TEMPERATURE)
            rag_chain = RunnablePassthrough() | rag_prompt_custom | llm | StrOutputParser()
            result = rag_chain.invoke({"context": docs_list_formatted, "question": query})
            result = normalize_bibliography_reference(result)
            used_docs = get_used_docs(result, docs_list)
            cache = caches["webchunks"]
            for doc in used_docs:
                cache_key = (doc["bib_id"], doc["chunk_id"])
                cache.set(cache_key, doc, timeout=60 * 60 * 2)
            return result
        else:
            return MAX_EXECUTION_COUNT_REACHED_MESSAGE.format(tool_name=self.name)

    def _retrieve_docs(self, query: str, source_site_mapping: Dict[str, str]) -> Tuple[List[Dict], int]:
        source_sites = [
            source_site_mapping[source]
            for source in self.sources
            if source in source_site_mapping and source != self.GENERAL_SOURCE_KEY
        ]
        if self.GENERAL_SOURCE_KEY in self.sources:
            negative_source_sites = [
                source for site, source in source_site_mapping.items() if site not in self.sources
            ]
        else:
            negative_source_sites = []

        # sources contain only general site
        if not source_sites:
            retriever = get_flex_bare_serper_search(self.TOP_K, negative_source_sites=negative_source_sites)
            docs = retriever.invoke(query)
            return docs, retriever.total_tokens

        n_pages = math.ceil(self.PAGES_PER_SOURCE / len(source_sites))
        # sources contain only specific sites
        if self.GENERAL_SOURCE_KEY not in self.sources:
            retriever = get_flex_openai_multisource_serper_search(
                self.TOP_K * 2, source_sites, n_pages=n_pages, negative_source_sites=negative_source_sites
            )
            docs = retriever.invoke(query)
            return docs, retriever.total_tokens

        # sources contain both general and specific sites
        retriever_multi = get_flex_openai_multisource_serper_search(
            self.TOP_K * 2, source_sites, n_pages=n_pages, negative_source_sites=negative_source_sites
        )
        retriever_general = get_flex_bare_serper_search(
            self.TOP_K, negative_source_sites=negative_source_sites
        )
        docs_list_multi = retriever_multi.invoke(query)
        docs_list_general = retriever_general.invoke(query)
        docs = docs_list_multi + docs_list_general
        total_tokens = retriever_multi.total_tokens + retriever_general.total_tokens
        return docs, total_tokens

    def get_tool_result(self, query: str) -> Any:
        self.execution_count = 0
        result = self._run(query)
        return result
