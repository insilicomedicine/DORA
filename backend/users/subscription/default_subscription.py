from typing import Any, Dict

from django.contrib.auth.models import User
from django.db import models
from django.db.models import Q

from kernel.models import Template
from users.subscription.subscription_interface import SubscriptionProvider


class DefaultSubscriptionProvider(SubscriptionProvider):
    def get_user_plan(self, user: User) -> Dict[str, Any] | None:
        return None

    def can_edit(self, user: User) -> bool:
        return True

    def is_internal_user(self, user: User) -> bool:
        return True

    def get_accessible_templates(self, user: User) -> models.QuerySet:
        user_groups = user.groups.values_list("pk", flat=True)
        conditions = Q(free_trial=True) | Q(allowed_users=user) | Q(allowed_groups__in=user_groups)
        return Template.objects.filter(Q(is_online=True) & conditions).distinct()
