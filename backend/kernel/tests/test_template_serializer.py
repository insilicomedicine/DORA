from django.test import TestCase

from kernel.serializers import TemplateSerializer


class TestValidateToolsNames(TestCase):
    def setUp(self):
        self.tool_display_names = {"tool1": "Tool 1", "tool2": "Tool 2", "tool3": "Tool 3"}
        self.validation_error_msg = (
            "Section {section_name} contains {unmapped_tool_display_names} "
            "tools that does not have a mapping in the 'tool_display_names'"
        )

    def test_all_tools_mapped(self):
        sections = [
            {"slug": "section1", "tools": ["tool1", "tool2"]},
            {"slug": "section2", "tools": ["tool3"]},
        ]
        validation_errors = TemplateSerializer._validate_tools_names(self.tool_display_names, sections)
        self.assertEqual(validation_errors, [])

    def test_unmapped_tools_in_one_section(self):
        sections = [
            {"slug": "section1", "tools": ["tool1", "tool_unknown"]},
            {"slug": "section2", "tools": ["tool3"]},
        ]
        validation_errors = TemplateSerializer._validate_tools_names(self.tool_display_names, sections)
        self.assertEqual(len(validation_errors), 1)
        self.assertIn(
            self.validation_error_msg.format(
                section_name="section1", unmapped_tool_display_names={"tool_unknown"}
            ),
            validation_errors,
        )

    def test_unmapped_tools_in_multiple_sections(self):
        sections = [
            {"slug": "section1", "tools": ["tool1", "tool_unknown1"]},
            {"slug": "section2", "tools": ["tool_unknown2"]},
        ]
        validation_errors = TemplateSerializer._validate_tools_names(self.tool_display_names, sections)
        self.assertEqual(len(validation_errors), 2)
        self.assertIn(
            self.validation_error_msg.format(
                section_name="section1", unmapped_tool_display_names={"tool_unknown1"}
            ),
            validation_errors,
        )
        self.assertIn(
            self.validation_error_msg.format(
                section_name="section2", unmapped_tool_display_names={"tool_unknown2"}
            ),
            validation_errors,
        )

    def test_no_tools_in_section(self):
        sections = [{"slug": "section1", "tools": []}, {"slug": "section2"}]
        validation_errors = TemplateSerializer._validate_tools_names(self.tool_display_names, sections)
        self.assertEqual(validation_errors, [])

    def test_empty_sections(self):
        sections = []
        validation_errors = TemplateSerializer._validate_tools_names(self.tool_display_names, sections)
        self.assertEqual(validation_errors, [])
