import logging
import os
import re
from typing import Any, List, Optional, cast

from langchain.prompts import PromptTemplate
from langchain.schema.runnable import Runnable, RunnableLambda, RunnablePassthrough
from langchain_community.utilities import GoogleSerperAPIWrapper
from langchain_core.output_parsers import BaseOutputParser
from pydantic import BaseModel

from kernel.agents.llm_agent import LLMAgent
from kernel.llm_agent_tools.defs import WebSearchProvider

from .flexible_retriever import WebSearchFlexibleRetriever
from .html_duckduckgo import HTMLDuckDuckGoWrapper
from .minimal_retriever import WebSearchMinimalRetriever

logger = logging.getLogger(__name__)

DEFAULT_MULTI_RETRIEVER_PROMPT_TEMPLATE = (
    "Your task is to create {n_queries} short different queries for web search based"
    " on the given text. The queries should be very specific, concise"
    " and clear. {n_queries} novel queries should be focused on different"
    " details of the initial text. Try to use synonyms and do not repeat the same words"
    " in the novel queries. If there is a named entity or acronym in the question,"
    " at least 1 novel question should contain the more general term of term."
    ' For example, "fibrosis" instead of "Idiopathic pulmonary fibrosis", "arrhythmia"'
    ' instead of "ventricular fibrillation" etc. Provide these alternative queries separated'
    " by newlines. Output only {n_queries} queries and nothing else. Do not output any explanations"
    " Original text:\n{question}"
)


class LinesParserRemoveNumbering(BaseOutputParser[list[str]]):
    def parse(self, text: str) -> list[str]:  # type: ignore
        lines = re.findall(r"(?:\d+)?(?:\.)?\s*(?P<line>.+)(?:\n|$)", text, re.MULTILINE)
        return [ll.strip('"').strip() for ll in lines]


class WebSearchRetrieverFactory:
    @staticmethod
    def _search(n_pages: int) -> BaseModel:
        raise NotImplementedError

    @staticmethod
    def _build_retriever_search_call_args(num_results: int) -> dict[str, Any]:
        raise NotImplementedError

    def _get_openai_prompt_diversifier(self, n_queries: int = 3) -> Runnable[str, list[str]]:
        llm = LLMAgent().llm
        query_diversifier = (
            PromptTemplate.from_template(DEFAULT_MULTI_RETRIEVER_PROMPT_TEMPLATE).partial(
                n_queries=n_queries  # type: ignore
            )
            | llm
            | LinesParserRemoveNumbering()
        ).with_config(run_name="QueryDiversifier")
        return cast(Runnable[str, list[str]], query_diversifier)

    def _get_source_specific_diversifier(self, sources: List[str]) -> Runnable[str, list[str]]:
        def diversify_query(queries: List[str]) -> List[str]:
            return [f"site:{source} {query.strip()}" for query in queries for source in sources]

        return RunnableLambda(diversify_query)

    def _get_queries_modifier(self) -> Runnable[list[str], list[str]]:
        def modify_query(queries: List[str]) -> List[str]:
            return [f"-filetype:pdf -filetype:xlsx -filetype:docx {q.strip()}" for q in queries]

        return RunnableLambda(modify_query)

    def _get_negative_source_modifier(self, sources: List[str]) -> Runnable[list[str], list[str]]:
        def modify_query(queries: List[str]) -> List[str]:
            modifier = " ".join(f"-site:{source}" for source in sources)
            return [f"{modifier} {q.strip()}" for q in queries]

        return RunnableLambda(modify_query)

    def create_minimal_retriever(self, num_results: int) -> WebSearchMinimalRetriever:
        """Create a minimal search retriever with query diversification using OpenAI"""
        query_diversifier = self._get_openai_prompt_diversifier()
        return WebSearchMinimalRetriever(
            search=self._search(num_results),
            search_call_args=self._build_retriever_search_call_args(num_results=num_results),
            query_diversifier=query_diversifier,
        )

    def create_flexible_retriever(
        self,
        num_results: int,
        sources: Optional[List[str]] = None,
        n_pages: int = 10,
        negative_source_sites: Optional[List[str]] = None,
        use_embeddings: bool = True,
    ) -> WebSearchFlexibleRetriever:
        """Create a flexible search retriever with full page retrieval and multiple queries"""
        if not sources:
            search_chain = self.create_minimal_retriever(num_results=3 if use_embeddings else 7)
            return WebSearchFlexibleRetriever(
                search_chain=search_chain, num_chunks=num_results, use_embeddings=use_embeddings
            )

        source_diversifier = self._get_source_specific_diversifier(sources)
        query_modifier = self._get_queries_modifier()
        query_processor = source_diversifier | query_modifier

        query_diversifier = (
            self._get_openai_prompt_diversifier() if len(sources) < 3 else RunnablePassthrough()
        )

        if negative_source_sites:
            query_processor = query_processor | self._get_negative_source_modifier(negative_source_sites)

        search_chain = WebSearchMinimalRetriever(
            search=self._search(n_pages),
            search_call_args=self._build_retriever_search_call_args(num_results=n_pages),
            query_diversifier=query_processor,
        )

        return WebSearchFlexibleRetriever(
            search_chain=search_chain,
            num_chunks=num_results if len(sources) >= 3 else num_results // 3,
            num_search_results=n_pages,
            query_diversifier=query_diversifier,
            url_filter=negative_source_sites,
            use_embeddings=use_embeddings,
        )


