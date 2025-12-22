from dataclasses import dataclass, field
from typing import List, TypedDict, Union

from users.defs import TokenUsage

SYSTEM_PROMPT_FOR_PLAN_GENRATION = "You are a helpful assistant."


class AIMessageDict(TypedDict):
    user_message: str
    ai_message: str


@dataclass
class AgentAction:
    tool: str
    tool_input: Union[str, dict]
    tool_output: str


@dataclass
class AgentResponse:
    content: str
    token_usage: TokenUsage
    agent_actions: List[AgentAction] = field(default_factory=list)


class AIActionType:
    MAKE_SHORTER = "make_shorter"
    MAKE_LONGER = "make_longer"
    CUSTOM_PROMPT = "custom_prompt"

    TYPE_CHOICES = [MAKE_SHORTER, MAKE_LONGER, CUSTOM_PROMPT]


class SearchResource:
    PMC = "pmc"
    PUBMED = "pubmed"
    CUSTOM_BIB = "custom_bibliography"
    WEBSEARCH = "websearch"


DEFAULT_DISPLAY_NAME_ON_PLAN_OVERVIEW = "Proposed research tasks"


class TemplateType:
    ORIGINAL_RESEARCH = "Original research"
    BUSINESS_REPORT = "Business report"
    EXPERT_ANALYSIS = "Expert analysis"
    BRIEF_REPORT = "Brief report"
    LITERATURE_REVIEW = "Literature review"
    DATA_ON_HUMANS = "Data on humans"
    LIFE_SCIENCE_RESOURCE_PORTFOLIO = "Life science resource portfolio"
    EXPERIMENTAL_WORKFLOW_AND_EDUCATION = "Experimental workflow and education"
    DEEP_RESEARCH = "Deep research"

    TYPE_CHOICES = [
        ORIGINAL_RESEARCH,
        BUSINESS_REPORT,
        EXPERT_ANALYSIS,
        BRIEF_REPORT,
        LITERATURE_REVIEW,
        DATA_ON_HUMANS,
        LIFE_SCIENCE_RESOURCE_PORTFOLIO,
        EXPERIMENTAL_WORKFLOW_AND_EDUCATION,
        DEEP_RESEARCH,
    ]
