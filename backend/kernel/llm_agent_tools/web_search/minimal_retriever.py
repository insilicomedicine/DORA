from datetime import datetime
from typing import Any

from django.conf import settings
from glom import glom
from langchain.retrievers.document_compressors import DocumentCompressorPipeline, FlashrankRerank
from langchain.schema import Document
from langchain.schema.runnable import Runnable, RunnablePassthrough
from langchain_community.utilities import (
    DuckDuckGoSearchAPIWrapper,
    GoogleSearchAPIWrapper,
    GoogleSerperAPIWrapper,
    SerpAPIWrapper,
)
from langchain_core.callbacks import CallbackManagerForRetrieverRun
from langchain_core.retrievers import BaseRetriever
from pydantic import Field, model_validator
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_random
from typing_extensions import Self

from .html_duckduckgo import HTMLDuckDuckGoWrapper


class WebSearchMinimalRetriever(BaseRetriever):
    """Expands the query with `query_diversifier`. Searches the Web with each
    of the new queries using `search` object, gathering `search_n_per_query` results
    from each query. Optionally filters results and returns up to
    `num_results` documents. Each document contains a `url` field in the metadata.
    If `num_results` <= 0, all search results are returned.
    """

    query_diversifier: Runnable[list[str], list[str]] = Field(
        default_factory=RunnablePassthrough, description="Chain to diversify search query."
    )
    include_original: bool = Field(
        default=False,
        description="Whether to include original query with alternative variants."
        " Works only if query diversifier is not None.",
    )
    num_search_results: int = Field(default=3, description="Number of search results to retrieve per query.")
    num_results: int = Field(
        default=-1,
        description="Number of documents to return after filtering."
        " Works only if the retrieved_doc_pipeline is default (None).",
    )
    # private, but can be overriden by the caller
    search: Any = Field(default=None, description="Search API to use")
    search_call_args: dict[str, Any] | None = Field(
        default=None, description="Arguments to pass to the search API"
    )
    retrieved_doc_pipeline: DocumentCompressorPipeline = Field(
        default=None,
        description="Pipeline applied to retrieved chunks. By default, nothing is done",
    )

    @model_validator(mode="after")
    def init(self) -> Self:
        """Fill missing arguments"""
        if self.search is None:
            self.search = SerpAPIWrapper(
                params={
                    "engine": "google",
                    "google_domain": "google.com",
                    "gl": "us",
                    "hl": "en",
                    "num": self.num_search_results,
                }
            )
            self.search_call_args = {}
        elif isinstance(self.search, GoogleSearchAPIWrapper):
            self.search_call_args = self.search_call_args or {"num_results": self.num_search_results}
        elif isinstance(self.search, DuckDuckGoSearchAPIWrapper):
            self.search_call_args = self.search_call_args or {"max_results": self.num_search_results}
        elif isinstance(self.search, GoogleSerperAPIWrapper):
            self.search_call_args = self.search_call_args or {}
        elif isinstance(self.search, SerpAPIWrapper):
            self.search_call_args = self.search_call_args or {}
        else:
            raise ValueError(f"Unsupported search API: {self.search}")

        if self.retrieved_doc_pipeline is None:
            if self.num_results > 0:
                transformers = [FlashrankRerank(top_n=self.num_results)]
            else:
                transformers = []
            self.retrieved_doc_pipeline = DocumentCompressorPipeline(transformers=transformers)
        return self

    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun = None
    ) -> list[Document]:
        """
        Args:
            query: String to search for
            run_manager: The callbacks handler to use

        Returns:
            List of relevant documents
        """
        query = [query]
        new_queries = self.query_diversifier.invoke(
            query, config={"callbacks": run_manager.get_child() if run_manager else None}
        )
        if not isinstance(self.query_diversifier, RunnablePassthrough) and self.include_original:
            new_queries.extend(query)
        if not isinstance(self.query_diversifier, RunnablePassthrough) and self.include_original:
            new_queries.extend(query)

        search_results: list[dict[str, str]] = []
        if self.search is not None:
            search_call_args = getattr(self, "search_call_args", {})
            if isinstance(self.search, GoogleSerperAPIWrapper):
                for new_query in new_queries:
                    search_results += self.search.results(new_query, **search_call_args).get("organic", [])
            elif isinstance(self.search, SerpAPIWrapper):
                for new_query in new_queries:
                    search_results += self.search.results(new_query, **search_call_args).get(
                        "organic_results", []
                    )
            elif isinstance(self.search, (DuckDuckGoSearchAPIWrapper, HTMLDuckDuckGoWrapper)):
                for new_query in new_queries:
                    search_results += self._search_results_with_retry(new_query, search_call_args)
            else:
                for new_query in new_queries:
                    search_results += self.search.results(new_query, **search_call_args)

        # Normalize search results. Removes unnecessary fields and converts date to ISO format.
        # Ensures there is a source field (needed for question answering chains to return source
        # urls)
        search_results_norm = glom(
            search_results,
            [
                {
                    "title": "title",
                    "snippet": "snippet",
                    "link": "link",
                    "source": "link",
                    "created_at": lambda _: datetime.now().isoformat(),
                }
            ],
        )
        snippet_docs = []
        for result in search_results_norm:
            snippet = result.pop("snippet", "")
            doc = Document(page_content=snippet, metadata=result)
            snippet_docs.append(doc)

        if self.retrieved_doc_pipeline is not None:
            snippet_docs = list(
                self.retrieved_doc_pipeline.compress_documents(
                    snippet_docs, query, callbacks=run_manager.get_child() if run_manager else None
                )
            )
        return snippet_docs

    @retry(
        retry=(retry_if_exception_type(Exception)),
        stop=stop_after_attempt(settings.EXTERNAL_API_MAX_RETRIES),
        wait=wait_random(min=2, max=10),
    )
    def _search_results_with_retry(self, query, search_call_args) -> list[Document]:
        return self.search.results(query, **search_call_args)
