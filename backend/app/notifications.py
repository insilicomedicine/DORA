from typing import Any, Dict, TypedDict

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


class NotificationStatus:
    ERROR = "error"
    SUCCESS = "success"


class NotificationType:
    SECTION_STATUS_UPDATED = "section_status_updated"
    DOCUMENT_STATUS_UPDATED = "document_status_updated"
    DOCUMENT_PLAN_UPDATED = "document_plan_updated"
    DOCUMENT_POLISH_UPDATED = "document_polish_updated"
    BIBLIOGRAPHY_FILE_PROCESSING = "bibliography_file_processing"
    DOCUMENT_AI_REVIEW_GENERATED = "document_ai_review_generated"
    GENERATION_LOG_UPDATED = "generation_log_updated"


class WsNotificationFormat(TypedDict):
    user_id: str
    status: str
    message: str
    data: dict


def get_notification_payload(
    user_id,
    data: Dict[str, Any],
    status: str,
    message: str,
) -> WsNotificationFormat:
    return WsNotificationFormat(
        user_id=user_id,
        status=status,
        message=message,
        data=data,
    )


def send_ws_notification(
    user_id: str,
    status: str,
    message: str,
    data: Dict[str, Any],
) -> None:
    channel_layer = get_channel_layer()
    data = {"type": "notification", "status": status, "message": message, "data": data}
    async_to_sync(channel_layer.group_send)(f"user-{user_id}", data)
