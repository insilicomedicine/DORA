from unittest.mock import patch

from django.test import TestCase
from rest_framework.exceptions import APIException

from documents.models import Document, Section
from documents.services import generate_plan
from kernel.defs import AgentResponse
from kernel.models import Template
from tests.helpers import create_user
from users.defs import TokenUsage
from users.models import AITokenUsageType


class TestGeneratePlan(TestCase):
    def setUp(self):
        template_json = {
            "sections": [
                {
                    "slug": "plan-section",
                    "title": "Plan Section",
                    "prompt": "Write a section",
                    "requires_plan": True,
                    "display_on_plan_overview": True,
                }
            ]
        }
        user = create_user()
        self.template = Template.objects.create(template_json=template_json, created_by=user)
        self.document = Document.objects.create(
            settings={
                "user_inputs": {"topic": "test"},
                "custom_data": {},
                "agents": {},
                "plan": "",
                "custom_bibliography_file_pks": [],
            },
            title="Test Document",
            created_by=user,
            template=self.template,
            template_json=template_json,
        )
        self.section = Section.objects.create(
            document=self.document,
            slug="plan-section",
            title="Plan Section",
            prompt="Write a section",
            plan_prompt="Write a plan",
            requires_plan=True,
        )

    @patch("documents.services.telemetry")
    @patch("documents.services.SectionAgent")
    @patch("documents.services.record_token_usage")
    def test_generate_plan_success(self, mock_record_token_usage, MockSectionAgent, mock_telemetry):
        token_usage = TokenUsage(
            prompt_tokens=10,
            completion_tokens=20,
            total_tokens=30,
        )

        mock_section_agent = MockSectionAgent.return_value
        mock_section_agent.generate_plan.return_value = AgentResponse(
            content="plan",
            token_usage=token_usage,
        )

        plan = generate_plan(self.document)

        self.assertEqual(plan, "plan")
        mock_record_token_usage.assert_called_once_with(
            self.document.created_by,
            self.section,
            token_usage,
            AITokenUsageType.GEN_PLAN,
            mock_section_agent.llm.model_name,
        )

    def test_generate_plan_no_plan_section_in_template(self):
        self.template.template_json = {"sections": []}
        self.template.save()

        with self.assertRaises(APIException) as context:
            generate_plan(self.document)

        self.assertEqual(str(context.exception), "No plan section found in template.")

    def test_generate_plan_no_plan_section_in_document(self):
        self.section.delete()

        with self.assertRaises(APIException) as context:
            generate_plan(self.document)

        self.assertEqual(str(context.exception), "No plan section found in document.")
