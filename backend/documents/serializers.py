import json
from json import JSONDecodeError
from typing import Any, Dict, List

import sentry_sdk
from django.conf import settings
from django.db import transaction
from rest_framework import exceptions, serializers

from documents.defs import DEFAULT_DOCUMENT_TITLE, SearchResourceType
from documents.document_export.defs import ExportFormatType
from documents.models import (
    DiagramType,
    Document,
    DocumentStatus,
    Feedback,
    MermaidDiagram,
    Section,
    SectionStatus,
)
from documents.utils import replace_multiple_values
from dwh.metadata.postprocessing import get_bib_id_chunk_id_list
from kernel.defs import AIActionType
from kernel.diagrams.utils import gen_pako_link
from kernel.llm_agent_tools.defs import (
    MAX_EXECUTION_COUNT_REACHED_MESSAGE,
    MAX_EXECUTION_COUNT_REACHED_MESSAGE_DISPLAY,
)
from kernel.models import Template
from users.defs import LIMITED_DOCUMENT_MESSAGE, PlanEnum, get_default_publication_settings
from users.utils import can_edit, get_user_documents_count, get_user_plan, is_internal_user


class DocumentSettingsSerializer(serializers.Serializer):
    user_inputs = serializers.DictField(required=False)
    custom_data = serializers.DictField(
        required=False,
        help_text=('Example: "{ "section1": "user custom_data2", "section2": "user custom_data2" }'),
    )
    custom_subsections = serializers.DictField(
        required=False,
        help_text=(
            'Example: "{ "section1": [ {"title": "custom subsection", "content": "subsection content"} ] }'
        ),
    )
    agents = serializers.DictField(
        required=False,
        help_text=(
            'Example: "{ "pubmed_search": { "resources": ["pmc"] },"websearch": { "resources": ["google"] } }'
        ),
    )
    plan = serializers.CharField(required=False, allow_blank=True)
    custom_bibliography_file_pks = serializers.ListField(child=serializers.CharField(), required=False)

    def __init__(self, *args, **kwargs):
        self.template = kwargs.pop("template", None)
        super().__init__(*args, **kwargs)

    def validate(self, attrs):
        if self.template:
            user_inputs = attrs.get("user_inputs", {})
            tpl_user_inputs = self.template.template_json["user_inputs"]
            tpl_user_inputs_slugs = [user_input.get("slug") for user_input in tpl_user_inputs]
            for input_key in user_inputs.keys():
                if input_key not in tpl_user_inputs_slugs:
                    raise serializers.ValidationError(f"Invalid input: {input_key}")

            flat_sections_map = {section["slug"]: section for section in self.template.flat_sections}
            custom_data = attrs.get("custom_data", {})
            for custom_data_key in custom_data.keys():
                if custom_data_key not in flat_sections_map:
                    raise serializers.ValidationError(f"Invalid custom data: {custom_data_key}")

            for custom_subsection_key, custom_subsections in attrs.get("custom_subsections", {}).items():
                if custom_subsection_key not in flat_sections_map:
                    raise serializers.ValidationError(f"Invalid custom subsection: {custom_subsection_key}")

                for custom_subsection in custom_subsections:
                    if not custom_subsection.get("title") or not custom_subsection.get("content"):
                        raise serializers.ValidationError(
                            "Invalid custom subsection: title and content are required"
                        )

        return super().validate(attrs)


class DocumentCreateSerializer(serializers.Serializer):
    template_id = serializers.CharField()
    settings = DocumentSettingsSerializer()

    def validate(self, attrs):
        template_id = attrs["template_id"]
        template = Template.objects.filter(id=template_id).first()
        if not template:
            raise serializers.ValidationError("Template not found")

        settings_serializer = DocumentSettingsSerializer(data=attrs["settings"], template=template)
        settings_serializer.is_valid(raise_exception=True)

        return super().validate(attrs)

    def create(self, validated_data):
        template = Template.objects.get(id=validated_data["template_id"])

        validated_data["title"] = template.template_json["name"] or DEFAULT_DOCUMENT_TITLE
        validated_data["created_by"] = self.context["request"].user
        validated_data["template_json"] = template.template_json
        with transaction.atomic():
            document = Document.objects.create(**validated_data)
            document.create_sections()
        return document

    def to_representation(self, instance):
        return {"id": instance.id}


