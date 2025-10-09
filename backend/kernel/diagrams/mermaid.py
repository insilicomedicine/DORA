import logging
from functools import lru_cache
from typing import Callable, Tuple

from langchain.schema import HumanMessage, SystemMessage

from general.defs import ConfigKeyType
from general.models import Config
from kernel.chat_models.utils import init_llm
from kernel.diagrams.utils import MermaidGenerationNotSuccessfulError, convert_mermaid_graph_to_svg
from users.defs import TokenUsage

logger = logging.getLogger(__name__)


@lru_cache
def summarize_text(
    text: str,
    prompt: str,
    token_record_callback: Callable,
    temperature: float = 0.8,
) -> str:
    llm = init_llm(temperature=temperature)
    msg = [SystemMessage(content=prompt), HumanMessage(content=text)]
    res = llm.invoke(msg)
    token_usage = TokenUsage.from_dict(res.response_metadata["token_usage"])
    token_record_callback(token_usage=token_usage)
    return res.content


def extract_mermaid_code(raw_content: str) -> str:
    stripped_content = raw_content.strip("```").strip().split("\n")  # noqa

    if stripped_content and stripped_content[0].startswith("mermaid"):
        stripped_content = stripped_content[1:]

    return "\n".join(stripped_content).strip()


@lru_cache
def get_mermaid_data(
    text: str,
    prompt: str,
    token_record_callback: Callable,
    temperature: float = 0.2,
    n_retries: int = 3,
) -> Tuple[str, str]:
    llm = init_llm(temperature=temperature)

    for attempt in range(n_retries):
        messages = [SystemMessage(content=prompt), HumanMessage(content=text)]
        response = llm.invoke(messages)
        token_usage = TokenUsage.from_dict(response.response_metadata["token_usage"])
        token_record_callback(token_usage=token_usage)

        mermaid_code = extract_mermaid_code(response.content)
        diagram_as_svg, error_message = convert_mermaid_graph_to_svg(mermaid_code)
        if diagram_as_svg:
            return diagram_as_svg, mermaid_code
        else:
            if attempt == n_retries - 1:
                raise MermaidGenerationNotSuccessfulError(
                    f"Failed to generate valid Mermaid code after {n_retries} attempts."
                    f" Mermaid syntax error: {error_message}"
                )


def get_prompts(diagram_type: str) -> Tuple[str, str]:
    type_to_prompt_map = {
        "FLOWCHART": "system_prompt_for_mermaid_flowchart",
        "STATE": "system_prompt_for_mermaid_state_diagram",
        "TIMELINE": "system_prompt_for_mermaid_timeline_diagram",
        "SEQUENCE": "system_prompt_for_mermaid_sequence_diagram",
    }
    prompt_key = type_to_prompt_map[diagram_type]
    llm_prompts = Config.get(ConfigKeyType.MERMAID_DIAGRAM_PROMPTS)
    return llm_prompts["summary_prompt"], llm_prompts[prompt_key]


def generate_mermaid_diagrams(
    text: str,
    diagram_type: str,
    token_record_callback: Callable,
) -> Tuple[str, str]:
    summary_prompt, mermaid_prompt = get_prompts(diagram_type)
    summarized_text = summarize_text(
        text=text,
        prompt=summary_prompt,
        token_record_callback=token_record_callback,
    )
    diagram_as_svg, mermaid_code = get_mermaid_data(
        text=summarized_text,
        prompt=mermaid_prompt,
        token_record_callback=token_record_callback,
    )
    return diagram_as_svg, mermaid_code
