import re
from typing import Dict, List, Tuple

from django.conf import settings
from rest_framework import serializers

from base.utils import find_first_unmatched_parenthesis
from kernel.llm_agent_tools.defs import ToolNames
from kernel.models import Suggestion, Template, TemplateAgent, Tool, ToolPromptInstructionGroup
from kernel.utils import build_section_dependency_map, flatten_sections, has_conflict, merge_dependency_maps


class UserInputSerializer(serializers.Serializer):
    display_size = serializers.CharField()
    display_name = serializers.CharField()
    slug = serializers.CharField()
    type = serializers.CharField()
    text_limit = serializers.IntegerField()
    default_value = serializers.CharField()


class SectionSerializer(serializers.Serializer):
    slug = serializers.CharField()
    title = serializers.CharField()
    prompt = serializers.CharField(allow_blank=True)
    tools = serializers.ListField(child=serializers.CharField())
    depends_on = serializers.ListField(child=serializers.CharField(), required=False)
    sub_sections = serializers.ListField(child=serializers.DictField(), required=False)
    is_title = serializers.BooleanField(default=False)
    requires_plan = serializers.BooleanField(default=False)
    plan_prompt = serializers.CharField(required=False, allow_blank=True)
    expected_output_instructions = serializers.CharField(allow_blank=True)
    display_on_plan_overview = serializers.BooleanField(default=True)
    display_name_on_plan_overview = serializers.CharField(required=False, allow_null=True)
    dynamic_template_subsection = serializers.BooleanField(default=False)

    def get_fields(self):
        fields = super().get_fields()
        fields["sub_sections"] = serializers.ListField(child=SectionSerializer(), required=False)
        return fields


def get_tool_group_placeholders() -> Tuple[List[str], Dict[str, str], Dict[str, List[str]]]:
    tool_groups = ToolPromptInstructionGroup.objects.prefetch_related("tool_instructions").all()

    all_tool_placeholders = []
    two_way_mapping = {}
    group_tools_mapping = {}
    for tool_group in tool_groups:
        names_placeholder = tool_group.names_placeholder
        instructions_placeholder = tool_group.instructions_placeholder

        all_tool_placeholders.append(names_placeholder)
        all_tool_placeholders.append(instructions_placeholder)

        two_way_mapping[names_placeholder] = instructions_placeholder
        two_way_mapping[instructions_placeholder] = names_placeholder

        group_tools_mapping[names_placeholder] = [
            str(tool.name) for tool in tool_group.tool_instructions.all()
        ]

    return all_tool_placeholders, two_way_mapping, group_tools_mapping


