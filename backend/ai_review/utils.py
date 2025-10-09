import functools
import json
import logging
from contextlib import contextmanager
from typing import TYPE_CHECKING, Any, Callable, Dict, Optional, Union

import openai
from django.conf import settings
from django.core.cache import cache
from langchain_core.messages import HumanMessage, SystemMessage

from ai_review.defs import AiReviewCalculationStatus
from app.notifications import NotificationStatus, get_notification_payload, send_ws_notification
from documents.document_export.docx_generator import DocxGenerator
from documents.utils import replace_multiple_values
from general.defs import ConfigKeyType
from general.models import Config
from kernel.chat_models.utils import init_llm_mini
from users.defs import TokenUsage
from users.models import AITokenUsageType
from users.record_token_usage import record_token_usage

if TYPE_CHECKING:
    from documents.models import Document

logger = logging.getLogger(__name__)


GENERAL_EVALUATION = "general_evaluation"
DETAILED_EVALUATION_METRICS = "detailed_evaluation_metrics"


def validate_metric_slug(metric_slug: str, prompt_templates: Dict[str, Any], is_overall: bool) -> None:
    main_key = GENERAL_EVALUATION if is_overall else DETAILED_EVALUATION_METRICS
    if metric_slug not in prompt_templates[main_key]:
        raise ValueError(f"Invalid metric slug: {metric_slug}")


def run_metric_evaluation(
    system_message: str,
    user_query: str,
    token_record_callback: Callable,
) -> Union[list, dict]:
    llm = init_llm_mini(temperature=0.5)
    llm = llm.bind(response_format={"type": "json_object"})

    try:
        response = llm.invoke([SystemMessage(content=system_message), HumanMessage(content=user_query)])
        token_usage = TokenUsage.from_dict(response.response_metadata["token_usage"])
        token_record_callback(token_usage=token_usage)

        cleared_response = response.content.removeprefix("```json\n").strip()
        return json.loads(cleared_response)

    except openai.RateLimitError as e:
        logger.error(f"Rate limit error: {str(e)}")
        raise
    except Exception as e:
        logger.error(f"Error in run_metric_evaluation: {str(e)}")
        raise


def get_metric_info(prompt_templates: Dict[str, Any], metric_slug: str, is_overall: bool) -> Dict[str, str]:
    try:
        main_key = GENERAL_EVALUATION if is_overall else DETAILED_EVALUATION_METRICS
        metric_info = prompt_templates[main_key][metric_slug]
        return {"name": metric_info["name"], "description": metric_info["description"]}
    except KeyError:
        logger.error(f"Metric slug {metric_slug} not in prompt templates")
        raise


def configure_metrics_prompt(metric_slug: str, prompt_templates: dict, is_overall: bool) -> dict:
    result = {}
    validate_metric_slug(metric_slug, prompt_templates, is_overall=is_overall)
    metric_info = get_metric_info(prompt_templates, metric_slug, is_overall=is_overall)

    template_key = "overall_evaluation_extended_prompt" if is_overall else "metric_evaluation_extended_prompt"
    template = prompt_templates[template_key]
    result["name"] = metric_info["name"]
    result["prompt"] = template.format(
        article_name=metric_info.get("article_name", "the article"),
        description=metric_info.get("description", "evaluate its content"),
        metric_name=metric_info.get("name", "Metric Name"),
        metric_description=metric_info.get("description", "Metric Description"),
        MIN_SCORE=prompt_templates["min_score"],
        MAX_SCORE=prompt_templates["max_score"],
    )

    return result


def build_metrics_prompts(article_name: str, description: str) -> dict[str, dict[str, str]]:
    prompt_templates = Config.get(ConfigKeyType.AI_REVIEW_PROMPTS, {})
    evaluation_metrics = {}

    for metric_slug in prompt_templates[GENERAL_EVALUATION].keys():
        evaluation_metrics[metric_slug] = configure_metrics_prompt(
            metric_slug=metric_slug,
            prompt_templates=prompt_templates,
            is_overall=True,
        )

    for metric_slug in prompt_templates[DETAILED_EVALUATION_METRICS].keys():
        evaluation_metrics[metric_slug] = configure_metrics_prompt(
            metric_slug=metric_slug,
            prompt_templates=prompt_templates,
            is_overall=False,
        )

    for _, metric_data in evaluation_metrics.items():
        metric_data["prompt"] = replace_multiple_values(
            text=metric_data["prompt"],
            values_dict={"{article_name}": article_name, "{description}": description},
        )

    return evaluation_metrics


def transform_llm_based_review(data: dict) -> dict:
    result = {
        "overall_impression": {
            "title": "Overall",
            "score": data["overall_impression"]["score"],
            "score_explanation": data["overall_impression"]["score_explanation"],
        },
        "categories": [],
    }

    for key, value in data.items():
        if key == "overall_impression" or not isinstance(value, dict):
            continue

        category = {
            "id": key,
            "title": value.get("name") or key.split("_")[0].title(),
            "score": value.get("score"),
            "score_explanation": value.get("score_explanation"),
            "strengths": value.get("strengths"),
            "code_based_metrics": value.get("code_based_metrics"),
            "suggestions": (
                [
                    {"text": suggestion["text"], "seriousness": suggestion["seriousness"]}
                    for suggestion in value.get("suggestions", {}).values()
                ]
                if "suggestions" in value
                else []
            ),
        }

        result["categories"].append(category)

    return result


def build_ai_review_answer(
    review_status: AiReviewCalculationStatus,
    llm_based_review: Optional[dict] = None,
    code_based_review: Optional[dict] = None,
) -> dict:
    answer = {"review_status": review_status, "predefined_review": None}

    if not llm_based_review:
        return answer

    for key, value in code_based_review.items():
        llm_based_review[key]["code_based_metrics"] = value

    answer["predefined_review"] = transform_llm_based_review(llm_based_review)
    return answer


def send_ws_notification_message(document: "Document", type: str, data: dict) -> None:
    notification_data = {"id": str(document.id), "type": type, "data": data}
    ws_notification_args = get_notification_payload(
        user_id=document.created_by.id,
        data=notification_data,
        status=NotificationStatus.SUCCESS,
        message="Your ai review has been successfully generated",
    )
    send_ws_notification(**ws_notification_args)


def configure_token_record_callback(document: "Document"):
    return functools.partial(
        record_token_usage,
        user=document.created_by,
        model_instance=document,
        usage_type=AITokenUsageType.GEN_DOCUMENT_REVIEW,
        ai_model=settings.MINI_OPENAI_API_MODEL,
    )


def generate_article_text(document: "Document") -> str:
    docx_generator = DocxGenerator(output_file=None, document=document)
    docx_generator.generate_docx()
    return "\n".join([paragraph.text for paragraph in docx_generator.word_doc.paragraphs])


def get_review_calculation_status(document_id: str) -> dict:
    return cache.get(f"document_review_{document_id}")


@contextmanager
def review_calculation_status(document_id: str):
    cache.set(f"document_review_{document_id}", True, timeout=10 * 60)  # ten minutes
    try:
        yield
    finally:
        cache.delete(f"document_review_{document_id}")