class DocumentUpdateSerializer(serializers.ModelSerializer):
    settings = DocumentSettingsSerializer()

    class Meta:
        model = Document
        fields = ["title", "settings"]

    def validate(self, attrs):
        if not self.instance:
            raise serializers.ValidationError("Document instance is required for validation")

        if settings_data := attrs.get("settings"):
            settings_serializer = DocumentSettingsSerializer(
                data=settings_data, template=self.instance.template
            )
            settings_serializer.is_valid(raise_exception=True)

        user = self.context["request"].user
        if attrs.get("title") and not can_edit(user):
            raise serializers.ValidationError(LIMITED_DOCUMENT_MESSAGE)
        return super().validate(attrs)


class DocumentListSerializer(serializers.ModelSerializer):
    sections = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "template_id",
            "id",
            "title",
            "stage",
            "status",
            "template_name",
            "template_type",
            "created_at",
            "updated_at",
            "sections",
        ]

    def get_sections(self, document: Document) -> List[Dict[str, Any]]:
        request = self.context.get("request")

        if hasattr(request, "sections_by_doc"):
            return request.sections_by_doc.get(document.id, [])

        return []


class DocumentGeneratePlanSerializer(serializers.Serializer):
    settings = DocumentSettingsSerializer()

    def validate(self, attrs):
        doc_settings = attrs["settings"]
        document: Document = self.context["document"]

        user_inputs = doc_settings.get("user_inputs", {})

        tpl_user_inputs = document.template_json["user_inputs"]
        for tpl_input in tpl_user_inputs:
            if tpl_input["slug"] not in user_inputs:
                raise serializers.ValidationError({"settings": f"Missing user_input: {tpl_input['slug']}"})

        for key, value in user_inputs.items():
            if not value:
                raise serializers.ValidationError({"settings": f"Invalid user_input: {key}"})

        return super().validate(attrs)


class DocumentGenerateSerializer(DocumentGeneratePlanSerializer):
    def validate(self, attrs):
        super().validate(attrs)

        document = self.context["document"]
        user = self.context["request"].user

        doc_settings = attrs["settings"]
        plan = doc_settings.get("plan")

        if not plan:
            raise serializers.ValidationError({"plan": "Plan is required"})

        if document.status == DocumentStatus.IN_PROGRESS:
            raise serializers.ValidationError("Document generation is already in progress")
        elif document.status == DocumentStatus.COMPLETED:
            raise serializers.ValidationError("Document generation is already completed")

        if (
            get_user_documents_count(user, status=DocumentStatus.IN_PROGRESS)
            >= settings.MAXIMUM_CONCURRENT_DOCUMENTS_PER_USER
        ):
            raise serializers.ValidationError(
                "Maximum concurrent documents reached: please wait until "
                "some of your current generations complete before starting a new one."
            )

        if not is_internal_user(user):
            user_plan = get_user_plan(user)
            if (
                user_plan["type"] in [PlanEnum.FREE_TRIAL.value.type, PlanEnum.ADVANCED.value.type]
                and user_plan["remaining_documents"] is not None
                and user_plan["remaining_documents"] <= 0
            ):
                raise exceptions.PermissionDenied(f"You have reached your {user_plan['name']} plan's limit")

        return attrs


class SectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = [
            "id",
            "slug",
            "title",
            "status",
            "plan",
            "requires_plan",
            "custom_data",
            "result",
            "sub_sections",
            "is_edited",
            "refined_result",
            "like",
            "display_on_plan_overview",
            "display_name_on_plan_overview",
        ]

    def get_fields(self):
        fields = super().get_fields()
        fields["sub_sections"] = SectionSerializer(many=True, source="get_sub_sections")
        return fields

    def to_representation(self, instance: Section):
        section = super().to_representation(instance)
        tool_display_names = instance.document.template_json.get("tool_display_names")

        if tool_display_names:
            if isinstance(section.get("result"), dict):
                if result_data := section["result"].get("data"):
                    section["result"]["data"] = replace_multiple_values(tool_display_names, result_data)

            if plan := section.get("plan"):
                section["plan"] = replace_multiple_values(tool_display_names, plan)

        return section


class MermaidDiagramSerializer(serializers.ModelSerializer):
    mermaid_editor_link = serializers.SerializerMethodField()

    class Meta:
        model = MermaidDiagram
        fields = ["id", "svg_diagram", "diagram_type", "mermaid_editor_link"]

    def get_mermaid_editor_link(self, diagram: MermaidDiagram):
        return gen_pako_link(diagram.mermaid_code)


