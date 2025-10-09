from unittest.mock import MagicMock, patch

from django.test import TestCase

from documents.transparency.shortcuts import (
    transparency_log_complete_final_text,
    transparency_log_custom_data_analyze,
    transparency_log_dependencies_analyze,
    transparency_log_plan_analyze,
    transparency_log_section_tools_analyze,
)


class TestTransparencyLogSectionToolsAnalyze(TestCase):
    @patch("documents.transparency.shortcuts.create_tool_level_record")
    @patch("documents.transparency.shortcuts.update_generation_log")
    def test_section_with_tools(self, mock_update_generation_log, mock_create_tool_level_record):
        section = MagicMock()
        section.tools = True
        mock_create_tool_level_record.return_value = "log_record_with_tools"
        transparency_log_section_tools_analyze(section)
        mock_create_tool_level_record.assert_called_once_with(
            "Research agent", "Performing research for the section..."
        )
        mock_update_generation_log.assert_called_once_with(
            section=section, agents_result="log_record_with_tools"
        )

    @patch("documents.transparency.shortcuts.create_tool_level_record")
    @patch("documents.transparency.shortcuts.update_generation_log")
    def test_section_without_tools(self, mock_update_generation_log, mock_create_tool_level_record):
        section = MagicMock()
        section.tools = False
        mock_create_tool_level_record.return_value = "log_record_without_tools"
        transparency_log_section_tools_analyze(section)
        mock_create_tool_level_record.assert_called_once_with("Research agent", "Analyzing instructions...")
        mock_update_generation_log.assert_called_once_with(
            section=section, agents_result="log_record_without_tools"
        )


class TestTransparencyLogCustomDataAnalyze(TestCase):
    @patch("documents.transparency.shortcuts.create_tool_level_record")
    @patch("documents.transparency.shortcuts.update_generation_log")
    def test_section_with_custom_data(self, mock_update_generation_log, mock_create_tool_level_record):
        section = MagicMock()
        section.custom_data = True
        mock_create_tool_level_record.return_value = "log_record_with_custom_data"
        transparency_log_custom_data_analyze(section)
        mock_create_tool_level_record.assert_called_once_with("Research agent", "Analyzing custom data...")
        mock_update_generation_log.assert_called_once_with(
            section=section, agents_result="log_record_with_custom_data"
        )

    @patch("documents.transparency.shortcuts.create_tool_level_record")
    @patch("documents.transparency.shortcuts.update_generation_log")
    def test_section_without_custom_data(self, mock_update_generation_log, mock_create_tool_level_record):
        section = MagicMock()
        section.custom_data = False
        transparency_log_custom_data_analyze(section)
        mock_create_tool_level_record.assert_not_called()
        mock_update_generation_log.assert_not_called()


class TestTransparencyLogPlanAnalyze(TestCase):
    @patch("documents.transparency.shortcuts.create_tool_level_record")
    @patch("documents.transparency.shortcuts.update_generation_log")
    def test_section_requires_plan(self, mock_update_generation_log, mock_create_tool_level_record):
        section = MagicMock()
        section.requires_plan = True
        mock_create_tool_level_record.return_value = "log_record_with_plan"

        transparency_log_plan_analyze(section)

        mock_create_tool_level_record.assert_called_once_with(
            "Research agent", "Analyzing section’s overview..."
        )
        mock_update_generation_log.assert_called_once_with(
            section=section, agents_result="log_record_with_plan"
        )

    @patch("documents.transparency.shortcuts.create_tool_level_record")
    @patch("documents.transparency.shortcuts.update_generation_log")
    def test_section_without_plan(self, mock_update_generation_log, mock_create_tool_level_record):
        section = MagicMock()
        section.requires_plan = False

        transparency_log_plan_analyze(section)

        mock_create_tool_level_record.assert_not_called()
        mock_update_generation_log.assert_not_called()


class TestTransparencyLogDependenciesAnalyze(TestCase):
    @patch("documents.transparency.shortcuts.create_tool_level_record")
    @patch("documents.transparency.shortcuts.update_generation_log")
    def test_section_with_dependencies(self, mock_update_generation_log, mock_create_tool_level_record):
        section = MagicMock()
        section.slug = "section1"

        document = MagicMock()
        document.sections_dependency_map = {"section1": ["dependency1", "dependency2"]}
        document.template_json = {"shared_memory": {"section1": ["dependency2"]}}
        document.sections_map = {
            "dependency1": {"title": "Dependency One"},
            "dependency2": {"title": "Dependency Two"},
        }

        expected_message = "Using the results collected from Dependency One, Dependency Two"
        mock_create_tool_level_record.return_value = "log_record_with_dependencies"

        transparency_log_dependencies_analyze(section, document)

        mock_create_tool_level_record.assert_called_once_with(
            tool_title="Research agent", message=expected_message
        )
        mock_update_generation_log.assert_called_once_with(
            section=section, agents_result="log_record_with_dependencies"
        )

    @patch("documents.transparency.shortcuts.create_tool_level_record")
    @patch("documents.transparency.shortcuts.update_generation_log")
    def test_section_without_dependencies(self, mock_update_generation_log, mock_create_tool_level_record):
        section = MagicMock()
        section.slug = "section1"

        document = MagicMock()
        document.sections_dependency_map = {"section1": []}
        document.template_json = {"shared_memory": {}}
        document.sections_map = {}

        transparency_log_dependencies_analyze(section, document)

        mock_create_tool_level_record.assert_not_called()
        mock_update_generation_log.assert_not_called()


class TestTransparencyLogCompleteFinalText(TestCase):
    @patch("documents.transparency.shortcuts.create_tool_level_record")
    @patch("documents.transparency.shortcuts.update_generation_log")
    def test_section_with_result_data(self, mock_update_generation_log, mock_create_tool_level_record):
        section = MagicMock()
        section.result = {"data": " Final text content "}
        section.refresh_from_db = MagicMock()

        transparency_log_complete_final_text(section)

        section.refresh_from_db.assert_called_once()
        mock_create_tool_level_record.assert_called_once_with(
            tool_title="Writer agent",
            message="Completing the final section's text",
            result="Final text content",
        )
        mock_update_generation_log.assert_called_once_with(
            section=section, agents_result=mock_create_tool_level_record.return_value
        )

    @patch("documents.transparency.shortcuts.create_tool_level_record")
    @patch("documents.transparency.shortcuts.update_generation_log")
    def test_section_without_result_data(self, mock_update_generation_log, mock_create_tool_level_record):
        section = MagicMock()
        section.result = {}
        section.refresh_from_db = MagicMock()

        transparency_log_complete_final_text(section)

        section.refresh_from_db.assert_called_once()
        mock_create_tool_level_record.assert_called_once_with(
            tool_title="Writer agent", message="Completing the final section's text", result=None
        )
        mock_update_generation_log.assert_called_once_with(
            section=section, agents_result=mock_create_tool_level_record.return_value
        )
