import json

from django.core.management.base import BaseCommand, CommandParser

from kernel.models import Template


class Command(BaseCommand):
    help = "Migrate new field expected_output_instructions from template files to all templates"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("file_path", type=str, help="Path to the file with expected_output_instructions")

    def handle(self, *args, **options):
        file_path = options["file_path"]
        with open(file_path, "r") as file:
            template_sections_map = json.load(file)

        # validation
        for template in Template.objects.all():
            template_json = template.template_json
            template_key = f"{template.template_json['name']}_{template.template_json['type']}"

            if template_key not in template_sections_map:
                raise Exception(f"Template {template.id} not found: {template_key}")

            sections_map = template_sections_map[template_key]
            for section in template_json.get("sections", []):
                section_slug = section["slug"]
                if section_slug not in sections_map:
                    raise Exception(f"Section {section_slug} not found in template {template.id}")

                for sub_section in section.get("sub_sections", []):
                    sub_section_slug = sub_section["slug"]
                    if sub_section_slug not in sections_map:
                        raise Exception(f"Sub section {sub_section_slug} not found in template {template.id}")

        for template in Template.objects.all():
            template_json = template.template_json
            template_key = f"{template.template_json['name']}_{template.template_json['type']}"

            sections_map = template_sections_map[template_key]
            for section in template_json.get("sections", []):
                section_slug = section["slug"]
                new_section = sections_map[section_slug]
                section["prompt"] = new_section["prompt"]
                section["expected_output_instructions"] = new_section["expected_output_instructions"]

                for sub_section in section.get("sub_sections", []):
                    sub_section_slug = sub_section["slug"]
                    new_sub_section = sections_map[sub_section_slug]
                    sub_section["prompt"] = new_sub_section["prompt"]
                    sub_section["expected_output_instructions"] = new_sub_section[
                        "expected_output_instructions"
                    ]

            template.save()

            print(f"Updated template: {template.id}")
