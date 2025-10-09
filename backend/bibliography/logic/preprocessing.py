import logging

import sentry_sdk
from django.conf import settings

from app.celery import app
from app.notifications import (
    NotificationStatus,
    NotificationType,
    get_notification_payload,
    send_ws_notification,
)
from bibliography.defs import CustomBibliographyFileFormat, CustomBibliographyFileStatus
from bibliography.logic.chunks import calculate_embeddings, get_chunks_from_text
from bibliography.logic.pdf_parsing import get_file_content
from bibliography.models import CustomBibliographyChunkEmbeddings, CustomBibliographyFile
from users.defs import TokenUsage
from users.models import AITokenUsageType
from users.record_token_usage import record_token_usage

logger = logging.getLogger(__name__)


def file_format_is_correct(file_name: str) -> bool:
    if "." not in file_name:
        return False

    file_format = file_name.split(".")[-1]

    return file_format == CustomBibliographyFileFormat.PDF


def get_custom_bibliography_file_data(bibliography_file: CustomBibliographyFile) -> dict:
    from bibliography.serializers import CustomBibliographyFileDetailSerializer

    custom_bibliography_file_data = CustomBibliographyFileDetailSerializer(bibliography_file).data
    return custom_bibliography_file_data


def catch_failed_preprocess_file(bibliography_file: CustomBibliographyFile, error_message: str) -> None:
    logger.info(error_message)
    bibliography_file.status = CustomBibliographyFileStatus.FAILED
    bibliography_file.save(update_fields=["status"])

    ws_notification_args = get_notification_payload(
        user_id=bibliography_file.user_id,
        data={
            "type": NotificationType.BIBLIOGRAPHY_FILE_PROCESSING,
            "file_data": get_custom_bibliography_file_data(bibliography_file),
        },
        status=NotificationStatus.ERROR,
        message=error_message,
    )
    send_ws_notification(**ws_notification_args)


@app.task(name="preprocess_file")
def preprocess_file(custom_bibliography_file_pk: str) -> None:
    try:
        bibliography_file = CustomBibliographyFile.objects.get(pk=custom_bibliography_file_pk)
    except CustomBibliographyFile.DoesNotExist:
        raise ValueError(f"file with pk {custom_bibliography_file_pk} doesn't exist")

    if not file_format_is_correct(bibliography_file.name):
        bibliography_file.format = CustomBibliographyFileFormat.UNSUPPORTED
        bibliography_file.save(update_fields=["format"])
        error_message = f"{bibliography_file.name=}: file format unsupported"
        catch_failed_preprocess_file(bibliography_file, error_message)
        return None

    try:
        metadata, cleaned_text = get_file_content(bibliography_file.pk, bibliography_file.name)
    except Exception as exc:
        error_message = f"{bibliography_file.name=}: error getting file contents: {exc}"
        catch_failed_preprocess_file(bibliography_file, error_message)
        return None

    if not cleaned_text:
        error_message = f"No available text found in file '{bibliography_file.name}'"
        catch_failed_preprocess_file(bibliography_file, error_message)
        return None

    bibliography_file.metadata = metadata
    bibliography_file.cleaned_text = cleaned_text

    try:
        chunks = get_chunks_from_text(cleaned_text)
    except Exception as exc:
        error_message = f"Error chunks calculating '{bibliography_file.name}': {exc}"
        catch_failed_preprocess_file(bibliography_file, error_message)
        return None

    try:
        embeddings, total_tokens = calculate_embeddings(chunks)
    except Exception as exc:
        sentry_sdk.capture_exception(exc)
        error_message = f"Error embeddings calculating '{bibliography_file.name}': {exc}"
        catch_failed_preprocess_file(bibliography_file, error_message)
        return None

    record_token_usage(
        user=bibliography_file.user,
        model_instance=bibliography_file,
        token_usage=TokenUsage(completion_tokens=0, prompt_tokens=total_tokens, total_tokens=total_tokens),
        usage_type=AITokenUsageType.CUSTOM_BIB_EMBEDDING,
        ai_model=settings.EMBEDDING_OPENAI_API_CONFIGS[0].get("model"),
    )

    user_bibliography_chunk_embeddings_records = []
    for chunk, embedding in zip(chunks, embeddings):
        user_bibliography_chunk_embeddings_records.append(
            CustomBibliographyChunkEmbeddings(
                custom_bibliography_file_id=bibliography_file.pk,
                chunk_text=chunk,
                embeddings=embedding,
            )
        )
    CustomBibliographyChunkEmbeddings.objects.bulk_create(user_bibliography_chunk_embeddings_records)

    bibliography_file.status = CustomBibliographyFileStatus.PROCESSED
    bibliography_file.save(update_fields=["status", "metadata", "cleaned_text"])

    ws_notification_args = get_notification_payload(
        user_id=bibliography_file.user_id,
        data={
            "type": NotificationType.BIBLIOGRAPHY_FILE_PROCESSING,
            "file_data": get_custom_bibliography_file_data(bibliography_file),
        },
        status=NotificationStatus.SUCCESS,
        message=f"File '{bibliography_file.name}' processed successfully",
    )
    send_ws_notification(**ws_notification_args)
