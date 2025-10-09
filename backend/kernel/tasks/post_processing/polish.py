import json
import logging
from typing import Any, Dict, List

from django.db.models import QuerySet
from langchain.prompts import PromptTemplate
from langchain_community.callbacks.manager import get_openai_callback
from langchain_core.output_parsers import JsonOutputParser

from documents.models import Document, Section
from general.defs import ConfigKeyType
from general.models import Config
from kernel.chat_models.utils import init_llm_mini
from kernel.tasks.post_processing.models import Paper
from users.defs import TokenUsage
from users.models import AITokenUsageType
from users.record_token_usage import record_token_usage

logger = logging.getLogger(__name__)


def prepare_json_from_sections(
    sections: QuerySet[Section], current_id_counter: List[int], section_id_map: Dict[int, str]
) -> Dict[str, Any]:
    data = {}

    for section in sections:
        current_id_counter[0] += 1
        current_id = current_id_counter[0]
        section_id_map[current_id] = str(section.id)
        section_data = {
            "title": section.title,
            "results": section.result.get("data", "") if isinstance(section.result, dict) else "",
            "sub_sections": prepare_json_from_sections(
                section.sub_sections.all(), current_id_counter, section_id_map
            ),
        }
        data[current_id] = section_data

    return data


def prepare_json_from_document(document: Document) -> Dict[str, Any]:
    sections = (
        document.sections.filter(parent__isnull=True).exclude(is_title=True).prefetch_related("sub_sections")
    )

    section_id_map = {}
    current_id_counter = [0]
    sections = prepare_json_from_sections(sections, current_id_counter, section_id_map)
    document_json = {"sections": sections}
    return document_json, section_id_map


def polish_document_content(document: Document) -> bool:
    logger.info(f"Polishing document {document.id}")

    polish_prompts = Config.get(ConfigKeyType.POLISH_DOCUMENT_PROMPTS, {})
    user_message_template = polish_prompts.get("user_message", "")
    if not user_message_template:
        logger.error("User message template not found in polish document prompts")
        return False

    document_json, section_id_map = prepare_json_from_document(document)

    parser = JsonOutputParser(pydantic_object=Paper)
    user_message = PromptTemplate(
        template=user_message_template,
        input_variables=["context"],
        partial_variables={"expected_output_instructions": parser.get_format_instructions()},
    )
    context = json.dumps(document_json)

    logger.info(f"Polishing document {document.id} with context: {context}")

    llm = init_llm_mini()

    chain = user_message | llm | parser

    try:
        with get_openai_callback() as cb:
            response = chain.invoke({"context": context})
            token_usage = TokenUsage(
                completion_tokens=cb.completion_tokens,
                prompt_tokens=cb.prompt_tokens,
                total_tokens=cb.total_tokens,
            )
    except Exception as e:
        logger.error(f"Error invoking LLM for polish document {document.id}: {e}")
        return False

    logger.info(f"Polish document {document.id} response: {response}")

    record_token_usage(
        user=document.created_by,
        model_instance=document,
        token_usage=token_usage,
        usage_type=AITokenUsageType.POLISH_DOCUMENT,
        ai_model=llm.model_name,
    )

    try:
        polished_sections = response["sections"]
        for pseudo_id, section_data in polished_sections.items():
            section_id = section_id_map[int(pseudo_id)]
            section: Section = document.sections.get(id=section_id)
            section.result = {"data": section_data["results"]}
            section.save()

            for sub_pseudo_id, sub_section_data in section_data.get("sub_sections", {}).items():
                sub_section_id = section_id_map[int(sub_pseudo_id)]
                sub_section: Section = section.sub_sections.get(id=sub_section_id)
                sub_section.result = {"data": sub_section_data["results"]}
                sub_section.save()
    except Exception as exc:
        logger.error(f"Error updating polished sections for document {document.id}: {exc}")
        return False

    logger.info(f"Document {document.id} polished successfully")
    return True