class DocumentDetailSerializer(DocumentListSerializer):
    sections = SectionSerializer(many=True, source="get_sections")
    bibliographies = serializers.ListField(source="get_bibliographies")
    custom_bibliographies = serializers.ListField(source="get_custom_bibliographies")
    filled_user_inputs = serializers.SerializerMethodField()
    mermaid_diagram = MermaidDiagramSerializer()
    section_influences = serializers.DictField(source="get_section_influences")
    display_name_on_plan_overview = serializers.CharField()
    publication_settings = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "settings",
            "stage",
            "status",
            "sections",
            "template_id",
            "template_name",
            "estimated_document_generation_minutes",
            "bibliographies",
            "like",
            "publication_settings",
            "created_at",
            "updated_at",
            "template_type",
            "custom_bibliographies",
            "filled_user_inputs",
            "mermaid_diagram",
            "section_influences",
            "display_name_on_plan_overview",
        ]

    def get_filled_user_inputs(self, document: Document):
        template_user_inputs = document.template_json.get("user_inputs", [])
        filled_user_inputs = []
        user_inputs = document.settings.get("user_inputs", {})
        for user_input in template_user_inputs:
            value = user_inputs.get(user_input["slug"], "")
            try:
                user_input["value"] = value.format(**user_inputs)
            except KeyError:
                user_input["value"] = value

            filled_user_inputs.append(user_input)
        return filled_user_inputs

    def get_publication_settings(self, document: Document):
        return {
            key: value
            for key, value in document.publication_settings.items()
            if key in get_default_publication_settings()
        }


class DocumentExportSerializer(serializers.Serializer):
    document_id = serializers.UUIDField()
    format = serializers.ChoiceField(choices=ExportFormatType.FORMAT_CHOICES)

    def validate(self, attrs):
        user = self.context["request"].user
        if not can_edit(user):
            raise serializers.ValidationError(LIMITED_DOCUMENT_MESSAGE)
        return super().validate(attrs)


class SectionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = ["id", "parent", "title", "result"]

    def create(self, validated_data):
        parent: Section = validated_data["parent"]
        validated_data["document"] = parent.document
        validated_data["status"] = SectionStatus.COMPLETED
        return super().create(validated_data)


class SectionUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = ["title", "custom_data", "plan", "result", "is_edited"]

    def validate(self, attrs):
        user = self.context["request"].user
        if ("title" in attrs or "result" in attrs) and not can_edit(user):
            raise serializers.ValidationError(LIMITED_DOCUMENT_MESSAGE)
        return super().validate(attrs)

    def update(self, instance, validated_data):
        old_result = instance.result or {}
        old_result_data = old_result.get("data", "")

        result = super().update(instance, validated_data)

        # remove unused bibliographies when updating section result
        if "result" in validated_data and old_result_data != validated_data["result"].get("data", ""):
            new_result_content = validated_data["result"].get("data", "")
            old_bib_id_chunk_id_list = get_bib_id_chunk_id_list(old_result_data)
            new_bib_id_chunk_id_list = get_bib_id_chunk_id_list(new_result_content)
            if set(old_bib_id_chunk_id_list) != set(new_bib_id_chunk_id_list):
                instance.document.refresh_bibliographies()

        return result


class FindReferencesSerializer(serializers.Serializer):
    query = serializers.CharField(max_length=1000)
    search_resource_type = serializers.ChoiceField(choices=SearchResourceType.get_choices())

    def validate(self, attrs):
        user = self.context["request"].user
        if not can_edit(user):
            raise serializers.ValidationError(LIMITED_DOCUMENT_MESSAGE)
        return super().validate(attrs)


class FindCitationsSerializer(serializers.Serializer):
    query = serializers.CharField(max_length=1000)
    search_resource_type = serializers.ChoiceField(choices=SearchResourceType.get_choices())

    def validate(self, attrs):
        user = self.context["request"].user
        if not can_edit(user):
            raise serializers.ValidationError(LIMITED_DOCUMENT_MESSAGE)
        return super().validate(attrs)


class AIActionMetadataSerializer(serializers.Serializer):
    BIB_ID = serializers.CharField()
    CHUNK_ID = serializers.CharField()
    text_chunk = serializers.CharField()


class AIActionsSerializer(serializers.Serializer):
    document_id = serializers.UUIDField()
    action_type = serializers.ChoiceField(choices=AIActionType.TYPE_CHOICES)
    text = serializers.CharField()
    text_context = serializers.CharField()
    metadata = AIActionMetadataSerializer(many=True)
    custom_prompt = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate(self, attrs):
        user = self.context["request"].user
        if not can_edit(user):
            raise serializers.ValidationError(LIMITED_DOCUMENT_MESSAGE)

        if attrs["action_type"] == AIActionType.CUSTOM_PROMPT and not attrs.get("custom_prompt"):
            raise serializers.ValidationError(
                {"custom_prompt": "The 'custom_prompt' field is required for custom prompt action type"}
            )
        elif attrs["action_type"] != AIActionType.CUSTOM_PROMPT and attrs.get("custom_prompt"):
            raise serializers.ValidationError(
                {"custom_prompt": "The 'custom_prompt' field is not allowed for this action type"}
            )

        return super().validate(attrs)


