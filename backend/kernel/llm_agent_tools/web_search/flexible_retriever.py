import asyncio
import logging
import re
import uuid
from collections.abc import Callable, Sequence
from datetime import datetime
from typing import Any, Dict, List, Literal

from chromadb.config import Settings
from django.conf import settings
from glom import glom
from langchain.callbacks.manager import AsyncCallbackManagerForRetrieverRun, CallbackManagerForRetrieverRun
from langchain.retrievers.document_compressors.base import DocumentCompressorPipeline
from langchain.schema.runnable import (
    Runnable,
    RunnableConfig,
    RunnableLambda,
    RunnablePassthrough,
    RunnableSerializable,
)
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import AsyncHtmlLoader
from langchain_community.document_loaders.base import BaseLoader
from langchain_community.utilities import (
    DuckDuckGoSearchAPIWrapper,
    GoogleSearchAPIWrapper,
    GoogleSerperAPIWrapper,
    SerpAPIWrapper,
)
from langchain_community.vectorstores import Chroma
from langchain_core.documents import BaseDocumentTransformer, Document
from langchain_core.retrievers import BaseRetriever
from langchain_core.vectorstores import VectorStore
from pydantic import Field, model_validator
from typing_extensions import Self

from kernel.embeddings.embedding_utils import init_embedding_model
from kernel.services.token_counter import TokenCounter

from .document_chunk_tagger import DocumentChunkTagger
from .document_transformers import CustomBeautifulSoupTransformer
from .html_duckduckgo import HTMLDuckDuckGoWrapper

logger = logging.getLogger(__name__)


