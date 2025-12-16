import json
import zipfile
from collections import defaultdict
from io import BytesIO

import sentry_sdk
from django import forms
from django.contrib import admin, messages
from django.core.files.uploadedfile import InMemoryUploadedFile
from django.db.models import JSONField
from django.http import HttpResponse
from django_json_widget.widgets import JSONEditorWidget

from kernel.llm_agent_tools.helpers.mcp_client import sync_mcp_server_tools
from kernel.models import (
    MCPServer,
    Suggestion,
    Template,
    TemplateAgent,
    Tool,
    ToolPromptInstruction,
    ToolPromptInstructionGroup,
)
from kernel.serializers import TemplateSerializer, ToolArgSerializer


class AddTemplateForm(forms.ModelForm):
    class Meta:
        model = Template
        fields = ["template_file"]

    def clean(self):
        super().clean()

        template_file: InMemoryUploadedFile = self.cleaned_data["template_file"]
        if template_file.content_type != "application/json":
            self.add_error("template_file", "Invalid file type. Only JSON files are allowed.")
            return

        try:
            template_json = json.load(template_file)
        except json.JSONDecodeError:
            self.add_error("template_file", "Invalid JSON file.")
            return

        serializer = TemplateSerializer(data=template_json)
        if not serializer.is_valid():
            self.add_error("template_file", json.dumps(serializer.errors))
            return

        self.cleaned_data["template_json"] = template_json
        return self.cleaned_data

    def save(self, commit=True):
        self.instance.template_json = self.cleaned_data["template_json"]
        return super().save(commit)


class ChangeTemplateForm(forms.ModelForm):
    class Meta:
        model = Template
        fields = "__all__"

    def clean(self):
        serializer = TemplateSerializer(data=self.cleaned_data["template_json"])
        if not serializer.is_valid():
            self.add_error("template_json", json.dumps(serializer.errors))
            return

        return super().clean()


class ToolForm(forms.ModelForm):
    class Meta:
        model = Tool
        fields = "__all__"

    def clean_args(self):
        args_data = self.cleaned_data.get("args")

        if not args_data:
            return args_data

        if isinstance(args_data, str):
            try:
                args_data = json.loads(args_data)
            except json.JSONDecodeError as e:
                raise forms.ValidationError(f"Invalid JSON format: {e}")

        if not isinstance(args_data, list):
            raise forms.ValidationError(f"Args must be a list, got {type(args_data).__name__}")

        for i, arg in enumerate(args_data):
            if not isinstance(arg, dict):
                raise forms.ValidationError(
                    f"Argument at index {i} must be a dictionary, got {type(arg).__name__}"
                )

            serializer = ToolArgSerializer(data=arg)
            if not serializer.is_valid():
                error_details = []
                for field, errors in serializer.errors.items():
                    error_details.append(f"{field}: {', '.join(errors)}")
                raise forms.ValidationError(f"Invalid argument at index {i}: {'; '.join(error_details)}")

        return args_data


class TemplateAdmin(admin.ModelAdmin):
    formfield_overrides = {
        JSONField: {"widget": JSONEditorWidget},
    }
    list_display = [
        "name",
        "type",
        "is_online",
        "free_trial",
        "created_by",
        "created_at",
        "updated_at",
        "display_order",
    ]
    list_filter = ["is_online"]
    exclude = ["created_by", "deleted_at"]
    actions = ["export_templates"]
    list_editable = ["display_order"]

    def get_form(self, request, obj=None, **kwargs):
        defaults = {}
        if obj is None:
            defaults["form"] = AddTemplateForm
        else:
            defaults["form"] = ChangeTemplateForm
        defaults.update(kwargs)
        return super().get_form(request, obj, **defaults)

    def save_model(self, request, obj, form, change):
        if obj._state.adding:
            obj.created_by = request.user

        super().save_model(request, obj, form, change)

    @admin.action(description="Export selected templates")
    def export_templates(self, request, queryset):
        buffer = BytesIO()
        name_count = defaultdict(int)

        with zipfile.ZipFile(buffer, "w") as zip_file:
            for template in queryset:
                if name_count[template.name]:
                    json_filename = f"{template.name} ({name_count[template.name]}).json"
                else:
                    json_filename = f"{template.name}.json"

                json_data = json.dumps(template.template_json, indent=4)
                zip_file.writestr(json_filename, json_data)

                name_count[template.name] += 1

        buffer.seek(0)
        response = HttpResponse(buffer, content_type="application/zip")
        response["Content-Disposition"] = "attachment; filename=templates.zip"
        return response


