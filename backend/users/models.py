from typing import Dict, List

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.contrib.sessions.models import Session
from django.db import models

from base.models import BaseModel
from base.throttling import LoginAttemptThrottle
from users.defs import PlanEnum, get_default_display_preferences, get_default_publication_settings


class Profile(BaseModel):
    user = models.OneToOneField(User, verbose_name="User", related_name="profile", on_delete=models.CASCADE)
    password_reset_requested_at = models.DateTimeField("Password Reset Requested At", null=True, blank=True)
    password_modified_at = models.DateTimeField("Password Modified At", null=True, blank=True)
    activated_at = models.DateTimeField("Activated At", null=True, blank=True)
    free_trial_ends_at = models.DateTimeField("Free Trial Ends At", null=True, blank=True)
    free_trial_quota = models.PositiveIntegerField(
        "Free Trial Quota", default=PlanEnum.FREE_TRIAL.value.quota, null=True, blank=True
    )
    user_stripe_id = models.CharField(max_length=50, unique=True, null=True, blank=True)
    terms_and_privacy_accepted_at = models.DateTimeField(
        "Terms and Privacy Accepted At", null=True, blank=True
    )
    publication_settings = models.JSONField("Publication Settings", default=get_default_publication_settings)
    display_preferences = models.JSONField("Display Preferences", default=get_default_display_preferences)

    def __str__(self):
        return f"Profile of {self.user}"

    @property
    def is_blocked(self) -> bool:
        throttle = LoginAttemptThrottle()
        return not throttle.allow(self.user.username)

    def unblock(self):
        throttle = LoginAttemptThrottle()
        throttle.unblock(self.user.username)


class UserSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="users_usersession")
    session = models.OneToOneField(Session, on_delete=models.CASCADE)

    def __str__(self):
        return f"Session of {self.user}"


class AITokenUsageType(models.TextChoices):
    GEN_PLAN = "GEN_PLAN", "Generate Plan"
    GEN_SECTION = "GEN_SECTION", "Generate Section"
    AI_ACTION = "AI_ACTION", "AI Action"
    POLISH_SECTION = "POLISH_SECTION", "Polish Section"
    POLISH_DOCUMENT = "POLISH_DOCUMENT", "Polish Document"
    GEN_MERMAID_DIAGRAM = "GEN_MERMAID_DIAGRAM", "Generate Mermaid Diagram"
    CUSTOM_BIB_EMBEDDING = "CUSTOM_BIB_EMBEDDING", "Generate Custom Bibliography Embedding"
    WEBSEARCH_EMBEDDING = "WEBSEARCH_EMBEDDING", "Generate Websearch Embedding"
    GEN_DOCUMENT_REVIEW = "GEN_DOCUMENT_REVIEW", "Generate Document Review"
    WORD_FILTERING = "WORD_FILTERING", "Word Filtering"


class AITokenUsage(BaseModel):
    user = models.ForeignKey(User, verbose_name="User", on_delete=models.CASCADE)
    ai_model = models.CharField(max_length=30, default=settings.OPENAI_API_MODEL)
    usage_type = models.CharField(max_length=20, choices=AITokenUsageType.choices)
    prompt_tokens = models.PositiveBigIntegerField("Prompt Tokens")
    completion_tokens = models.PositiveBigIntegerField("Completion Tokens")
    tokens_used = models.PositiveBigIntegerField("Tokens Used")

    # Generic foreign key fields
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()
    content_object = GenericForeignKey("content_type", "object_id")

    def __str__(self):
        return f"Token usage by {self.user} for {self.get_usage_type_display()} at {self.created_at}"

    @classmethod
    def total_tokens_used(cls, user: User) -> int:
        return (
            AITokenUsage.objects.filter(user=user).aggregate(models.Sum("tokens_used"))["tokens_used__sum"]
            or 0
        )

    @staticmethod
    def model_usage_type_mapping() -> Dict[str, List[str]]:
        return {
            settings.OPENAI_API_MODEL: [
                AITokenUsageType.GEN_PLAN,
                AITokenUsageType.GEN_SECTION,
                AITokenUsageType.AI_ACTION,
                AITokenUsageType.POLISH_SECTION,
                AITokenUsageType.GEN_MERMAID_DIAGRAM,
                AITokenUsageType.WORD_FILTERING,
            ],
            settings.EMBEDDING_OPENAI_API_CONFIGS[0].get("model"): [
                AITokenUsageType.CUSTOM_BIB_EMBEDDING,
                AITokenUsageType.WEBSEARCH_EMBEDDING,
            ],
            settings.MINI_OPENAI_API_MODEL: [
                AITokenUsageType.POLISH_DOCUMENT,
                AITokenUsageType.GEN_DOCUMENT_REVIEW,
            ],
        }
