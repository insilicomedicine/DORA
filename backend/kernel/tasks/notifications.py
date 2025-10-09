from django.conf import settings

from app.notifications import NotificationStatus, get_notification_payload, send_ws_notification
from documents.models import Document
from users.utils import generate_and_send_email


def send_ws_notification_message(document: Document, type: str, instance: str, tokens_used: int = 0) -> None:
    notification_data = {"id": str(document.id), "type": type}
    if tokens_used:
        notification_data.update(
            {
                "tokens_used": tokens_used,
                "total_tokens_used": 0,
            }
        )
    ws_notification_args = get_notification_payload(
        user_id=document.created_by.id,
        data=notification_data,
        status=NotificationStatus.SUCCESS,
        message=f"Your {instance} has been successfully generated",
    )
    send_ws_notification(**ws_notification_args)


def send_document_generated_email(document: Document) -> None:
    if not settings.AWS_SES_REGION_NAME or not settings.AWS_SES_REGION_ENDPOINT:
        return

    link = f"{settings.DORA_PUBLIC_URL}/documents/{document.id}"
    generate_and_send_email(
        user=document.created_by,
        subject="Document generated successfully",
        template_name="document_generated_email.html",
        context={"static_url": settings.DORA_STATIC_URL, "link": link, "document_title": document.title},
    )