class SuggestionAdmin(admin.ModelAdmin):
    list_display = ["id", "suggest_type", "description", "created_at"]


class ToolAdmin(admin.ModelAdmin):
    form = ToolForm
    list_display = [
        "name",
        "description",
        "source",
        "args",
        "path",
        "method",
    ]

    exclude = ["created_by", "deleted_at"]

    def get_form(self, request, obj=None, **kwargs):
        self.obj = obj
        return super().get_form(request, obj, **kwargs)

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        formfield = super().formfield_for_dbfield(db_field, request, **kwargs)
        if hasattr(self, "obj") and self.obj and self.obj.source == "mcp":
            formfield.disabled = True
            if hasattr(formfield.widget, "can_add_related"):
                formfield.widget.can_add_related = False
                formfield.widget.can_change_related = False
                formfield.widget.can_delete_related = False

        return formfield


class TemplateAgentAdmin(admin.ModelAdmin):
    list_display = [
        "display_name",
        "icon",
        "description",
        "display_tools",
        "display_resources",
        "toggleable",
        "checked_by_default",
        "display_order",
    ]
    exclude = ["created_by", "deleted_at"]

    def display_tools(self, obj):
        return ", ".join([tool.name for tool in obj.tools.all()])

    def display_resources(self, obj):
        if not obj.resources:
            return "-"
        resources = []
        for resource in obj.resources:
            if isinstance(resource, dict) and resource.get("display_name"):
                resources.append(f"- {resource['display_name']}")
        return "\n".join(resources)

    display_tools.short_description = "Tools"
    display_resources.short_description = "Resources"


class ToolPromptInstructionAdmin(admin.ModelAdmin):
    list_display = ["name", "instruction"]
    exclude = ["created_by", "deleted_at"]


class ToolPromptInstructionGroupAdmin(admin.ModelAdmin):
    list_display = [
        "name",
        "display_tools",
        "empty_state",
        "names_placeholder",
        "instructions_placeholder",
    ]
    exclude = ["created_by", "deleted_at"]

    def display_tools(self, obj):
        return ", ".join([tool.name.name for tool in obj.tool_instructions.all()])

    display_tools.short_description = "Tools"


class MCPServerAdmin(admin.ModelAdmin):
    def formfield_for_dbfield(self, db_field, request, **kwargs):
        formfield = super().formfield_for_dbfield(db_field, request, **kwargs)
        if db_field.name == "tools":
            formfield.disabled = True
            formfield.widget.can_add_related = False
            formfield.widget.can_change_related = False
            formfield.widget.can_delete_related = False
        return formfield

    list_display = ["name", "url", "last_sync"]
    exclude = ["created_by", "deleted_at"]
    search_fields = ["name", "url"]
    actions = ["sync_tools"]

    @admin.action(description="Sync tools from MCP server")
    def sync_tools(self, request, queryset):
        for server in queryset:
            try:
                sync_mcp_server_tools(server)
                messages.success(request, f"Successfully synced tools from {server.name}")
            except Exception as e:
                sentry_sdk.capture_exception(e)
                messages.error(request, f"Failed to sync tools from {server.name}: {str(e)}")


admin.site.register(Template, TemplateAdmin)
admin.site.register(Suggestion, SuggestionAdmin)
admin.site.register(Tool, ToolAdmin)
admin.site.register(TemplateAgent, TemplateAgentAdmin)
admin.site.register(ToolPromptInstruction, ToolPromptInstructionAdmin)
admin.site.register(ToolPromptInstructionGroup, ToolPromptInstructionGroupAdmin)
admin.site.register(MCPServer, MCPServerAdmin)
