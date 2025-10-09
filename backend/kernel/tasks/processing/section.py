import logging
from typing import Dict, List, Optional, Tuple

import sentry_sdk

from documents.models import Document, DocumentStage, DocumentStatus, Section, SectionStatus
from kernel.agents.section_agent import SectionAgent
from kernel.defs import AgentAction, AgentResponse, AIMessageDict

logger = logging.getLogger(__name__)


def get_dependencies_and_history(
    document: Document, section: Section, section_message_map: Dict[str, Dict]
) -> Tuple[List[AIMessageDict], Dict[str, str]]:
    # shared_memory
    chat_history: List[AIMessageDict] = []
    shared_memory_sections = document.shared_memory.get(section.slug, [])
    for shared_memory_section in shared_memory_sections:
        if messages := section_message_map.get(shared_memory_section):
            chat_history.append(messages)

        shared_memory_sub_sections = document.get_all_sub_sections(shared_memory_section)
        for shared_memory_sub_section in shared_memory_sub_sections:
            if messages := section_message_map.get(shared_memory_sub_section):
                chat_history.append(messages)

    # depends_on
    dependencies: Dict[str, str] = {}
    dependency_sections = document.sections_dependency_map.get(section.slug, [])
    for dependency_section in dependency_sections:
        dependency_section_message = ""
        if messages := section_message_map.get(dependency_section):
            dependency_section_message = messages["ai_message"]

        dependency_sub_sections = document.get_all_sub_sections(dependency_section)
        for dependency_sub_section in dependency_sub_sections:
            if messages := section_message_map.get(dependency_sub_section):
                dependency_section_message += messages["ai_message"]

        dependency_custom_sections = section.get_custom_sub_sections(dependency_section)
        for dependency_custom_section in dependency_custom_sections:
            if dependency_custom_section.result:
                dependency_section_message += dependency_custom_section.result.get("data", "")

        dependencies[dependency_section] = dependency_section_message

    return chat_history, dependencies


def generate_section_content(
    document: Document,
    section: Section,
    section_message_map: Dict[str, AIMessageDict],
    agent_actions: List[AgentAction],
) -> Tuple[Optional[AgentResponse], SectionStatus, str, Dict]:
    logger.info(f"Generate section {section.id} content...")

    chat_history, dependencies = get_dependencies_and_history(document, section, section_message_map)
    section_agent = SectionAgent(section, chat_history)
    try:
        agent_response = section_agent.generate_content(dependencies)
        logger.info(
            f"Section {section.id} content generated.\n"
            f"{agent_response.content}\n{agent_response.agent_actions}"
        )
        messages = {
            "user_message": f"Generate the {section.title} section.",
            "ai_message": agent_response.content,
        }
        section_status = SectionStatus.COMPLETED
        section_error = ""
        agent_actions.extend(agent_response.agent_actions)
    except Exception as exc:
        logger.error(f"Error generating section content: {exc}")
        sentry_sdk.capture_exception(exc)

        section_error = str(exc)
        section_status = SectionStatus.FAILED
        messages = {}
        agent_response = None

    logger.info(f"Generated section {section.id} content.")
    return (agent_response, section_status, section_error, messages)


def handle_section_failure(document: Document) -> None:
    document.sections.filter(status=SectionStatus.IN_PROGRESS).update(status=SectionStatus.FAILED)
    document.update_fields({"status": DocumentStatus.FAILED, "stage": DocumentStage.CONTENT_GENERATED})
