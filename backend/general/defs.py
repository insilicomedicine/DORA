from enum import Enum
from typing import List


class ConfigKeyType:
    PUBLICATION_CHUNK_MERGE_RULES = "publication_chunk_merge_rules"
    STATISTICS_REPORT_RECIPIENTS = "statistics_report_recipients"
    AI_ACTIONS_PROMPTS = "ai_actions_prompts"
    WORD_FILTERING_FEATURE = "word_filtering_feature"
    POLISH_PROMPTS = "polish_prompts"
    OUTPUT_FORMATS = "output_formats"
    TOOL_PROMPTS = "tool_prompts"
    MERMAID_DIAGRAM_PROMPTS = "mermaid_diagram_prompts"
    AI_REVIEW_PROMPTS = "ai_review_prompts"
    POLISH_DOCUMENT_PROMPTS = "polish_document_prompts"
    DYNAMIC_SECTION_PROMPTS = "dynamic_section_prompts"
    PUB_CHUNKS_ABSTRACT_SEARCH = "pub_chunks_abstract_search"
    PUB_CHUNKS_FULLTEXT_SEARCH = "pub_chunks_fulltext_search"
    MCP_TOOL_RESULT_BIBLIOGRAPHY_TYPES = "mcp_tool_result_bibliography_types"
    DEEP_RESEARCH_PROMPTS = "deep_research_prompts"


class PublicationChunksEnum(str, Enum):
    CUSTOM_BIBLIOGRAPHY_CHUNKS = "custom_bibliography_chunks"
    FULLTEXT_CHUNKS = "fulltext_chunks"
    ABSTRACT_CHUNKS = "abstract_chunks"

    @classmethod
    def get_valid_chunks(cls) -> List[str]:
        return [chunk.value for chunk in cls]


class ShuffleStrategyEnum(str, Enum):
    RANDOM = "random"
    ROUND_ROBIN = "round_robin"

    @classmethod
    def get_valid_strategies(cls) -> List[str]:
        return [strategy.value for strategy in cls]


class ToolSourceEnum(str, Enum):
    MCP = "mcp"
    PANDOMICS = "pandaomics"
    LOCAL = "local"

    @classmethod
    def get_valid_choices(cls) -> tuple:
        sources = [source.value for source in cls]
        return tuple(zip(sources, sources))


DEFAULT_PUBLICATION_CHUNK_MERGE_RULES = {
    "max_total_chunks": 50,
    "chunk_limits": {
        PublicationChunksEnum.CUSTOM_BIBLIOGRAPHY_CHUNKS: 30,
        PublicationChunksEnum.FULLTEXT_CHUNKS: 20,
        PublicationChunksEnum.ABSTRACT_CHUNKS: 20,
    },
    "order": [
        PublicationChunksEnum.CUSTOM_BIBLIOGRAPHY_CHUNKS,
        PublicationChunksEnum.FULLTEXT_CHUNKS,
        PublicationChunksEnum.ABSTRACT_CHUNKS,
    ],
    "shuffle_strategy": None,
}


class PublicationChunksFeature(str, Enum):
    ADD_CITATIONS = "add_citations"
    FIND_REFERENCES = "find_references"
    PUBMED_ABSTRACT_SIMILARITY_SEARCH = "pubmed_abstract_similarity_search"
