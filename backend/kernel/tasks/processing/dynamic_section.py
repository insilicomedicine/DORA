import json
import logging
import re
from typing import Any, Dict, List, Set

from django.db import transaction
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import PromptTemplate
from nltk.tokenize import sent_tokenize
from pydantic import BaseModel, Field

from base.decorators import retry
from documents.models import Document, Section, SectionStatus
from general.defs import ConfigKeyType
from general.models import Config
from kernel.chat_models.utils import init_llm_mini
from kernel.llm_agent_tools.defs import ToolNames
from kernel.models import Tool
from kernel.services.telemetry import telemetry
from kernel.utils import capture_and_suppress_exception, is_available_tool

RETRY_TIMES = 3

GENERATE_SECTIONS_TEMPLATE = "generate_sections_template"
SEPARATE_CUSTOM_DATA_TEMPLATE = "separate_custom_data_template"


MUST_HAVE_TOOLS = [ToolNames.PUBMED_ABSTRACT_SIMILARITY_SEARCH_TOOL, ToolNames.WEB_SEARCH_TOOL]

logger = logging.getLogger(__name__)


class ResearchStep(BaseModel):
    """
    Represents a single step in the research plan.

    Attributes:
        slug (str): A unique identifier for the step, used for referencing and URL-friendly naming.
        title (str): The title or main topic of the research step.
        depends_on (List[str]): List of slugs of other steps that this step depends on.
        tools (List[str]): List of tool names required to complete this step.
        prompt (str): Detailed instructions or questions to guide the research for this step.
        expected_output_instructions (str): Guidelines for the expected format and content
            of the step's output.
    """

    slug: str
    title: str
    depends_on: List[str] = Field(default_factory=list, description="Slugs of steps this step depends on")
    tools: List[str] = Field(default_factory=list, description="Names of tools required for this step")
    prompt: str
    expected_output_instructions: str


class ResearchPlan(BaseModel):
    """
    Represents the overall research plan, consisting of multiple research steps.

    Attributes:
        steps (List[ResearchStep]): An ordered list of ResearchStep objects that make up the research plan.
    """

    steps: List[ResearchStep] = Field(description="Ordered list of research steps")


class SubsectionWithCustomData(BaseModel):
    slug: str = Field(description="The slug of the subsection to which the custom data belongs to")
    custom_data_part: str = Field(description="A part of the custom data")


class SeparatedCustomData(BaseModel):
    parts: List[SubsectionWithCustomData] = Field(description="Ordered list of SubsectionWithCustomData")


def get_unique_slug(base_slug: str, existing_slugs: Set[str]) -> str:
    counter = 2
    new_slug = base_slug
    while new_slug in existing_slugs:
        new_slug = f"{base_slug}{counter}"
        counter += 1
    return new_slug


def get_available_tools(document: Document, section: Section) -> List[str]:
    section_tools = section.tools or []
    checked_agents = document.settings.get("agents", {})
    available_tools = [tool for tool in section_tools if is_available_tool(tool, checked_agents)]
    return available_tools


def get_tools_descriptions(available_tools: List[str]) -> Dict[str, str]:
    tool_settings = Tool.objects.filter(name__in=available_tools).values("name", "description")
    tool_descriptions = {tool["name"]: tool["description"] for tool in tool_settings}
    return {tool: tool_descriptions.get(tool, "") for tool in available_tools}


def find_all_placeholders(text: str) -> List[str]:
    return re.findall(r"\{(.*?)\}", text)


