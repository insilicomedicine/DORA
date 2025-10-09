import logging

from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)


@shared_task(queue="email")
def send_html_email(subject: str, to_email: str, template_name: str, plain_message: str, html_message: str):
    if not settings.FROM_EMAIL:
        logger.warning("FROM_EMAIL is not set in settings.")
        return
    logger.info(f"Sending email to: {to_email} with {template_name}...")

    try:
        send_mail(subject, plain_message, settings.FROM_EMAIL, [to_email], html_message=html_message)
    except Exception as e:
        logger.error(f"Error sending email: {e}")

    logger.info(f"Sent email to: {to_email} with {template_name}.")
