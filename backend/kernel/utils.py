import logging
from collections import defaultdict, deque
from functools import wraps
from typing import Any, Dict, List

import sentry_sdk

from kernel.defs import DEFAULT_DISPLAY_NAME_ON_PLAN_OVERVIEW

logger = logging.getLogger(__name__)


def build_section_dependency_map(sections: List[Dict[str, Any]]) -> Dict[str, List[str]]:
    dependency_map: Dict[str, List[str]] = {}
    for section in sections:
        slug = section["slug"]
        dependency_map[slug] = section.get("depends_on", [])

        if sub_sections := section.get("sub_sections"):
            dependency_map.update(build_section_dependency_map(sub_sections))
    return dependency_map


def merge_dependency_maps(
    dependency_map1: Dict[str, List[str]], dependency_map2: Dict[str, List[str]]
) -> Dict[str, List[str]]:
    merged_map: Dict[str, List[str]] = {}
    for key, val in dependency_map1.items():
        merged_map[key] = val[:]
    for key, val in dependency_map2.items():
        if key in merged_map:
            for item in val:
                if item not in merged_map[key]:
                    merged_map[key].append(item)
        else:
            merged_map[key] = val[:]
    return merged_map


def has_conflict(dependency_map: Dict[str, List[str]]) -> bool:
    def has_cycle(node, visited, rec_stack, graph):
        visited.add(node)
        rec_stack.add(node)
        for neighbour in graph.get(node, []):
            if neighbour not in visited:
                if has_cycle(neighbour, visited, rec_stack, graph):
                    return True
            elif neighbour in rec_stack:
                return True
        rec_stack.remove(node)
        return False

    visited = set()
    rec_stack = set()
    for node in dependency_map:
        if node not in visited:
            if has_cycle(node, visited, rec_stack, dependency_map):
                return True
    return False


def get_related_sections(dependency_map: Dict[str, List[str]], section_slug: str) -> List[str]:
    related_sections = set()

    def dfs(item):
        nonlocal related_sections
        for dependent, dependencies in dependency_map.items():
            if item in dependencies:
                if dependent not in related_sections:
                    related_sections.add(dependent)
                    dfs(dependent)

    dfs(section_slug)

    return list(related_sections)


def is_available_tool(tool: str, checked_agents: Dict[str, Dict[str, List[str]]]) -> bool:
    if tool in checked_agents:
        if tool in [
            "web_search_tool",
            "PandaOmics_combined_diff_expression",
            "PandaOmics_combined_diff_methylation",
            "PandaOmics_comparisons_diff_expression",
            "PandaOmics_comparisons_diff_methylation",
        ]:
            agent = checked_agents[tool]
            if agent.get("resources"):
                return True
        else:
            return True

    return False


def flatten_sections(sections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    flat_sections = []
    for section in sections:
        sub_sections = section.pop("sub_sections", [])
        flat_sections.append(section)
        flat_sections.extend(flatten_sections(sub_sections))
    return flat_sections


def find_all_influenced_sections(section: str, graph: Dict[str, List[str]]) -> List[str]:
    influenced = []
    queue = deque([section])

    while queue:
        current = queue.popleft()
        for influenced_section in graph.get(current, []):
            if influenced_section not in influenced:
                influenced.append(influenced_section)
                queue.append(influenced_section)
    return influenced


def build_section_influences(section_dependencies: Dict[str, List[str]]) -> Dict[str, List[str]]:
    influence_graph = defaultdict(list)
    for section, dependencies in section_dependencies.items():
        for dep in dependencies:
            influence_graph[dep].append(section)

    section_influences = {}
    for section in section_dependencies.keys():
        section_influences[section] = find_all_influenced_sections(section, influence_graph)

    return section_influences


def filter_section_dependencies(
    section_dependencies: Dict[str, List[str]], sections_to_remove: List[str]
) -> Dict[str, List[str]]:
    filtered_dependencies = {}
    for section, dependencies in section_dependencies.items():
        if section not in sections_to_remove:
            filtered_dependencies[section] = [dep for dep in dependencies if dep not in sections_to_remove]
    return filtered_dependencies


def topological_sort_sections(section_dependencies: Dict[str, List[str]]) -> List[List[str]]:
    # Calculate in_degree for each node/section
    in_degree = {section: 0 for section in section_dependencies}
    for section, deps in section_dependencies.items():
        in_degree[section] += len(deps)

    # Find all sections with zero in-degree,/io1q i.e., no dependencies
    queue = deque([section for section, degree in in_degree.items() if degree == 0])

    # Initialize the result list for layers
    result = []

    while queue:
        layer = list(queue)
        result.append(layer)
        next_queue = deque()

        # Process each section in the current layer
        while queue:
            section = queue.popleft()
            for dependent, deps in section_dependencies.items():
                if section in deps:
                    in_degree[dependent] -= 1
                    if in_degree[dependent] == 0:
                        next_queue.append(dependent)

        queue = next_queue

    return result


def get_display_name_on_plan_overview(sections: list[Dict[str, Any]]) -> str:
    display_names = {
        section["display_name_on_plan_overview"]
        for section in sections
        if section.get("display_name_on_plan_overview")
    }
    return display_names.pop() if display_names else DEFAULT_DISPLAY_NAME_ON_PLAN_OVERVIEW


def capture_and_suppress_exception(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as exc:
            sentry_sdk.capture_exception(exc)
            logger.error(f"Non-blocker exception captured in {func.__qualname__}: {exc}")
            return None

    return wrapper