def validate_section_data(
    section_data: Dict[str, Any], tools_descriptions: Dict[str, str], section_slugs: Set[str]
) -> None:
    # Check for unique slugs
    if section_data["slug"] in section_slugs:
        raise ValueError(f"Duplicate slug found: {section_data['slug']}")
    section_slugs.add(section_data["slug"])

    # Check tools
    if not isinstance(section_data["tools"], list) or not all(
        isinstance(tool, str) for tool in section_data["tools"]
    ):
        raise ValueError(f"Invalid 'tools' format in section: {section_data['slug']}")
    for tool in section_data["tools"]:
        if tool not in tools_descriptions:
            raise ValueError(f"Unknown tool '{tool}' in section: {section_data['slug']}")

    # Check tools mentioned in prompt
    prompt_tools = set(tool for tool in tools_descriptions.keys() if tool in section_data["prompt"])
    missing_tools = prompt_tools - set(section_data["tools"])
    if missing_tools:
        section_data["tools"].extend(missing_tools)

    # Check depends_on
    if not isinstance(section_data["depends_on"], list) or not all(
        isinstance(slug, str) for slug in section_data["depends_on"]
    ):
        raise ValueError(f"Invalid 'depends_on' format in section: {section_data['slug']}")

    if section_data["slug"] in section_data["depends_on"]:
        raise ValueError(f"Section '{section_data['slug']}' cannot depend on itself.")

    # Check depends_on slugs in prompt
    missing_deps = [dep_slug for dep_slug in section_data["depends_on"] if dep_slug not in section_slugs]
    if missing_deps:
        raise ValueError(
            f"Unknown dependency slug(s) '{', '.join(missing_deps)}' in section: {section_data['slug']}"
        )

    # LLM often fails to include the sections' slugs into the prompt, but it could be fixed with the code
    deps_not_in_prompt = [
        dep_slug for dep_slug in section_data["depends_on"] if f"{{{dep_slug}}}" not in section_data["prompt"]
    ]
    if deps_not_in_prompt:
        deps_not_in_prompt_placeholders = [f"{{{dep_slug}}}" for dep_slug in deps_not_in_prompt]
        section_data["prompt"] += (
            "\n\nYou have to use the data from the previous subsection(s): "
            f"{', '.join(deps_not_in_prompt_placeholders)}."
        )

    # Check the placeholders in the prompt
    unknown_placeholders = []
    placeholders = find_all_placeholders(section_data["prompt"])
    for placeholder in placeholders:
        if placeholder not in section_data["depends_on"]:
            if placeholder not in section_slugs:
                unknown_placeholders.append(f"{{{placeholder}}}")
            else:
                section_data["depends_on"].append(placeholder)

    if unknown_placeholders:
        sentences = sent_tokenize(section_data["prompt"])
        filtered_sentences = [
            sentence
            for sentence in sentences
            if any(placeholder in sentence for placeholder in unknown_placeholders)
        ]
        for filtered_sentence in filtered_sentences:
            section_data["prompt"] = section_data["prompt"].replace(filtered_sentence, "")


def update_conflicting_slugs(sections_data: List[Dict], existing_section_slugs: Set[str]) -> None:
    original_to_new_slugs = {}

    for section_data in sections_data:
        if section_data["slug"] in existing_section_slugs:
            new_slug = get_unique_slug(section_data["slug"], existing_section_slugs)
            original_to_new_slugs[section_data["slug"]] = new_slug
            section_data["slug"] = new_slug

    for section_data in sections_data:
        for index, dependency_slug in enumerate(section_data["depends_on"]):
            if dependency_slug in original_to_new_slugs:
                section_data["depends_on"][index] = original_to_new_slugs[dependency_slug]


def check_generated_sections(sections_data: List[Dict], tools_descriptions: Dict[str, str]) -> None:
    section_slugs = set()

    for section_data in sections_data:
        validate_section_data(section_data, tools_descriptions, section_slugs)

    section_tools = list(set([tool for section in sections_data for tool in section["tools"]]))
    for tool in tools_descriptions.keys():
        if tool in MUST_HAVE_TOOLS and tool not in section_tools:
            raise ValueError(f"Missing required tool '{tool}' in the generated subsections.")


@retry(times=RETRY_TIMES, exceptions=(ValueError,))
def generate_sub_sections_by_plan(
    document_id: str,
    plan: str,
    tools_descriptions: Dict[str, str],
    prompt_template: str,
    existing_section_slugs: Set[str],
) -> List[Dict[str, Any]]:
    parser = JsonOutputParser(pydantic_object=ResearchPlan)
    llm = init_llm_mini()
    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["plan", "filtered_tools_descriptions"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )
    chain = prompt | llm | parser
    resp = chain.invoke(
        {
            "plan": plan,
            "filtered_tools_descriptions": json.dumps(tools_descriptions)
            if tools_descriptions
            else "no tools available for this section.",
        }
    )
    result = resp.get("steps", [])

    logger.info(f"Generated subsections: {result} for document {document_id}")

    update_conflicting_slugs(result, existing_section_slugs)
    check_generated_sections(result, tools_descriptions)
    return result


