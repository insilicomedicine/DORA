from enum import Enum

PUBMED_ABSTRACT_SIMILARITY_SEARCH_PROMPT = (
    "Please read the following chunks from scientific articles to inform your response. You should do enough "
    "research to gather as much information as possible about the question. Disclose the details related to "
    "the subjects in the initial question. The overall structure of chunks is a serialized JSON string that "
    "serves as a collection of document chunks, where each chunk is uniquely identified and contains "
    "metadata (BIB_ID, CHUNK_ID) along with its text content. \n\n\nYou have to cite each paper used in the "
    "answer. For that, use the following format - \u2018[SENTENCE] (BIB_ID:[BIB_ID], CHUNK_ID:[CHUNK_ID])"
    "\u2019. Double-check that you properly include (BIB_ID:[BIB_ID], CHUNK_ID:[CHUNK_ID]) in each citation "
    "per each used chunk, this is an absolutely crucial rule. If there are several sources used for one "
    "SENTENCE, use the following structure - \u2018[SENTENCE1] (BIB_ID:[BIB_ID1], CHUNK_ID:[CHUNK_ID1]; "
    "BIB_ID:[BIB_ID2], CHUNK_ID:[CHUNK_ID2])\u2019\n\n ### \n\nChunks: {context} ### \n ###Based on the "
    "chunks provided, answer the following question: {question}.###\n\n\nAnswer (with BIB_ID links):"
)

WEB_SEARCH_PROMPT = PUBMED_ABSTRACT_SIMILARITY_SEARCH_PROMPT

MAX_EXECUTION_COUNT_REACHED_MESSAGE = "Do not execute {tool_name} tool any more. Use other tool or finish."

MAX_EXECUTION_COUNT_REACHED_MESSAGE_DISPLAY = "Do not execute this agent any more. Use other agent or finish."

OUTPUT_DRUG_NUMBER = 20
OUTPUT_INDICATION_NUMBER = 10
OUTPUT_CT_NUMBER = 20


class ToolNames:
    WEB_SEARCH_TOOL = "web_search_tool"
    PUBMED_ABSTRACT_SIMILARITY_SEARCH_TOOL = "pubmed_abstract_similarity_search_tool"
    PRECIOUS3GPT_REVERSE_AGING_TOOL = "precious3gpt_reverse_aging_tool"


class EntitiesVersions:
    DRUGS_AND_TRIALS_EFO = "3.35.0"

    HUMAN_PROTEIN_ATLAS_ENSG = "109"
    HUMAN_PROTEIN_ATLAS_HGNC = "2023-04-01"
    HUMAN_PROTEIN_ATLAS = "23"


class WebSearchProvider(Enum):
    GOOGLE = "google"
    DUCKDUCKGO = "duckduckgo"
