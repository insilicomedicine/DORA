from typing import TYPE_CHECKING

from documents.transparency.utils import create_tool_level_record, update_generation_log

if TYPE_CHECKING:
    from documents.models import Document, Section


def transparency_log_section_tools_analyze(section: "Section"):
    if section.tools:
        message = "Performing research for the section..."
    else:
        message = "Analyzing instructions..."

    log_record = create_tool_level_record("Research agent", message)
    update_generation_log(section=section, agents_result=log_record)


def transparency_log_custom_data_analyze(section: "Section"):
    if section.custom_data:
        log_record = create_tool_level_record("Research agent", "Analyzing custom data...")
        update_generation_log(section=section, agents_result=log_record)


def transparency_log_plan_analyze(section: "Section"):
    if section.requires_plan:
        log_record = create_tool_level_record("Research agent", "Analyzing section’s overview...")
        update_generation_log(section=section, agents_result=log_record)


def transparency_log_dependencies_analyze(section: "Section", document: "Document"):
    depends_on = document.sections_dependency_map.get(section.slug, [])
    shared_memory = document.template_json.get("shared_memory", {}).get(section.slug, [])
    dependencies = set(depends_on + shared_memory)
    mapped_dependencies = [
        document.sections_map[slug]["title"]
        for slug in dependencies
        if document.sections_map.get(slug, {}).get("title")
    ]

    if mapped_dependencies:
        log_record = create_tool_level_record(
            tool_title="Research agent",
            message=f"Using the results collected from {', '.join(sorted(mapped_dependencies))}",
        )
        update_generation_log(section=section, agents_result=log_record)


def transparency_log_complete_final_text(section: "Section"):
    section.refresh_from_db()
    result = section.result or {}
    result = result.get("data", "").strip()

    update_generation_log(
        section=section,
        agents_result=create_tool_level_record(
            tool_title="Writer agent",
            message="Completing the final section's text",
            result=result if result else None,
        ),
    )
