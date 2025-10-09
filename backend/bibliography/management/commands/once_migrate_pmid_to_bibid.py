import json

from django.core.management.base import BaseCommand

from documents.models import Document, Section
from general.models import Config
from kernel.models import Template


class Command(BaseCommand):
    help = "Migrate PMID to BIBID once"

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS("Starting migration from PMID to BIBID..."))

        self.migrate_templates()
        self.migrate_documents()
        self.migrate_sections()
        self.migrate_configs()

        self.stdout.write(self.style.SUCCESS("Migration completed successfully."))

    def migrate_templates(self):
        templates = Template.objects.all()
        for template in templates:
            self.migrate_json_field(template, "template_json", template.id, "Template")

    def migrate_documents(self):
        documents = Document.objects.all()
        for document in documents:
            self.migrate_json_field(document, "template_json", document.id, "Document")

    def migrate_sections(self):
        sections = Section.objects.all()
        for section in sections:
            if section.prompt and "PMID" in section.prompt:
                section.prompt = section.prompt.replace("PMID", "BIB_ID")
                section.save()
                self.stdout.write(self.style.SUCCESS(f"Section {section.id} migrated successfully."))

    def migrate_configs(self):
        configs = Config.objects.all()
        for config in configs:
            self.migrate_json_field(config, "value", config.id, "Config")

    def migrate_json_field(self, instance, field_name, instance_id, instance_type):
        field_value = getattr(instance, field_name)
        field_json_string = json.dumps(field_value)
        if "PMID" in field_json_string:
            field_json_string = field_json_string.replace("PMID", "BIB_ID")
            setattr(instance, field_name, json.loads(field_json_string))
            instance.save()
            self.stdout.write(self.style.SUCCESS(f"{instance_type} {instance_id} migrated successfully."))
