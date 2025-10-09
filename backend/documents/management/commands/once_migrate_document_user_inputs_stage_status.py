from django.core.management.base import BaseCommand

from documents.models import Document, DocumentStage, DocumentStatus


class Command(BaseCommand):
    help = "Migrate document user_inputs, stage, status"

    def handle(self, *args, **options):
        documents = Document.objects.all()
        for document in documents:
            attrs = {}
            doc_settings = document.settings
            tpl_user_inputs = document.template_json.get("user_inputs", {})
            tpl_user_inputs_slugs = [tpl_input.get("slug") for tpl_input in tpl_user_inputs]

            user_inputs_data = {
                key: doc_settings.pop(key) for key in list(doc_settings) if key in tpl_user_inputs_slugs
            }
            doc_settings["user_inputs"] = user_inputs_data
            attrs["settings"] = doc_settings

            if document.stage in [
                "section_generating",
                "section_generated",
                "plan_generating",
                "plan_generated",
            ]:
                attrs["stage"] = DocumentStage.DRAFT
                attrs["status"] = DocumentStatus.INITIALIZED

            section = next(
                (section for section in document.sections.all() if section.display_on_plan_overview), None
            )
            if section and section.plan:
                attrs["settings"]["plan"] = section.plan

            document.update_fields(attrs)
