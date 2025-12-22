from datetime import datetime, timedelta
from typing import Callable, Dict, Optional, Tuple
from urllib.parse import quote

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import CommonPasswordValidator
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.html import strip_tags
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from documents.models import Document, DocumentStatus
from users.subscription.utils import subscription_provider
from users.tasks import send_html_email
from users.tokens import TokenType, token_generator

is_internal_user: Callable = subscription_provider.is_internal_user
get_user_plan: Callable = subscription_provider.get_user_plan
can_edit: Callable = subscription_provider.can_edit


def is_not_common_password(password: str) -> bool:
    validator = CommonPasswordValidator()
    try:
        validator.validate(password)
        return True
    except ValidationError:
        return False


def get_user_by_uid(uidb64: str) -> Optional[User]:
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(username=uid)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        user = None
    return user


def generate_token(user: User) -> Tuple[str, str]:
    user.profile.update_fields(
        {"password_reset_requested_at": timezone.now()}
    )  # token generated based on this field
    user.refresh_from_db()
    token = token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.username))
    return token, uid


def check_token(uidb64: str, token: str) -> None:
    user = get_user_by_uid(uidb64)
    token_type = TokenType.PASSWORD_RESET if user.is_active else TokenType.ACTIVATION
    token_generator.check_token(user, token, token_type)


def generate_and_send_email(user: User, subject: str, template_name: str, context: Dict[str, str]) -> None:
    html_message = render_to_string(template_name, context)
    plain_message = strip_tags(html_message)

    send_html_email.delay(subject, user.username, template_name, plain_message, html_message)


def send_activation_email(user: User) -> None:
    token, uid = generate_token(user)
    encoded_email = quote(user.email)
    link = f"{settings.DORA_PUBLIC_URL}/accounts/register/activate/{uid}/{token}?email={encoded_email}"
    generate_and_send_email(
        user=user,
        subject="Please verify your email address",
        template_name="activation_email.html",
        context={
            "static_url": settings.DORA_STATIC_URL,
            "link": link,
        },
    )


def send_activated_email(user: User) -> None:
    link = f"{settings.DORA_PUBLIC_URL}/login"
    generate_and_send_email(
        user=user,
        subject="Account confirmation",
        template_name="account_activated_email.html",
        context={
            "static_url": settings.DORA_STATIC_URL,
            "link": link,
        },
    )


def send_invitation_email_login_via_google(user: User) -> None:
    generate_and_send_email(
        user=user,
        subject="Welcome to Science42: DORA – Your AI Research Assistant!",
        template_name="invitation_email_login_via_google.html",
        context={"link": settings.DORA_PUBLIC_URL},
    )


def send_reset_password_email(user: User) -> None:
    token, uid = generate_token(user)
    link = f"{settings.DORA_PUBLIC_URL}/password-recovery/{uid}/{token}"
    generate_and_send_email(
        user=user,
        subject="Password Recovery",
        template_name="reset_password_email.html",
        context={
            "static_url": settings.DORA_STATIC_URL,
            "link": link,
        },
    )


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


def get_free_trial_end_date(user: User) -> datetime:
    if user.profile.activated_at and user.profile.free_trial_ends_at:
        return user.profile.free_trial_ends_at
    elif user.profile.activated_at:
        return user.profile.activated_at + timedelta(days=settings.FREE_TRIAL_DAYS)
    return timezone.now()


def get_user_documents_count(user: User, status: Optional[DocumentStatus] = None) -> int:
    queryset = Document.objects.filter(created_by=user)
    if status is not None:
        queryset = queryset.filter(status=status)
    return queryset.count()


def set_important_dates(user: User) -> None:
    activated_at = timezone.now()
    user.profile.update_fields(
        {
            "activated_at": activated_at,
            "free_trial_ends_at": activated_at + timedelta(days=settings.FREE_TRIAL_DAYS),
        }
    )


def find_user_email(user: User) -> str | None:
    for field in [user.email, user.username]:
        try:
            validate_email(field)
            return field
        except ValidationError:
            pass

    return None