def check_custom_data(
    custom_data_parts: List[Dict[str, Any]], sub_sections_data: List[Dict[str, Any]]
) -> None:
    existing_slugs = [section["slug"] for section in sub_sections_data]
    custom_data_slugs = [part["slug"] for part in custom_data_parts]
    unknown_slugs = set(custom_data_slugs) - set(existing_slugs)
    if unknown_slugs:
        raise ValueError(f"Unknown subsection slug(s) in custom data: {', '.join(unknown_slugs)}")

    for section in custom_data_parts:
        if set(section.keys()) != {"slug", "custom_data_part"}:
            raise ValueError(
                f"Invalid keys in section: {set(section.keys())}. Expected: {{'slug', 'custom_data_part'}}"
            )


@retry(times=RETRY_TIMES, exceptions=(ValueError,))
def separate_custom_data(
    custom_data: str, sub_sections_data: List[Dict[str, Any]], prompt_template: str
) -> List[Dict[str, Any]]:
    parser = JsonOutputParser(pydantic_object=SeparatedCustomData)
    llm = init_llm_mini()
    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["custom_data", "subsection_info"],
        partial_variables={"format_instructions": parser.get_format_instructions()},
    )
    chain = prompt | llm | parser
    resp = chain.invoke({"custom_data": custom_data, "subsection_info": json.dumps(sub_sections_data)})
    result = resp.get("parts", [])
    check_custom_data(result, sub_sections_data)
    return result


def insert_generation_log(document: Document, target_section: Section) -> None:
    generation_log = document.generation_log or {}
    agents_result = generation_log.get("agents_result", [])
    agents_result.insert(
        1,
        {
            "text": f"Creating subsections according to {target_section.display_name_on_plan_overview}...",
            "agents": [],
        },
    )
    document.update_fields({"generation_log": generation_log})


@capture_and_suppress_exception
def create_sub_sections(document_id: str) -> bool:
    logger.info(f"Creating sub sections dynamically for document {document_id}")

    prompt_templates = Config.get(ConfigKeyType.DYNAMIC_SECTION_PROMPTS)
    if not prompt_templates:
        return False

    document: Document = Document.objects.get(id=document_id)
    sections: List[Section] = document.sections.all()
    target_section = next((section for section in sections if section.dynamic_template_subsection), None)
    if not target_section:
        return False

    if target_section.sub_sections.exists():
        return False

    available_tools = get_available_tools(document, target_section)
    tools_descriptions = get_tools_descriptions(available_tools)

    existing_section_slugs = {section.slug for section in sections}

    with telemetry(document=document, section=target_section, task="create_sub_sections_dynamicly"):
        sub_sections_data = generate_sub_sections_by_plan(
            document_id,
            target_section.plan,
            tools_descriptions,
            prompt_templates[GENERATE_SECTIONS_TEMPLATE],
            existing_section_slugs,
        )

    custom_data_mapping = {}
    if target_section.custom_data:
        with telemetry(document=document, section=target_section, task="separate_custom_data"):
            custom_data_parts = separate_custom_data(
                target_section.custom_data, sub_sections_data, prompt_templates[SEPARATE_CUSTOM_DATA_TEMPLATE]
            )
        custom_data_mapping = {part["slug"]: part["custom_data_part"] for part in custom_data_parts}

    # update document template
    template_json = document.template_json
    for section in template_json["sections"]:
        if section["slug"] == target_section.slug:
            section["sub_sections"] = sub_sections_data
    document.update_fields({"template_json": template_json})

    # create sub sections
    with transaction.atomic():
        for sub_section_data in sub_sections_data:
            prompt = target_section.prompt.replace("{plan}", sub_section_data["prompt"])
            Section.objects.create(
                document=document,
                parent=target_section,
                slug=sub_section_data["slug"],
                title=sub_section_data["title"],
                prompt=prompt,
                tools=sub_section_data["tools"],
                custom_data=custom_data_mapping.get(sub_section_data["slug"], ""),
                generation_log={"agents_result": []},
                status=SectionStatus.IN_PROGRESS,
            )

    insert_generation_log(document, target_section)

    logger.info(f"Sub sections created for document {document_id}")

    return True
