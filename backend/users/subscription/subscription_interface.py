from abc import ABC, abstractmethod
from typing import Any, Dict

from django.contrib.auth.models import User
from django.db import models


class SubscriptionProvider(ABC):
    @abstractmethod
    def get_user_plan(self, user: User) -> Dict[str, Any] | None:
        pass

    @abstractmethod
    def can_edit(self, user: User) -> bool:
        pass

    @abstractmethod
    def is_internal_user(self, user: User) -> bool:
        pass

    @abstractmethod
    def get_accessible_templates(self, user: User) -> models.QuerySet:
        pass