class GoogleSerperWebSearchFactory(WebSearchRetrieverFactory):
    @staticmethod
    def _search(n_pages: int) -> GoogleSerperAPIWrapper:
        return GoogleSerperAPIWrapper(k=n_pages)

    @staticmethod
    def _build_retriever_search_call_args(num_results: int) -> dict[str, Any]:
        return {"num_results": num_results}


class DuckDuckGoWebSearchFactory(WebSearchRetrieverFactory):
    @staticmethod
    def _search(n_pages: int) -> HTMLDuckDuckGoWrapper:
        return HTMLDuckDuckGoWrapper(min_delay=10.0, max_delay=15.0)

    @staticmethod
    def _build_retriever_search_call_args(num_results: int) -> dict[str, Any]:
        return {"max_results": num_results}


def get_search_factory(
    provider: WebSearchProvider = WebSearchProvider.GOOGLE,
) -> WebSearchRetrieverFactory:
    if provider == WebSearchProvider.GOOGLE and os.environ.get("SERPER_API_KEY"):
        logger.info("Using GoogleSerperWebSearchFactory (provider=GOOGLE, SERPER_API_KEY available)")
        return GoogleSerperWebSearchFactory()
    elif provider == WebSearchProvider.GOOGLE:
        logger.warning(
            "Provider set to GOOGLE but SERPER_API_KEY is missing, falling back to DuckDuckGoWebSearchFactory"
        )
        return DuckDuckGoWebSearchFactory()
    else:
        logger.info("Using DuckDuckGoWebSearchFactory (provider=DUCKDUCKGO)")
        return DuckDuckGoWebSearchFactory()


def get_flex_bare_serper_search(
    num_results: int,
    negative_source_sites: Optional[List[str]] = None,
    use_embeddings: bool = True,
    provider: WebSearchProvider = WebSearchProvider.GOOGLE,
) -> WebSearchFlexibleRetriever:
    search_factory = get_search_factory(provider)
    return search_factory.create_flexible_retriever(
        num_results=num_results,
        negative_source_sites=negative_source_sites,
        use_embeddings=use_embeddings,
    )


def get_flex_openai_multisource_serper_search(
    num_results: int,
    sources: Optional[List[str]] = None,
    n_pages: int = 10,
    negative_source_sites: Optional[List[str]] = None,
) -> WebSearchFlexibleRetriever:
    search_factory = get_search_factory()
    return search_factory.create_flexible_retriever(
        num_results=num_results,
        sources=sources,
        n_pages=n_pages,
        negative_source_sites=negative_source_sites,
    )
