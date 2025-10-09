from django.contrib import admin
from django.contrib.auth.models import User
from django.db.models import JSONField
from django.template.defaultfilters import truncatechars
from django.urls import reverse
from django.utils.html import format_html
from django_json_widget.widgets import JSONEditorWidget

from documents.models import Document, Feedback, Section
from users.defs import INTERNAL_GROUP_NAME


class SectionInline(admin.StackedInline):
    model = Section
    can_delete = False
    fields = ["section_detail_link", "status", "generation_log"]
    readonly_fields = ["section_detail_link", "status", "generation_log"]
    extra = 0

    def section_detail_link(self, obj: Section) -> str:
        url = reverse("admin:documents_section_change", args=[obj.id])
        return format_html('<a href="{}">{}</a>', url, obj.title)

    section_detail_link.short_description = "Section Details"


class DocumentAdmin(admin.ModelAdmin):
    formfield_overrides = {
        JSONField: {"widget": JSONEditorWidget},
    }
    list_display = ["id", "title", "stage", "status", "created_by", "created_at"]
    list_filter = ["stage", "status", "created_by"]
    exclude = ["deleted_at"]
    inlines = [SectionInline]


class SectionAdmin(admin.ModelAdmin):
    formfield_overrides = {
        JSONField: {"widget": JSONEditorWidget},
    }
    list_display = ["id", "document_id", "title", "status", "created_at"]
    exclude = ["deleted_at"]


class FeedbackTemplateListFilterBase(admin.SimpleListFilter):
    template_field = None

    def lookups(self, request, model_admin):
        feedback_doc_ids = self._get_feedback_doc_ids()
        tpl_field_values = list(
            set(
                [
                    tpl_json.get(self.template_field)
                    for tpl_json in Document.objects.filter(id__in=feedback_doc_ids).values_list(
                        "template_json", flat=True
                    )
                ]
            )
        )
        return [(tpl_field_value, tpl_field_value) for tpl_field_value in tpl_field_values]

    def queryset(self, request, queryset):
        value = self.value()
        if value is not None:
            feedback_doc_ids = self._get_feedback_doc_ids()
            filters = {
                "id__in": feedback_doc_ids,
                f"template_json__{self.template_field}": value,
            }
            filter_doc_ids = list(set(Document.objects.filter(**filters).values_list("id", flat=True)))
            return queryset.filter(document_id__in=filter_doc_ids)
        return queryset

    def _get_feedback_doc_ids(self):
        return list(set(Feedback.objects.values_list("document_id", flat=True)))


class FeedbackTemplateNameListFilter(FeedbackTemplateListFilterBase):
    title = "Template Name"
    parameter_name = "template_name"
    template_field = "name"


class FeedbackTemplateTypeListFilter(FeedbackTemplateListFilterBase):
    title = "Template Type"
    parameter_name = "template_type"
    template_field = "type"


class FeedbackIsInternalListFilter(admin.SimpleListFilter):
    title = "Is Internal"
    parameter_name = "is_internal"

    def lookups(self, request, model_admin):
        return [("yes", "Yes"), ("no", "No")]

    def queryset(self, request, queryset):
        value = self.value()
        if value is not None:
            internal_users = User.objects.filter(groups__name=INTERNAL_GROUP_NAME).only("id")
            is_internal = value == "yes"
            return (
                queryset.filter(user__in=internal_users)
                if is_internal
                else queryset.exclude(user__in=internal_users)
            )
        return queryset


class FeedbackAdmin(admin.ModelAdmin):
    list_display = [
        "document_id",
        "user",
        "template_name",
        "template_type",
        "type",
        "document",
        "section",
        "like",
        "short_detail",
        "created_at",
    ]
    list_display_links = ["short_detail"]
    list_filter = [
        "document_id",
        FeedbackTemplateNameListFilter,
        FeedbackTemplateTypeListFilter,
        FeedbackIsInternalListFilter,
    ]
    exclude = ["deleted_at"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    @admin.display(description="detail")
    def short_detail(self, obj: Feedback) -> str:
        return truncatechars(obj.detail, 100) if obj.detail else ""

    def template_name(self, obj: Feedback) -> str:
        template = obj.document.template
        if template and template.deleted_at is None:
            url = reverse("admin:kernel_template_change", args=[template.id])
            return format_html('<a href="{}">{}</a>', url, obj.document.template_name)
        else:
            return obj.document.template_name

    def template_type(self, obj: Feedback) -> str:
        return obj.document.template_type

    def document(self, obj: Feedback) -> str:
        url = reverse("admin:documents_document_change", args=[obj.document.id])
        return format_html('<a href="{}">{}</a>', url, obj.document)

    def section(self, obj: Feedback) -> str:
        section = obj.section
        if not section:
            return None
        url = reverse("admin:documents_section_change", args=[section.id])
        return format_html('<a href="{}">{}</a>', url, section)

    def type(self, obj: Feedback) -> str:
        return "document" if obj.section_id is None else "section"

    type.admin_order_field = "-section_id"


admin.site.register(Document, DocumentAdmin)
admin.site.register(Section, SectionAdmin)
admin.site.register(Feedback, FeedbackAdmin)
