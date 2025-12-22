from app.notifications import NotificationStatus, get_notification_payload, send_ws_notification
from documents.models import Document


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