class SectionApplyRefinementSerializer(serializers.Serializer):
    ACTION_KEEP_ORIGINAL = "keep_original"
    ACTION_APPLY_REFINED = "apply_refined"
    ACTION_CHOICES = ((ACTION_KEEP_ORIGINAL, "Keep Original"), (ACTION_APPLY_REFINED, "Apply Refined"))

    action = serializers.ChoiceField(choices=ACTION_CHOICES)


class FeedbackSerializer(serializers.Serializer):
    document_id = serializers.UUIDField()
    section_id = serializers.CharField(required=False)
    like = serializers.BooleanField(required=False)
    detail = serializers.CharField(required=False, max_length=10000)

    class Meta:
        model = Feedback
        fields = ["document_id", "section_id", "like", "detail"]

    def validate(self, attrs):
        if attrs.get("like") is None and not attrs.get("detail"):
            raise serializers.ValidationError("Either 'like' or 'detail' is required.")

        if not Document.objects.filter(id=attrs["document_id"]).exists():
            raise serializers.ValidationError("Document not found.")

        if attrs.get("section_id") and not Section.objects.filter(id=attrs["section_id"]).exists():
            raise serializers.ValidationError("Section not found.")

        return super().validate(attrs)

    def create(self, validated_data):
        request = self.context["request"]
        user = request.user
        document_id = validated_data["document_id"]
        section_id = validated_data.get("section_id")

        feedback_fields = (
            {
                "like": validated_data["like"],
            }
            if validated_data.get("like") is not None
            else {
                "detail": validated_data["detail"],
            }
        )

        feedback = Feedback.objects.create(
            user=user,
            document_id=document_id,
            section_id=section_id,
            **feedback_fields,
        )
        return feedback


class AgentLogsSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Section
        fields = [
            "id",
            "title",
            "status",
            "generation_log",
        ]

    def get_fields(self):
        fields = super().get_fields()
        fields["sub_sections"] = AgentLogsSectionSerializer(many=True, source="get_sub_sections")
        return fields

    @staticmethod
    def _update_agents_result(section: dict):
        if agents_result := section.get("generation_log", {}).get("agents_result"):
            if len(agents_result) and "hashid" in agents_result[0]:
                agents_result = list({record["hashid"]: record for record in agents_result}.values())
                section["generation_log"]["agents_result"] = agents_result

    def to_representation(self, instance: Section):
        section = super().to_representation(instance)
        tool_display_names = instance.document.template_json.get("tool_display_names")

        if tool_display_names:
            if generation_log := section.get("generation_log"):
                try:
                    tool_max_execution_messages = {
                        MAX_EXECUTION_COUNT_REACHED_MESSAGE.format(
                            tool_name=tool_key
                        ): MAX_EXECUTION_COUNT_REACHED_MESSAGE_DISPLAY
                        for tool_key in tool_display_names.keys()
                    }
                    generation_log = replace_multiple_values(
                        tool_max_execution_messages, json.dumps(generation_log)
                    )
                    generation_log = replace_multiple_values(tool_display_names, generation_log)
                    generation_log = json.loads(generation_log)
                except JSONDecodeError as exc:
                    sentry_sdk.capture_exception(exc)

                section["generation_log"] = generation_log

        self._update_agents_result(section)
        return section


class TransparencyRetrieveSerializer(serializers.ModelSerializer):
    master = serializers.SerializerMethodField()
    agent_logs_by_sections = AgentLogsSectionSerializer(
        many=True, source="get_sections_ordered_by_generation_plan"
    )

    class Meta:
        model = Document
        fields = [
            "title",
            "stage",
            "status",
            "template_name",
            "master",
            "agent_logs_by_sections",
        ]

    def get_master(self, document: Document):
        return {
            "title": "Master Agent",
            "messages": document.generation_log.get("agents_result", []),
        }


class MermaidDiagramUpdateSerializer(serializers.Serializer):
    diagram_type = serializers.ChoiceField(choices=DiagramType.choices)

    def validate(self, attrs):
        user = self.context["request"].user
        if not can_edit(user):
            raise serializers.ValidationError(LIMITED_DOCUMENT_MESSAGE)
        return super().validate(attrs)
