import json
from unittest import mock

from django.test import TestCase

from kernel.tasks.processing.dynamic_section import (
    GENERATE_SECTIONS_TEMPLATE,
    SEPARATE_CUSTOM_DATA_TEMPLATE,
    check_custom_data,
    create_sub_sections,
    generate_sub_sections_by_plan,
    separate_custom_data,
    validate_section_data,
)


class DynamicSectionTests(TestCase):
    @mock.patch("kernel.tasks.processing.dynamic_section.init_llm_mini")
    def test_generate_sub_sections_by_plan(self, mock_init_llm_mini):
        steps = [
            {
                "slug": "step1",
                "title": "Step 1",
                "tools": [],
                "depends_on": [],
                "prompt": "",
                "expected_output_instructions": "",
            }
        ]

        mock_llm = mock.Mock()
        mock_init_llm_mini.return_value = mock_llm
        mock_llm.return_value = json.dumps({"steps": steps})

        plan = "test plan"
        tool_descriptions = {"tool1": "Tool 1 description"}
        prompt_template = "template"

        result = generate_sub_sections_by_plan(0, plan, tool_descriptions, prompt_template, set())

        self.assertEqual(
            result,
            [
                {
                    "slug": "step1",
                    "title": "Step 1",
                    "tools": [],
                    "depends_on": [],
                    "prompt": "",
                    "expected_output_instructions": "",
                }
            ],
        )

    def test_check_custom_data(self):
        custom_data_parts = [{"slug": "step1", "custom_data_part": "data"}]
        sub_sections_data = [{"slug": "step1"}]

        try:
            check_custom_data(custom_data_parts, sub_sections_data)
        except ValueError:
            self.fail("check_custom_data raised ValueError unexpectedly!")

    @mock.patch("kernel.tasks.processing.dynamic_section.init_llm_mini")
    def test_separate_custom_data(self, mock_init_llm_mini):
        parts = [{"slug": "step1", "custom_data_part": "data"}]

        mock_llm = mock.Mock()
        mock_init_llm_mini.return_value = mock_llm
        mock_llm.return_value = json.dumps({"parts": parts})

        custom_data = "custom data"
        sub_sections_data = [{"slug": "step1"}]
        prompt_template = "template"

        result = separate_custom_data(custom_data, sub_sections_data, prompt_template)

        self.assertEqual(result, parts)

    @mock.patch("kernel.tasks.processing.dynamic_section.Config")
    @mock.patch("kernel.tasks.processing.dynamic_section.Document")
    @mock.patch("kernel.tasks.processing.dynamic_section.Section")
    @mock.patch("kernel.tasks.processing.dynamic_section.get_available_tools")
    @mock.patch("kernel.tasks.processing.dynamic_section.get_tools_descriptions")
    @mock.patch("kernel.tasks.processing.dynamic_section.generate_sub_sections_by_plan")
    @mock.patch("kernel.tasks.processing.dynamic_section.separate_custom_data")
    def test_create_sub_sections(
        self,
        mock_separate_custom_data,
        mock_generate_sub_sections_by_plan,
        mock_get_tools_descriptions,
        mock_get_available_tools,
        MockSection,
        MockDocument,
        MockConfig,
    ):
        mock_config = mock.Mock()
        mock_config.get.return_value = {
            GENERATE_SECTIONS_TEMPLATE: "template1",
            SEPARATE_CUSTOM_DATA_TEMPLATE: "template2",
        }
        mock_document = mock.Mock()
        MockDocument.objects.get.return_value = mock_document
        mock_section = mock.Mock()
        mock_document.sections.all.return_value = [mock_section]
        mock_document.template_json = {"sections": [{"slug": "section1"}]}
        mock_section.dynamic_template_subsection = True
        mock_section.plan = "test plan"
        mock_section.custom_data = "custom data"
        mock_section.sub_sections.exists.return_value = False
        mock_get_available_tools.return_value = ["tool1"]
        mock_get_tools_descriptions.return_value = {"tool1": "Tool 1 description"}
        mock_generate_sub_sections_by_plan.return_value = [
            {
                "slug": "section1",
                "title": "Section 1",
                "prompt": "Prompt",
                "depends_on": [],
                "tools": ["tool1"],
                "expected_output_instructions": "",
            }
        ]
        mock_separate_custom_data.return_value = [{"slug": "section1", "custom_data_part": "data"}]

        create_sub_sections("document_id")

        self.assertEqual(mock_document.update_fields.call_count, 2)
        MockSection.objects.create.assert_called_once()

    def test_validate_section_data(self):
        section_data = {
            "slug": "test_section",
            "tools": ["web_search_tool"],
            "depends_on": [],
            "prompt": "Valid sentence. {unknown_placeholder} should be removed.",
            "title": "Test Section",
            "expected_output_instructions": "Expected output",
        }
        tools_descriptions = {"web_search_tool": "Web Search Tool"}
        section_slugs = {"test_section 2"}
        validate_section_data(section_data, tools_descriptions, section_slugs)
        self.assertEqual(section_data["prompt"], "Valid sentence. ")
        self.assertEqual(section_slugs, {"test_section", "test_section 2"})
