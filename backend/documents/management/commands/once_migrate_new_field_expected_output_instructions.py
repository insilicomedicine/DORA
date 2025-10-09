from typing import Any, Dict, List

from django.core.management.base import BaseCommand

from documents.models import Document
from kernel.models import Template


class Command(BaseCommand):
    help = (
        "Migrate new field expected_output_instructions "
        "from live templates to deleted templates and existing documents"
    )

    def handle(self, *args, **options):
        self.migrate_deleted_templates()
        self.migrate_documents()
        self.migrate_sections()

    def migrate_deleted_templates(self):
        active_templates_json_map = {
            f"{template.template_json['name']} - {template.template_json['type']}": template.template_json
            for template in Template.objects.all()
        }

        deleted_templates = Template.all_objects.exclude(deleted_at=None)

        for template in deleted_templates:
            template_json = template.template_json
            template_key = f"{template.template_json['name']} - {template.template_json['type']}"
            active_template_json = active_templates_json_map.get(template_key)

            if active_template_json:
                self._sync_sections(
                    active_template_json.get("sections", []), template_json.get("sections", [])
                )
                template.save()
                print(f"Updated template: {template_key}")
            else:
                print(f"Template {template.id} not found: {template_key}")

    def migrate_documents(self):
        templates_json_map = {
            str(template.id): template.template_json for template in Template.all_objects.all()
        }

        for document in Document.objects.all():
            template_json = templates_json_map.get(str(document.template_id))

            if template_json:
                self._sync_sections(
                    template_json.get("sections", []), document.template_json.get("sections", [])
                )
                document.save()
                print(f"Updated document: {document.id}")
            else:
                raise Exception(f"Document template not found: {document.id}")

    def migrate_sections(self):
        for document in Document.objects.all():
            template_sections_map = {
                section["slug"]: section for section in document.template_json.get("sections", [])
            }

            for section in document.sections.all():
                if not section.slug:
                    continue

                section_json = template_sections_map.get(section.slug)

                if section_json:
                    section.prompt = section_json["prompt"]
                    section.save()
                    print(f"Updated section: {section.id}")
                else:
                    print(f"Section not found: {section.id}")

    def _sync_sections(self, new_sections: List[Dict[str, Any]], sections):
        new_sections_map = {section["slug"]: section for section in new_sections}

        for section in sections:
            new_section = new_sections_map.get(section["slug"])

            if new_section:
                section["expected_output_instructions"] = new_section.get("expected_output_instructions", "")
                section["prompt"] = new_section["prompt"]

                if section.get("sub_sections"):
                    self._sync_sections(new_section.get("sub_sections", []), section.get("sub_sections"))
            else:
                print(f"Section not found: {section['slug']}")
