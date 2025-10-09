from unittest.mock import MagicMock, patch

from django.test import TestCase

from documents.models import Section
from kernel.tasks.post_processing.polish import polish_document_content, prepare_json_from_sections


class TestPrepareJsonFromSections(TestCase):
    def test_prepare_json_from_sections_empty(self):
        sections = MagicMock()
        sections.all.return_value = []
        current_id_counter = [0]
        section_id_map = {}

        result = prepare_json_from_sections(sections, current_id_counter, section_id_map)

        self.assertEqual(result, {})
        self.assertEqual(current_id_counter[0], 0)
        self.assertEqual(section_id_map, {})

    def test_prepare_json_from_sections_no_subsections(self):
        section1 = MagicMock(spec=Section)
        section1.id = 1
        section1.title = "Section 1"
        section1.result = {"data": "result 1"}
        section1.sub_sections.all.return_value = []

        sections = [section1]
        current_id_counter = [0]
        section_id_map = {}

        result = prepare_json_from_sections(sections, current_id_counter, section_id_map)

        expected_result = {1: {"title": "Section 1", "results": "result 1", "sub_sections": {}}}

        self.assertEqual(result, expected_result)
        self.assertEqual(current_id_counter[0], 1)
        self.assertEqual(section_id_map, {1: "1"})

    def test_prepare_json_from_sections_with_subsections(self):
        sub_section1 = MagicMock(spec=Section)
        sub_section1.id = 2
        sub_section1.title = "Sub Section 1"
        sub_section1.result = {"data": "sub result 1"}
        sub_section1.sub_sections.all.return_value = []

        section1 = MagicMock(spec=Section)
        section1.id = 1
        section1.title = "Section 1"
        section1.result = {"data": "result 1"}
        section1.sub_sections.all.return_value = [sub_section1]

        sections = [section1]
        current_id_counter = [0]
        section_id_map = {}

        result = prepare_json_from_sections(sections, current_id_counter, section_id_map)

        expected_result = {
            1: {
                "title": "Section 1",
                "results": "result 1",
                "sub_sections": {
                    2: {"title": "Sub Section 1", "results": "sub result 1", "sub_sections": {}}
                },
            }
        }

        self.assertEqual(result, expected_result)
        self.assertEqual(current_id_counter[0], 2)
        self.assertEqual(section_id_map, {1: "1", 2: "2"})


class TestPolishDocumentContent(TestCase):
    @patch("kernel.tasks.post_processing.polish.Config.get")
    @patch("kernel.tasks.post_processing.polish.init_llm_mini")
    @patch("kernel.tasks.post_processing.polish.record_token_usage")
    @patch("kernel.tasks.post_processing.polish.prepare_json_from_document")
    @patch("kernel.tasks.post_processing.polish.PromptTemplate")
    @patch("kernel.tasks.post_processing.polish.JsonOutputParser")
    def test_polish_document_content_success(
        self,
        mock_parser,
        mock_prompt,
        mock_prepare_json,
        mock_record_token_usage,
        mock_init_llm_mini,
        mock_config_get,
    ):
        # Setup basic mocks
        mock_config_get.return_value = {"user_message": "Polish: {context}"}
        mock_prepare_json.return_value = ({1: {"results": "original"}}, {1: "1"})

        # Setup the chain components
        mock_prompt.return_value.invoke.return_value = "formatted prompt"

        mock_llm_response = MagicMock()
        mock_llm_response.content = '{"sections": {"1": {"results": "polished", "sub_sections": {}}}}'
        mock_llm = mock_init_llm_mini.return_value
        mock_llm.invoke.return_value = mock_llm_response
        mock_llm.model_name = "gpt-3.5-turbo"

        mock_parser.return_value.invoke.return_value = {
            "sections": {"1": {"results": "polished", "sub_sections": {}}}
        }

        # Setup document
        document = MagicMock()
        document.id = 42
        document.created_by = "test_user"
        mock_section = MagicMock()
        document.sections.get.return_value = mock_section

        result = polish_document_content(document)

        self.assertTrue(result)
        mock_record_token_usage.assert_called_once()

    @patch("kernel.tasks.post_processing.polish.Config.get")
    def test_polish_document_content_missing_template(self, mock_config_get):
        mock_config_get.return_value = {}
        document = MagicMock()
        with self.assertLogs("kernel.tasks.post_processing.polish", level="ERROR") as cm:
            result = polish_document_content(document)
            self.assertFalse(result)
            self.assertIn("User message template not found", cm.output[0])

    @patch("kernel.tasks.post_processing.polish.Config.get")
    @patch("kernel.tasks.post_processing.polish.init_llm_mini")
    @patch("kernel.tasks.post_processing.polish.prepare_json_from_document")
    def test_polish_document_content_llm_error(self, mock_prepare_json, mock_init_llm_mini, mock_config_get):
        # Basic setup
        mock_config_get.return_value = {"user_message": "Polish: {context}"}
        mock_prepare_json.return_value = ({}, {})

        # Mock LLM to raise exception
        mock_llm = MagicMock()
        mock_llm.invoke.side_effect = ValueError("LLM error")
        mock_init_llm_mini.return_value = mock_llm

        # Test
        document = MagicMock()
        document.id = 42

        with self.assertLogs("kernel.tasks.post_processing.polish", level="ERROR") as cm:
            result = polish_document_content(document)

        self.assertFalse(result)
        self.assertIn("Error invoking LLM", cm.output[0])
