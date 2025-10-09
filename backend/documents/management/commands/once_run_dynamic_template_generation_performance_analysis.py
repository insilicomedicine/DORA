import time
from typing import Dict, List, Tuple

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from documents.models import Document
from documents.services import generate_plan
from kernel.models import Template
from kernel.tasks.processing.dynamic_section import create_sub_sections


class Command(BaseCommand):
    """
    Run create_sub_sections with each template multiple times to measure the success rate
    of dynamic template generation
    """

    help = "Run dynamic template generation performance analysis"

    def __init__(self):
        super().__init__()
        self.template_ids: List[str] = [
            "92d9a1b8-fcbb-4883-8223-3fcf2f80624b",
            "bc797335-7a8d-4581-bf7d-9ec6efeec171",
            "b5ee11b2-c40b-46c1-aa0d-f242ecdaac54",
            "42656395-1a3c-4bfb-bb3d-4b8056e10201",
            "689d14e9-d1e6-46db-86ce-66f97052c164",
        ]
        self.agents: Dict = {
            "web_search_tool": {"resources": ["google"]},
            "Scientific Writer": {"resources": []},
            "Reference Validator": {"resources": []},
            "pubmed_abstract_similarity_search_tool": {"resources": ["pmc", "pubmed"]},
        }
        self.run_times: int = 30
        self.test_user: str = "qi.tong@insilico.ai"

    def handle(self, *args, **options):
        """Main command handler"""
        start_time = time.time()
        user = User.objects.get(username=self.test_user)
        templates_results = {}

        for template_id in self.template_ids:
            template = Template.objects.get(id=template_id)
            success_rate, template_time = self.run_template_test(template, user)
            templates_results[template.name] = {"success_rate": success_rate, "time": template_time}

        total_time = time.time() - start_time
        self.print_results(templates_results, total_time)

    def create_test_document(self, template: Template, user: User, user_inputs: Dict) -> Document:
        """Create a test document with the given template and settings"""
        document = Document.objects.create(
            template=template,
            title=f"Dynamic Template Generation Performance Analysis for {template.template_json['name']}",
            template_json=template.template_json,
            created_by=user,
            settings={
                "agents": self.agents,
                "custom_data": {},
                "custom_bibliography_file_pks": [],
                "plan": "",
                "user_inputs": user_inputs,
            },
        )
        document.create_sections()
        return document

    def run_template_test(self, template: Template, user: User) -> Tuple[str, float]:
        """Run test for a single template and return success rate and time taken"""
        template_start_time = time.time()
        user_inputs = {
            user_input["slug"]: user_input["default_value"]
            for user_input in template.template_json["user_inputs"]
        }

        success_count = 0
        for _ in range(self.run_times):
            document = self.create_test_document(template, user, user_inputs)

            plan = generate_plan(document)
            document.settings["plan"] = plan
            document.save()

            if create_sub_sections(document.id):
                success_count += 1

        template_time = time.time() - template_start_time
        return f"{success_count}/{self.run_times}", template_time

    def print_results(self, results: Dict[str, Dict], total_time: float) -> None:
        """Print the test results in a formatted way"""
        self.stdout.write("\nDynamic Template Generation Performance Analysis Results:")
        self.stdout.write("=" * 60)
        self.stdout.write("\nTest includes:")
        self.stdout.write("- Document creation(no content generation)")
        self.stdout.write("- Plan generation")
        self.stdout.write("- Dynamic subsections creation")
        self.stdout.write("\n" + "-" * 40)

        for template_name, result in results.items():
            self.stdout.write(f"\nTemplate: {template_name}")
            self.stdout.write(f"Success Rate: {result['success_rate']}")
            self.stdout.write(f"Time Taken: {result['time']:.2f} seconds")

        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(f"Total Time: {total_time:.2f} seconds")
        self.stdout.write(f"Completed at: {timezone.now().strftime('%Y-%m-%d %H:%M:%S %Z')}")
