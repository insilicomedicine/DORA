from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType

from app import settings
from base.models import BaseModel
from users.defs import TokenUsage
from users.models import AITokenUsage, AITokenUsageType


def record_token_usage(
    user: User,
    model_instance: BaseModel,
    token_usage: TokenUsage,
    usage_type: AITokenUsageType,
    ai_model: str = settings.OPENAI_API_MODEL,
) -> None:
    if token_usage.total_tokens > 0:
        AITokenUsage.objects.create(
            user=user,
            usage_type=usage_type,
            prompt_tokens=token_usage.prompt_tokens,
            completion_tokens=token_usage.completion_tokens,
            tokens_used=token_usage.total_tokens,
            content_type=ContentType.objects.get_for_model(model_instance),
            ai_model=ai_model,
            object_id=model_instance.id,
        )
