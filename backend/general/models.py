import logging
from datetime import timedelta
from typing import Any

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from base.models import BaseModel
from general.defs import ConfigKeyType, PublicationChunksEnum, ShuffleStrategyEnum
from general.parsers import RequestParser

logger = logging.getLogger(__name__)


class Config(BaseModel):
    key = models.CharField(max_length=255, unique=True)
    value = models.JSONField()

    def clean(self):
        validation_handlers = {
            ConfigKeyType.PUBLICATION_CHUNK_MERGE_RULES: self._validate_chunk_merge_rules,
            ConfigKeyType.DEEP_RESEARCH_PROMPTS: self._validate_deep_research_prompts,
        }

        if handler := validation_handlers.get(self.key):
            handler()

        return super().clean()

    def _validate_chunk_merge_rules(self):
        chunk_merge_rules = self.value
        expected_keys = {
            "max_total_chunks": int,
            "chunk_limits": dict,
            "order": list,
            "shuffle_strategy": (type(None), str),
        }

        for rule_key, expected_type in expected_keys.items():
            if rule_key not in chunk_merge_rules or not isinstance(
                chunk_merge_rules[rule_key], expected_type
            ):
                raise ValidationError(f"Invalid or missing key '{rule_key}' in publication_chunk_merge_rules")

        for chunk_type in PublicationChunksEnum.get_valid_chunks():
            if chunk_type not in chunk_merge_rules["chunk_limits"] or not isinstance(
                chunk_merge_rules["chunk_limits"][chunk_type], int
            ):
                raise ValidationError(
                    f"Invalid or missing chunk type '{chunk_type}' "
                    f"in `chunk_limits` of publication_chunk_merge_rules"
                )
            if chunk_type not in chunk_merge_rules["order"]:
                raise ValidationError(
                    f"Missing chunk type '{chunk_type}' in `order` of publication_chunk_merge_rules"
                )

        if chunk_merge_rules["shuffle_strategy"] not in ShuffleStrategyEnum.get_valid_strategies():
            raise ValidationError(
                f"Invalid `shuffle_strategy` in publication_chunk_merge_rules. "
                f"Expected one of {ShuffleStrategyEnum.get_valid_strategies()} or null"
            )

    def _validate_deep_research_prompts(self):
        deep_research_prompts = self.value
        expected_keys = {
            "collection_system_message": str,
            "research_system_message": str,
            "research_user_message": str,
        }

        for key, expected_type in expected_keys.items():
            if key not in deep_research_prompts or not isinstance(deep_research_prompts[key], expected_type):
                raise ValidationError(f"Invalid or missing key '{key}' in deep_research_prompts")

            if not deep_research_prompts[key]:
                raise ValidationError(f"Empty prompt for key '{key}' in deep_research_prompts")

    def __str__(self):
        return f"Config: {self.key}"

    @classmethod
    def get(cls, key: str, default: Any = None) -> Any:
        try:
            return cls.objects.get(key=key).value
        except cls.DoesNotExist:
            return default


class BlacklistedIP(BaseModel):
    ip_address = models.GenericIPAddressField("IP Address")
    blacklist_starts_at = models.DateTimeField()
    blacklist_ends_at = models.DateTimeField()

    class Meta:
        indexes = [
            models.Index(fields=["ip_address"]),
            models.Index(fields=["ip_address", "blacklist_ends_at"]),
        ]
        ordering = ["-blacklist_ends_at"]

    def __str__(self):
        return self.ip_address

    @property
    def expired(self):
        return timezone.now() > self.blacklist_ends_at

    def extend_blacklisted_duration(self):
        self.blacklist_ends_at = self.blacklist_ends_at + timedelta(minutes=5)
        self.save()


class LogRecord(BaseModel):
    value = models.JSONField()
    user = models.ForeignKey(
        User,
        related_name="log_records",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )

    def value_message(self):
        return self.value.get("message", None)

    def formated_value(self):
        if "request" in self.value:
            return RequestParser.display(self.value)

    @classmethod
    def log(cls, request, message, user=None, **kwargs):
        try:
            value = {
                "request": RequestParser(request, message).parse(),
                "message": message,
                "other": kwargs,
            }
            _user = user or (request.user if not request.user.is_anonymous else None)
            inst = cls(value=value, user=_user)
            inst.save()
        except Exception as exc:
            logger.error(f"Unable to log user activity: {str(exc)}")