class SearchAPIRetrieverAdapter(RunnableSerializable[str, Sequence[Document]]):
    num_results: int = 3
    provider: Literal["google", "duckduckgo", "serper", "serpapi"] = "serpapi"

    search_obj: DuckDuckGoSearchAPIWrapper | GoogleSearchAPIWrapper | None = Field(
        default=None, description="Search API object"
    )
    search_call_args: dict[str, Any] = Field(
        default_factory=dict, description="Arguments to pass to the `results` method"
    )

    @model_validator(mode="after")
    def init(self) -> Self:
        if self.search_obj is None:
            if self.provider == "duckduckgo":
                self.search_obj = HTMLDuckDuckGoWrapper()
                self.search_call_args = {"max_results": self.num_results}
            elif self.provider == "google":
                self.search_obj = GoogleSearchAPIWrapper()
                self.search_call_args = {"num_results": self.num_results}
            elif self.provider == "serper":
                self.search_obj = GoogleSerperAPIWrapper(k=self.num_results)
                self.search_call_args = {}
            elif self.provider == "serpapi":
                self.search_obj = SerpAPIWrapper(
                    params={
                        "engine": "google",
                        "google_domain": "google.com",
                        "gl": "us",
                        "hl": "en",
                        "num": self.num_results,
                    }
                )
                self.search_call_args = {}
            else:
                raise ValueError("Unknown provider")
        return self

    def invoke(self, input: str, config: RunnableConfig | None = None, **kwargs: Any) -> Sequence[Document]:
        return self._call_with_config(self.results, input, config, **kwargs)

    def results(self, input: str) -> Sequence[Document]:
        if self.search_obj is None:
            raise ValueError("Search object is not initialized. Provide search_obj or provider.")
        if self.provider == "serper":
            results = self.search_obj.results(input, **self.search_call_args).get("organic", [])
        elif self.provider == "serpapi":
            results = self.search_obj.results(input, **self.search_call_args).get("organic_results", [])
        else:
            results = self.search_obj.results(input, **self.search_call_args)
        # Normalize search results. Removes unnecessary fields and converts date to ISO format.
        # Ensures there is a source field (needed for question answering chains to return source
        # urls)
        results_norm = glom(
            results,
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
        docs = []
        for result in results_norm:
            snippet = result.pop("snippet", "")
            doc = Document(page_content=snippet, metadata=result)
            docs.append(doc)
        return docs


class TextCleaner(BaseDocumentTransformer):
    """
    Cleans Documents page_content according to rules from DWH-588
    """

    def compile_cleanup_regexes(self) -> Dict[str, re.Pattern]:
        """Compile regexes according to texts cleanup rules from DWH-588"""
        no_letters_row_re = re.compile(r"^[^a-zA-Z]+$", flags=re.M)
        part_title_re = re.compile(
            r"^(\d\.|[a-z]\.|I{1,3}\.){1,4}\s?[a-z0-9.\-_()αβγδ ]+$", flags=re.M | re.I
        )
        short_addition_re = re.compile(r"^\((.*?)\)$", flags=re.M | re.I)
        only_uppercase_re = re.compile(r"^[A-Z]$", flags=re.M)
        figure_reference_re = re.compile(r"^figure(.*?)$", flags=re.M | re.I)
        table_reference_re = re.compile(r"^table(.*?)$", flags=re.M | re.I)
        reference_re = re.compile(r"\s+\[[0-9\-, ]+]")
        sharp_re = re.compile(r"#+")
        star_re = re.compile(r"\*+")
        space_symbols_re = re.compile(r"\s+")

        return {
            "no_letters_row_re": no_letters_row_re,
            "part_title_re": part_title_re,
            "short_addition_re": short_addition_re,
            "only_uppercase_re": only_uppercase_re,
            "figure_reference_re": figure_reference_re,
            "table_reference_re": table_reference_re,
            "reference_re": reference_re,
            "sharp_re": sharp_re,
            "star_re": star_re,
            "space_symbols_re": space_symbols_re,
        }

    def cleanup_text(self, text: str, regexes: Dict[str, re.Pattern]) -> str:
        for name, pattern in regexes.items():
            if name == "space_symbols_re":
                text = pattern.sub(" ", text)
            else:
                text = pattern.sub("", text)
        return text

    def transform_documents(self, documents: Sequence[Document], **kwargs: Any) -> Sequence[Document]:
        regexes = self.compile_cleanup_regexes()
        for doc in documents:
            doc.page_content = self.cleanup_text(doc.page_content, regexes)
        return documents


class WebSearchFlexibleRetriever(BaseRetriever):
    """Highly configurable Web research retriever, where each step of the
    retrieval can be overriden. By default searches the original query,
    downloads `num_search_results` resulting pages, slices them and adds to vectorstore,
    finally
    """

    MINIMAL_ACCEPTABLE_PAGE_LENGTH: int = 100
    MAXMIUM_ACCEPTABLE_PAGE_LENGTH: int = 1000000
    MAX_EMBEDDING_TOKENS: int = 200000
    # Inputs
    query_diversifier: Runnable[list[str], list[str]] = Field(
        default=None, description="Chain to diversify search query. Signature: str -> list[str]"
    )
    search_chain: Runnable[str, Sequence[Document]] = Field(
        default=None,
        description="Search API Wrapper, the output has to be a list of Documents"
        " which contain `link` keys in the metadata",
    )
    num_search_results: int = Field(default=3, description="Number of search results to retrieve")
    get_web_loader: Callable[[list[str]], BaseLoader] = Field(
        default=None,
        description="Web loader constructor. Should take urls list. May be __init__ of most"
        " Langchain loaders. By default will use Jina loader.",
    )
    web_page_doc_pipeline: DocumentCompressorPipeline = Field(
        default=None,
        description="Transformations applied to downloaded web page documents. By default,"
        " they are splitted to chunks, added `chunk_id` key",
    )
    vectorstore: VectorStore = Field(default=None, description="Vector store for storing web pages")
    num_chunks: int = Field(default=5, description="The number of chunks to retrieve from the vectorstore")
    use_mmr: bool = Field(
        default=False, description="Whether to use maximal marginal relevance search in vectorstore"
    )
    num_chunks_fetch: int = Field(
        default=10,
        description="Number of chunks to fetch in MMR search. Works only if use_mmr is True",
    )
    retrieved_doc_pipeline: DocumentCompressorPipeline = Field(
        default=None,
        description="Pipeline applied to retrieved chunks. By default, nothing is done",
    )
    url_filter: list[str] = Field(
        default_factory=list,
        description="URL list to filter out. Will be used to apply to the retrieved URLs",
    )
    # private
    url_database: list[str] = Field(default_factory=list, description="List of processed URLs")
    use_embeddings: bool = Field(default=True, description="Whether to use embeddings")

    total_tokens: int = 0

    @model_validator(mode="after")
    def init(self) -> Self:
        if self.query_diversifier is None:
            self.query_diversifier = RunnablePassthrough()

        if self.search_chain is None:
            self.search_chain = SearchAPIRetrieverAdapter(num_results=self.num_search_results)

        if self.web_page_doc_pipeline is None:
            self.web_page_doc_pipeline = DocumentCompressorPipeline(
                transformers=[
                    CustomBeautifulSoupTransformer(),
                    TextCleaner(),
                    RecursiveCharacterTextSplitter(chunk_size=1500, chunk_overlap=50),
                    DocumentChunkTagger(tags_map={"link": "source"}, created_at="current"),
                ]
            )

        if self.vectorstore is None:
            self.vectorstore = Chroma(
                collection_name=str(uuid.uuid4()),
                embedding_function=init_embedding_model(),
                client_settings=Settings(anonymized_telemetry=False),
            )

        if self.get_web_loader is None:
            self.get_web_loader = WebSearchFlexibleRetriever.get_default_web_loader
        return self

    def _get_relevant_documents(
        self,
        query: str,
        *,
        run_manager: CallbackManagerForRetrieverRun,
    ) -> list[Document]:
        run_manager_async = AsyncCallbackManagerForRetrieverRun(
            run_id=run_manager.run_id,
            handlers=run_manager.handlers,
            inheritable_handlers=run_manager.inheritable_handlers,
            parent_run_id=run_manager.parent_run_id,
            tags=run_manager.tags,
            inheritable_tags=run_manager.inheritable_tags,
            metadata=run_manager.metadata,
            inheritable_metadata=run_manager.inheritable_metadata,
        )
        loop = asyncio.new_event_loop()
        try:
            # Use the created event loop
            asyncio.set_event_loop(loop)
            results = loop.run_until_complete(
                self._aget_relevant_documents(query=query, run_manager=run_manager_async)
            )
        finally:
            # Make sure to close the loop properly
            try:
                # Cancel all running tasks
                tasks = asyncio.all_tasks(loop)
                if tasks:
                    for task in tasks:
                        task.cancel()
                    # Allow tasks to respond to cancellation
                    loop.run_until_complete(asyncio.gather(*tasks, return_exceptions=True))
            finally:
                # Close the loop
                loop.close()
        return results

    async def _aget_relevant_documents(
        self,
        query: str,
        *,
        run_manager: AsyncCallbackManagerForRetrieverRun,
    ) -> list[Document]:
        query = [query]
        # Get search questions
        logger.info("Generating questions for Web Search ...")
        new_queries = await self.query_diversifier.ainvoke(
            query, config={"callbacks": run_manager.get_child() if run_manager else None}
        )

        logger.info(f"Queries for Web Search: {new_queries}")

        # Get urls
        logger.info("Searching for relevant urls...")
        batch_search: Runnable[list[str], list[Document]] = self.search_chain.map() | RunnableLambda(
            lambda x: sum(x, [])
        ).with_config(
            run_name="QueryBatchSearch",
        )

        search_results = await batch_search.ainvoke(
            new_queries, config={"callbacks": run_manager.get_child() if run_manager else None}
        )
        logger.info(f"Search results: {[s.metadata.get('link') for s in search_results]}")

        if not self.use_embeddings:
            return search_results[: self.num_chunks]

        urls_to_look: list[str] = []
        for res in search_results:
            if res.metadata.get("link", None):
                urls_to_look.append(res.metadata.get("link", ""))

        # Relevant urls
        urls = set(urls_to_look)

        # Check for any new urls that we have not processed
        new_urls = list(urls.difference(self.url_database))

        # Filter out urls
        nurls_before = len(new_urls)
        new_urls = [url for url in new_urls if not any(filter_url in url for filter_url in self.url_filter)]
        logger.info(f"Post-filtered {nurls_before - len(new_urls)} URLs")

        # Hotfix: drop pdfs!, saves download time , TODO: check content mimetype before downloading
        new_urls = [
            url
            for url in new_urls
            if not any(url.endswith(ext) for ext in [".pdf", ".xls", ".xlsx", ".doc", ".docx"])
        ]
        new_urls = [url for url in new_urls if "/pdf/" not in url]

        logger.info(f"New URLs to load: {new_urls}")
        # Load, split, and add new urls to vectorstore
        if new_urls:
            loader = self.get_web_loader(new_urls)
            logger.info("Indexing new urls...")
            try:
                page_docs = loader.load()
            except Exception as e:
                logger.warning(e)
                page_docs = []
            page_docs = [
                doc
                for doc in page_docs
                if len(doc.page_content) > self.MINIMAL_ACCEPTABLE_PAGE_LENGTH
                and len(doc.page_content) < self.MAXMIUM_ACCEPTABLE_PAGE_LENGTH
            ]
            # process loaded web page documents: filter, split and tag documents.
            # we use compress instead of acompress here because of async incompatibility in the
            # sync context
            compressed_docs = self.web_page_doc_pipeline.compress_documents(page_docs, query="")
            processed_docs = self._fit_in_tokens_limits(new_queries, compressed_docs)

            if len(processed_docs) > 0:
                await self.vectorstore.aadd_documents(processed_docs)
                await asyncio.sleep(settings.WEBSEARCH_EMBEDDING_REQUEST_INTERVAL)
            # most loaders add the url to `source` field of metadata, not the `link` field.
            # here we use `source` field despite the `link` field is also populated by default
            # web_page_doc_pipeline
            actual_new_urls = {
                str(doc.metadata.get("source"))
                for doc in processed_docs
                if doc.metadata.get("source") is not None
            }
            self.url_database.extend(actual_new_urls)

        # Search for relevant splits
        logger.info("Grabbing most relevant splits from urls...")
        relevant_chunks: list[Document] = []
        if not self.use_mmr:
            for query in new_queries:
                relevant_chunks.extend(await self.vectorstore.asimilarity_search(query, k=self.num_chunks))
        else:
            for query in new_queries:
                relevant_chunks.extend(
                    await self.vectorstore.amax_marginal_relevance_search(
                        query, k=self.num_chunks, fetch_k=self.num_chunks_fetch
                    )
                )

        return relevant_chunks

    def _fit_in_tokens_limits(self, queries: List[str], docs: Sequence[Document]) -> List[Document]:
        total_tokens = 0
        processed_docs = []
        token_counter = TokenCounter(settings.EMBEDDING_OPENAI_API_CONFIGS[0].get("model"))

        for query in queries:
            query_tokens = token_counter.count_tokens(query)
            if total_tokens + query_tokens < self.MAX_EMBEDDING_TOKENS:
                total_tokens += query_tokens
            else:
                break

        for doc in docs:
            doc_tokens = token_counter.count_tokens(doc.page_content)
            if total_tokens + doc_tokens < self.MAX_EMBEDDING_TOKENS:
                total_tokens += doc_tokens
                processed_docs.append(doc)
            else:
                break

        self.total_tokens = total_tokens
        logger.info(f"{len(processed_docs)} of {len(docs)} docs selected with {total_tokens} tokens")
        return processed_docs

    @staticmethod
    def get_default_web_loader(urls: list[str]) -> BaseLoader:
        loader = AsyncHtmlLoader(urls, ignore_load_errors=True)
        return loader