class TemplateSerializer(serializers.Serializer):
    TEMPLATE_TYPE_CHOICES = [
        "Original research",
        "Business report",
        "Expert analysis",
        "Brief report",
        "Literature review",
        "Data on humans",
        "Life science resource portfolio",
        "Experimental workflow and education",
    ]

    name = serializers.CharField()
    description = serializers.CharField()
    type = serializers.ChoiceField(choices=TEMPLATE_TYPE_CHOICES)
    user_inputs = UserInputSerializer(many=True)
    shared_memory = serializers.DictField(required=False)
    system_message = serializers.CharField()
    custom_data_prefix_in_prompt = serializers.CharField()
    custom_data_prefix_in_plan_prompt = serializers.CharField()
    estimated_document_generation_minutes = serializers.IntegerField()
    sections = SectionSerializer(many=True)
    tool_display_names = serializers.DictField()

    def validate(self, attrs):
        system_message = attrs["system_message"]
        user_inputs = attrs["user_inputs"]
        sections = attrs["sections"]
        flat_sections = flatten_sections(sections)
        section_slugs = [section["slug"] for section in flat_sections]
        user_input_slugs = [user_input["slug"] for user_input in user_inputs]
        tool_display_names = attrs["tool_display_names"]

        all_slugs = section_slugs + user_input_slugs
        duplicate_slugs = set([slug for slug in all_slugs if all_slugs.count(slug) > 1])
        if duplicate_slugs:
            raise serializers.ValidationError(f"Duplicate slugs: {', '.join(list(duplicate_slugs))}")

        invalid_placeholders = self._find_abnormal_placeholders(system_message, user_input_slugs)
        if invalid_placeholders:
            raise serializers.ValidationError(
                f"system_message contains abnormal placeholders: {', '.join(invalid_placeholders)}"
            )

        display_on_plan_overview_count = sum(
            1 for section in flat_sections if section.get("display_on_plan_overview")
        )
        if display_on_plan_overview_count != 1:
            raise serializers.ValidationError(
                "There should be exactly one section with display_on_plan_overview=True"
            )

        self._validate_sections(flat_sections, section_slugs, user_input_slugs)

        is_title_sections_count = self._count_is_title_sections(sections)
        if is_title_sections_count > 1:
            raise serializers.ValidationError(
                f"There should be exactly one title section, but found {is_title_sections_count}!"
            )

        dependency_map = build_section_dependency_map(sections)
        if has_conflict(dependency_map):
            raise serializers.ValidationError("Dependency conflict")

        shared_memory = attrs.get("shared_memory", {})
        if has_conflict(shared_memory):
            raise serializers.ValidationError("Shared memory conflict")

        # check if shared memory slugs are all valid slugs
        shared_memory_slugs = set(
            list(shared_memory.keys()) + [item for sublist in shared_memory.values() for item in sublist]
        )
        invalid_shared_memory_slugs = shared_memory_slugs - set(section_slugs)
        if invalid_shared_memory_slugs:
            raise serializers.ValidationError(
                f"Shared_memory contains invalid values: {', '.join(list(invalid_shared_memory_slugs))}"
            )

        merged_map = merge_dependency_maps(dependency_map, shared_memory)
        if has_conflict(merged_map):
            raise serializers.ValidationError("Dependency conflict with shared memory")

        if validation_errors := self._validate_tools_names(
            tool_display_names=tool_display_names, sections=sections
        ):
            raise serializers.ValidationError(", ".join(validation_errors))

        return super().validate(attrs)

    def _validate_sections(self, flat_sections, section_slugs, user_input_slugs):
        valid_tools = Tool.objects.values_list("name", flat=True)
        all_tool_placeholders, tool_two_way_mapping, group_tools_mappings = get_tool_group_placeholders()

        for section in flat_sections:
            section_depends_on = section.get("depends_on", [])
            invalid_depends_on = [
                depends_on
                for depends_on in section_depends_on
                if depends_on not in section_slugs or depends_on == section["slug"]
            ]
            if invalid_depends_on:
                raise serializers.ValidationError(
                    f"Section {section['slug']} depends_on contains invalid values: \
                        {', '.join(invalid_depends_on)}"
                )

            section_valid_placeholders = user_input_slugs.copy() + section_depends_on + all_tool_placeholders
            if section.get("requires_plan"):
                section_valid_placeholders.append("plan")
            section_valid_placeholders.append("expected_output_instructions")

            section_tools = section.get("tools", [])
            for tool in section_tools:
                if tool not in valid_tools:
                    raise serializers.ValidationError(
                        f"Section {section['slug']} contains invalid tool: {tool}"
                    )

            if section.get("prompt"):
                unmatched_parenthesis = find_first_unmatched_parenthesis(section["prompt"])
                if unmatched_parenthesis:
                    raise serializers.ValidationError(
                        f"Section {section['slug']} prompt contains \
                            unmatched parenthesis: {unmatched_parenthesis}"
                    )

                absent_placeholders = self._find_absent_placeholders(section["prompt"], section_depends_on)
                if absent_placeholders:
                    raise serializers.ValidationError(
                        f"Section {section['slug']} prompt does not use keys: \
                            {', '.join(absent_placeholders)} present in depends_on."
                    )

                invalid_placeholders = self._find_abnormal_placeholders(
                    section["prompt"], section_valid_placeholders
                )
                invalid_section_slugs = [
                    placeholder for placeholder in invalid_placeholders if placeholder in section_slugs
                ]
                if invalid_section_slugs:
                    raise serializers.ValidationError(
                        f"Section {section['slug']} prompt uses keys: \
                            {', '.join(invalid_section_slugs)} not present in depends_on."
                    )
                if invalid_placeholders:
                    raise serializers.ValidationError(
                        f"Section {section['slug']} prompt contains abnormal placeholders: \
                            {', '.join(invalid_placeholders)}."
                    )

                all_placeholders = self._find_all_placeholders(section["prompt"])
                if "expected_output_instructions" in all_placeholders and not section.get(
                    "expected_output_instructions"
                ):
                    raise serializers.ValidationError(
                        f"Section {section['slug']} prompt contains 'expected_output_instructions' \
                            placeholder, but 'expected_output_instructions' is blank."
                    )

                for placeholder in all_placeholders:
                    if vice_versa_tool_placeholder := tool_two_way_mapping.get(placeholder):
                        if vice_versa_tool_placeholder not in all_placeholders:
                            raise serializers.ValidationError(
                                f"Section {section['slug']} prompt contains tool group placeholder \
                                    '{placeholder}', but not contains '{vice_versa_tool_placeholder}'."
                            )

                    if group_tools := group_tools_mappings.get(placeholder):
                        if not any(tool in section_tools for tool in group_tools):
                            raise serializers.ValidationError(
                                f"Section {section['slug']} prompt contains tool group placeholder \
                                    '{placeholder}', but not contains any tool from '{group_tools}', \
                                        current section tools: {section_tools}."
                            )

            if section.get("plan_prompt"):
                unmatched_parenthesis = find_first_unmatched_parenthesis(section["plan_prompt"])
                if unmatched_parenthesis:
                    raise serializers.ValidationError(
                        f"Section {section['slug']} plan_prompt contains \
                            unmatched parenthesis: {unmatched_parenthesis}"
                    )

                invalid_placeholders = self._find_abnormal_placeholders(
                    section["plan_prompt"], user_input_slugs
                )
                if invalid_placeholders:
                    raise serializers.ValidationError(
                        f"Section {section['slug']} plan_prompt contains abnormal placeholders: \
                            {', '.join(invalid_placeholders)}"
                    )

    def _count_is_title_sections(self, sections):
        count = 0
        for section in sections:
            if section.get("is_title"):
                count += 1
            if section.get("sub_sections"):
                count += self._count_is_title_sections(section["sub_sections"])
        return count

    def _find_all_placeholders(self, str_template: str) -> List[str]:
        return re.findall(r"\{(.*?)\}", str_template)

    def _find_absent_placeholders(self, str_template: str, present_placeholders: List[str]) -> List[str]:
        placeholders = self._find_all_placeholders(str_template)
        return [placeholder for placeholder in present_placeholders if placeholder not in placeholders]

    def _find_abnormal_placeholders(self, str_template: str, valid_placeholders: List[str]) -> List[str]:
        placeholders = self._find_all_placeholders(str_template)
        return [placeholder for placeholder in placeholders if placeholder not in valid_placeholders]

    @staticmethod
    def _validate_tools_names(tool_display_names: Dict[str, str], sections) -> List[str]:
        validation_errors = []
        technical_names = set(technical_name for technical_name, display_name in tool_display_names.items())
        for section in sections:
            if section.get("tools"):
                if unmapped_tool_names := (set(section["tools"]) - technical_names):
                    validation_errors.append(
                        f"Section {section.get('slug')} contains {unmapped_tool_names} "
                        f"tools that does not have a mapping in the 'tool_display_names'"
                    )
        return validation_errors


class TemplateModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = Template
        fields = ["id", "name", "description", "type", "user_inputs"]


class TemplateSectionDetailSerializer(serializers.Serializer):
    slug = serializers.CharField()
    title = serializers.CharField()
    is_title = serializers.BooleanField()
    sub_sections = serializers.ListField(child=serializers.DictField())

    def get_fields(self):
        fields = super().get_fields()
        fields["sub_sections"] = serializers.ListField(child=TemplateSectionDetailSerializer())
        return fields


class TemplateDetailSerializer(serializers.ModelSerializer):
    section_influences = serializers.DictField(source="get_section_influences")
    sections = TemplateSectionDetailSerializer(many=True)
    display_name_on_plan_overview = serializers.CharField()

    class Meta:
        model = Template
        fields = [
            "id",
            "name",
            "description",
            "type",
            "user_inputs",
            "section_influences",
            "sections",
            "display_name_on_plan_overview",
        ]

    def to_representation(self, instance: Template):
        representation = super().to_representation(instance)
        representation["sections"] = [
            section for section in representation["sections"] if not section.get("is_title", False)
        ]
        return representation


class GeneratePlanSerializer(serializers.Serializer):
    user_inputs = serializers.DictField()


class SuggestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Suggestion
        fields = ["suggest_type", "description"]

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return Suggestion.objects.create(**validated_data)


class TemplateAgentSerializer(serializers.ModelSerializer):
    agents = serializers.SerializerMethodField()

    class Meta:
        model = TemplateAgent
        fields = [
            "icon",
            "agents",
            "resources",
            "toggleable",
            "description",
            "display_name",
            "checked_by_default",
        ]

    def get_agents(self, obj: TemplateAgent):
        return [tool.name for tool in obj.tools.all()]

    def to_representation(self, instance: TemplateAgent):
        representation = super().to_representation(instance)
        is_agent_disabled = self._is_agent_disabled(representation["agents"])
        representation["disabled"] = is_agent_disabled
        for resource in representation.get("resources", []):
            resource["disabled"] = is_agent_disabled
        return representation

    def _is_agent_disabled(self, agent_tools: list) -> bool:
        if ToolNames.WEB_SEARCH_TOOL in agent_tools:
            return not settings.IS_WEBSEARCH_ENABLED

        if ToolNames.PUBMED_ABSTRACT_SIMILARITY_SEARCH_TOOL in agent_tools:
            return not self._is_pubmed_tool_enabled()

        if ToolNames.PRECIOUS3GPT_REVERSE_AGING_TOOL in agent_tools:
            return not settings.HUGGINFACE_AUTHORIZATION_TOKEN or not settings.HUGGINFACE_API

        # Default: agent is enabled
        return False

    def _is_pubmed_tool_enabled(self) -> bool:
        # Tool is enabled if we have Pharmacognitive API access
        if settings.PHARMACOGNITIVE_API_URL:
            return True

        # Or if bibliography is enabled and we have embedding configs
        return settings.IS_BIBLIOGRAPHY_ENABLED and settings.EMBEDDING_OPENAI_API_CONFIGS


class ToolArgSerializer(serializers.Serializer):
    name = serializers.CharField()
    type = serializers.CharField()
    description = serializers.CharField()
