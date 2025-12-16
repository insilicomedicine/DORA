from django.contrib.auth.models import Group, User
from django.core.exceptions import ValidationError
from django.db import models

from base.defs.http import HttpRequestMethod
from base.models import BaseModel
from bibliography.models import BibliographyType
from general.defs import ToolSourceEnum
from kernel.utils import (
    build_section_dependency_map,
    build_section_influences,
    flatten_sections,
    get_display_name_on_plan_overview,
    merge_dependency_maps,
)


class Template(BaseModel):
    template_json = models.JSONField("Template JSON")
    template_file = models.FileField("Template File", upload_to="templates")
    created_by = models.ForeignKey(User, verbose_name="Created By", on_delete=models.CASCADE)
    allowed_users = models.ManyToManyField(
        User, verbose_name="Allowed Users", related_name="accessible_templates", blank=True
    )
    allowed_groups = models.ManyToManyField(
        Group, verbose_name="Allowed Groups", related_name="accessible_templates", blank=True
    )
    free_trial = models.BooleanField(
        "Free Trial", default=False, help_text="Indicates if the template is available for free trial."
    )
    is_online = models.BooleanField(
        "Is Online", default=False, help_text="Indicates if the template is currently online."
    )
    display_order = models.PositiveIntegerField(default=999)

    def __str__(self) -> str:
        return self.template_json.get("name", "")

    class Meta:
        ordering = ["display_order"]

    @property
    def name(self) -> str:
        return self.template_json.get("name", "")

    @property
    def description(self) -> str:
        return self.template_json.get("description", "")

    @property
    def type(self) -> str:
        return self.template_json.get("type", "")

    @property
    def tags(self) -> list:
        return self.template_json.get("tags", [])

    @property
    def system_message(self) -> str:
        return self.template_json.get("system_message", "")

    @property
    def user_inputs(self) -> list:
        return self.template_json.get("user_inputs", [])

    @property
    def shared_memory(self) -> dict:
        return self.template_json.get("shared_memory", {})

    @property
    def sections(self) -> list:
        return self.template_json.get("sections", [])

    @property
    def flat_sections(self) -> list:
        sections = self.sections
        return flatten_sections(sections)

    @property
    def sub_sections_map(self) -> dict:
        mapping = {}

        def recursive_collect(section: dict) -> None:
            if section["slug"] not in mapping:
                mapping[section["slug"]] = []

            for sub_section in section.get("sub_sections", []):
                mapping[section["slug"]].append(sub_section["slug"])
                recursive_collect(sub_section)

        for section in self.sections:
            recursive_collect(section)

        return mapping

    def get_section_influences(self, has_title: bool = False) -> dict:
        sections_dependency_map = build_section_dependency_map(self.sections)
        intermediate_dependency_map = merge_dependency_maps(sections_dependency_map, self.shared_memory)
        sections_dependencies = merge_dependency_maps(intermediate_dependency_map, self.sub_sections_map)

        if not has_title:
            sections_dependencies.pop("title", None)

        result = build_section_influences(sections_dependencies)

        return result

    def display_name_on_plan_overview(self) -> str:
        return get_display_name_on_plan_overview(self.sections)


class SuggestionType(models.TextChoices):
    AGENT = "agent"
    RESOURCE = "resource"
    SOURCE = "source"


class Suggestion(BaseModel):
    user = models.ForeignKey(User, verbose_name="User", on_delete=models.CASCADE)
    suggest_type = models.CharField("Suggest Type", max_length=30, choices=SuggestionType.choices)
    description = models.TextField("Description")


class Tool(BaseModel):
    name = models.TextField(unique=True)
    description = models.TextField()
    source = models.CharField(max_length=10, choices=ToolSourceEnum.get_valid_choices())
    args = models.JSONField(default=list)
    path = models.TextField(blank=True, null=True)
    method = models.CharField(
        max_length=10, blank=True, null=True, choices=HttpRequestMethod.get_valid_choices()
    )
    result_bibliography_type = models.CharField(
        max_length=30, blank=True, null=True, choices=BibliographyType.choices
    )

    def __str__(self):
        return self.name


class TemplateAgent(BaseModel):
    icon = models.CharField(blank=True, null=True)
    tools = models.ManyToManyField(Tool, blank=True)
    resources = models.JSONField(blank=True, default=list)
    toggleable = models.BooleanField()
    description = models.TextField(blank=True)
    display_name = models.CharField(max_length=255)
    checked_by_default = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=999)

    def __str__(self):
        return self.display_name

    class Meta:
        ordering = ["display_order"]

    @property
    def agents(self) -> list:
        return [str(tool.name) for tool in self.tools.all()]

    def clean(self):
        if not isinstance(self.resources, list):
            raise ValidationError("Field 'resources' must be a list")
        return super().clean()


class ToolPromptInstruction(BaseModel):
    name = models.ForeignKey(Tool, on_delete=models.CASCADE)
    instruction = models.TextField()

    def __str__(self):
        return self.name.name


class ToolPromptInstructionGroup(BaseModel):
    name = models.TextField(unique=True)
    tool_instructions = models.ManyToManyField(ToolPromptInstruction, related_name="groups")
    empty_state = models.TextField(blank=True, null=True)
    names_placeholder = models.TextField(blank=True, null=True)
    instructions_placeholder = models.TextField(blank=True, null=True)

    def __str__(self):
        return self.name


class MCPServer(BaseModel):
    name = models.TextField("Name")
    url = models.URLField("URL")
    api_key = models.TextField("API Key", blank=True)
    last_sync = models.DateTimeField("Last Sync", null=True, blank=True)
    tools = models.ManyToManyField(Tool, verbose_name="Tools", related_name="+", blank=True)

    def __str__(self):
        return self.name

    def delete(self, *args, **kwargs):
        # Delete all associated tools before deleting the server
        self.tools.all().delete()
        super().delete()
