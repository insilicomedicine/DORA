from allauth.usersessions.models import UserSession as AllauthUserSession
from django.contrib.auth import user_logged_in
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver

from users.models import Profile, UserSession
from users.utils import find_user_email, set_important_dates


@receiver(user_logged_in)
def remove_other_sessions(sender, user, request, **kwargs):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0]
    else:
        ip = request.META.get("REMOTE_ADDR")
    ua = request.META.get("HTTP_USER_AGENT", "")[
        0 : AllauthUserSession._meta.get_field("user_agent").max_length
    ]

    with transaction.atomic():
        AllauthUserSession.objects.filter(user=user).delete()
        UserSession.objects.filter(user=user).delete()
        request.session.save()
        AllauthUserSession.objects.get_or_create(
            session_key=request.session.session_key,
            user=user,
            ip=ip or "0.0.0.0",  # nosec B104,
            user_agent=ua,
        )


@receiver(post_save, sender=User)
def post_user_signed_up(sender, instance, created, **kwargs):
    if not created:
        return

    with transaction.atomic():
        email = find_user_email(instance)
        instance.username = email
        instance.email = email
        instance.save()
        Profile.objects.get_or_create(user=instance)
        if instance.is_active:
            set_important_dates(instance)
