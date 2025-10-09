import json
from typing import Any, Dict, List

from kernel.services.token_counter import TokenCounter


def fit_in_tokens_limits(docs_list: str, tokens_for_answer: int, model_name: str, max_tokens: int) -> str:
    token_counter = TokenCounter(model_name)
    tokens_number = token_counter.count_tokens(docs_list)
    available_tokens = max_tokens - tokens_for_answer
    while tokens_number > available_tokens:
        data = json.loads(docs_list)
        data.popitem()
        docs_list = json.dumps(data)
        tokens_number = token_counter.count_tokens(docs_list)
    return docs_list


def format_docs(docs: List[Dict[str, Any]], tokens_for_answer: int, model_name: str, max_tokens: int) -> str:
    dict_docs = {
        index: {
            "BIB_ID": str(item.get("bib_id") or item.get("temp_bib_id")),
            "CHUNK_ID": str(item.get("chunk_id")),
            "TEXT": " ".join(item.get("chunk", "").split("\n\n")),
        }
        for index, item in enumerate(docs)
    }
    dict_docs_str = json.dumps(dict_docs)
    docs_list = fit_in_tokens_limits(dict_docs_str, tokens_for_answer, model_name, max_tokens)
    return docs_list
