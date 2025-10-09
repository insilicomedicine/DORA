from collections import namedtuple
from dataclasses import dataclass
from enum import Enum
from typing import Optional

from django.db import models
from django.utils import timezone

INTERNAL_GROUP_NAME = "Internal"


Plan = namedtuple("Plan", ["name", "type", "quota"])


class PlanEnum(Enum):
    FREE_TRIAL = Plan(name="Free Trial", type="free", quota=3)
    ADVANCED = Plan(name="Advanced", type="advanced", quota=10)
    PROFESSIONAL = Plan(name="Professional", type="professional", quota=0)

    @classmethod
    def get_by_type(cls, plan_type: str) -> Optional["PlanEnum"]:
        for item in cls:
            if item.value.type == plan_type:
                return item
        return None


PUBLICATION_START_YEAR = 2010


class PublicationDateEnum(models.TextChoices):
    ALL = "all"
    LAST_5_YEARS = "last_5_years"
    LAST_10_YEARS = "last_10_years"

    @classmethod
    def get_value(cls, publicate_date: str) -> int:
        current_year = timezone.now().year
        if publicate_date == cls.LAST_5_YEARS:
            return current_year - 5
        elif publicate_date == cls.LAST_10_YEARS:
            return current_year - 10
        return PUBLICATION_START_YEAR


class ArticleTypeEnum(models.TextChoices):
    JOURNAL_ARTICLE = "Journal Article"
    REVIEW = "Review"
    SYSTEMATIC_REVIEW = "Systematic Review"


def get_default_publication_settings():
    return {
        "publication_date": PublicationDateEnum.ALL,
        "article_types": [],
        "top_cited": False,
    }


class DisplayLayoutEnum(models.TextChoices):
    COLUMN = "column"
    CARD = "card"


def get_default_display_preferences():
    return {"documents_layout": DisplayLayoutEnum.CARD}


LIMITED_DOCUMENT_MESSAGE = "Please upgrade your plan to explore the entire document."


@dataclass
class TokenUsage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0

    @classmethod
    def from_dict(cls, data):
        return cls(
            completion_tokens=data["completion_tokens"],
            prompt_tokens=data["prompt_tokens"],
            total_tokens=data["total_tokens"],
        )

    def __add__(self, other):
        if not isinstance(other, TokenUsage):
            return NotImplemented

        return TokenUsage(
            self.completion_tokens + other.completion_tokens,
            self.prompt_tokens + other.prompt_tokens,
            self.total_tokens + other.total_tokens,
        )
