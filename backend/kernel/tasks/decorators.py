import functools
import logging

import sentry_sdk

from app.notifications import NotificationType
from documents.models import Document
from kernel.tasks.notifications import send_ws_notification_message
from kernel.tasks.processing.section import handle_section_failure

logger = logging.getLogger(__name__)


def handle_task_timeout_and_error(task_func):
    @functools.wraps(task_func)
    def wrapper(document_id):
        try:
            task_func(document_id)
        except Exception as exc:
            sentry_sdk.capture_exception(exc)
            logger.error(f"{task_func.__name__} Error during document {document_id} operation: {exc}")
            document = Document.objects.get(id=document_id)
            handle_section_failure(document)
            send_ws_notification_message(document, NotificationType.DOCUMENT_STATUS_UPDATED, "document")

    return wrapper
