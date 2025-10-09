import logging
from typing import Any, Dict

from celery import shared_task

from ai_review.defs import AiReviewCalculationStatus, AiReviewTypes
from ai_review.logic.calculate_additional_metrics import calculate_metrics
from ai_review.models import DocumentAIReview
from ai_review.utils import (
    build_ai_review_answer,
    build_metrics_prompts,
    configure_token_record_callback,
    generate_article_text,
    review_calculation_status,
    run_metric_evaluation,
    send_ws_notification_message,
)
from app.notifications import NotificationType
from documents.models import Document
from kernel.tasks import handle_task_timeout_and_error

logger = logging.getLogger(__name__)


def document_additional_metrics(document_id: str) -> Dict[str, Any]:
    document: Document = Document.objects.get(id=document_id)
    evaluated_metrics = calculate_metrics(document)
    DocumentAIReview.objects.update_or_create(
        document=document,
        type=AiReviewTypes.CODE_BASED,
        defaults={"ai_review": evaluated_metrics},
    )
    return evaluated_metrics


@shared_task
@handle_task_timeout_and_error
def document_main_metrics_task(document_id: str):
    with review_calculation_status(document_id):
        document: Document = Document.objects.get(id=document_id)
        token_record_callback = configure_token_record_callback(document)
        article_text = generate_article_text(document)
        evaluation_metrics = build_metrics_prompts(
            article_name=document.template_json["name"],
            description=document.template_json["description"],
        )

        evaluated_metrics = {}
        for metric_name, metric_data in evaluation_metrics.items():
            try:
                evaluated_metric = run_metric_evaluation(
                    system_message=metric_data["prompt"],
                    user_query=article_text,
                    token_record_callback=token_record_callback,
                )
                evaluated_metric["name"] = metric_data["name"]
                evaluated_metrics[metric_name] = evaluated_metric
            except Exception as e:
                logger.error(f"Error processing metric {metric_name}: {str(e)}")
                evaluated_metrics[metric_name] = None

        DocumentAIReview.objects.update_or_create(
            document=document,
            type=AiReviewTypes.LLM_BASED,
            defaults={"ai_review": evaluated_metrics},
        )
        code_based_review = document_additional_metrics(document_id)

        send_ws_notification_message(
            document=document,
            type=NotificationType.DOCUMENT_AI_REVIEW_GENERATED,
            data=build_ai_review_answer(
                review_status=AiReviewCalculationStatus.COMPLETED,
                llm_based_review=evaluated_metrics,
                code_based_review=code_based_review,
            ),
        )
