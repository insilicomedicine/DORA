from unittest.mock import Mock, patch

from django.test import TestCase

from kernel.llm_agent_tools.helpers.dnt_tool_utils import (
    get_efo_id_by_disease_name,
    return_empty_list_on_any_exception_decorator,
)
from kernel.utils import build_section_influences, filter_section_dependencies, topological_sort_sections


class BuildSectionInfluencesTests(TestCase):
    def test_empty_dependencies(self):
        section_dependencies = {}
        expected = {}
        result = build_section_influences(section_dependencies)
        self.assertEqual(result, expected)

    def test_single_section_no_dependencies(self):
        section_dependencies = {"section1": []}
        expected = {"section1": []}
        result = build_section_influences(section_dependencies)
        self.assertEqual(result, expected)

    def test_multiple_sections_no_dependencies(self):
        section_dependencies = {"section1": [], "section2": [], "section3": []}
        expected = {"section1": [], "section2": [], "section3": []}
        result = build_section_influences(section_dependencies)
        self.assertEqual(result, expected)

    def test_single_dependency(self):
        section_dependencies = {"section1": ["section2"], "section2": []}
        expected = {"section1": [], "section2": ["section1"]}
        result = build_section_influences(section_dependencies)
        self.assertEqual(result, expected)

    def test_multiple_dependencies(self):
        section_dependencies = {
            "section1": ["section2", "section3"],
            "section2": ["section3"],
            "section3": [],
        }
        expected = {"section1": [], "section2": ["section1"], "section3": ["section1", "section2"]}
        result = build_section_influences(section_dependencies)
        self.assertEqual(result, expected)


class TopologicalSortSectionsTests(TestCase):
    def test_empty_dependencies(self):
        section_dependencies = {}
        expected = []
        result = topological_sort_sections(section_dependencies)
        self.assertEqual(result, expected)

    def test_single_section_no_dependencies(self):
        section_dependencies = {"section1": []}
        expected = [["section1"]]
        result = topological_sort_sections(section_dependencies)
        self.assertEqual(result, expected)

    def test_linear_dependencies(self):
        section_dependencies = {
            "section1": [],
            "section2": ["section1"],
            "section3": ["section2"],
        }
        expected = [["section1"], ["section2"], ["section3"]]
        result = topological_sort_sections(section_dependencies)
        self.assertEqual(result, expected)

    def test_multiple_dependencies(self):
        section_dependencies = {
            "section1": [],
            "section2": ["section1"],
            "section3": ["section1"],
            "section4": ["section2", "section3"],
        }
        expected = [["section1"], ["section2", "section3"], ["section4"]]
        result = topological_sort_sections(section_dependencies)
        self.assertEqual(result, expected)

    def test_complex_dependencies(self):
        section_dependencies = {
            "section1": [],
            "section2": ["section1"],
            "section3": ["section1"],
            "section4": ["section2"],
            "section5": ["section2", "section3"],
            "section6": ["section4", "section5"],
        }
        expected = [["section1"], ["section2", "section3"], ["section4", "section5"], ["section6"]]
        result = topological_sort_sections(section_dependencies)
        self.assertEqual(result, expected)


class MyClass:
    @return_empty_list_on_any_exception_decorator("MyClass")
    def _run(a, b):
        return a / b


@patch("kernel.llm_agent_tools.helpers.dnt_tool_utils.logger.warning")
class TestReturnEmptyListOnAnyExceptionDecorator(TestCase):
    def test__divide__valid_input__returns_float(self, patched_logger_warning: Mock):
        result = MyClass._run(10, 2)
        self.assertEqual(result, 5)
        patched_logger_warning.assert_not_called()

    def test__divide__division_by_zero__returns_empty_list(self, patched_logger_warning: Mock):
        result = MyClass._run(10, 0)
        self.assertEqual(result, [])
        patched_logger_warning.assert_called_with(
            "MyClass failed to get data with exception: division by zero"
        )


class TestGetEfoIdByDiseaseName(TestCase):
    @patch("kernel.llm_agent_tools.helpers.dnt_tool_utils.get_disease_metadata")
    def test__get_efo_id_by_disease_name__direct_match__returns_efo_id(self, mock_get_disease_metadata):
        mock_get_disease_metadata.return_value = {
            "EFO_0000001": {"name": "Disease A", "synonyms": ["Disease Alpha"]},
            "EFO_0000002": {"name": "Disease B", "synonyms": ["Disease Beta"]},
        }
        result = get_efo_id_by_disease_name("Disease A")
        self.assertEqual(result, "EFO_0000001")

    @patch("kernel.llm_agent_tools.helpers.dnt_tool_utils.get_disease_metadata")
    def test__get_efo_id_by_disease_name__synonym_match__returns_efo_id(self, mock_get_disease_metadata):
        mock_get_disease_metadata.return_value = {
            "EFO_0000001": {"name": "Disease A", "synonyms": ["Disease Alpha"]},
            "EFO_0000002": {"name": "Disease B", "synonyms": ["Disease Beta"]},
        }
        result = get_efo_id_by_disease_name("Disease Beta")
        self.assertEqual(result, "EFO_0000002")

    @patch("kernel.llm_agent_tools.helpers.dnt_tool_utils.get_disease_metadata")
    def test__get_efo_id_by_disease_name__no_match__returns_none(self, mock_get_disease_metadata):
        mock_get_disease_metadata.return_value = {
            "EFO_0000001": {"name": "Disease A", "synonyms": ["Disease Alpha"]},
            "EFO_0000002": {"name": "Disease B", "synonyms": ["Disease Beta"]},
        }
        result = get_efo_id_by_disease_name("Unknown Disease")
        self.assertIsNone(result)


class TestFilterSectionDependencies(TestCase):
    def setUp(self):
        self.section_dependencies = {
            "section1": ["section2", "section3"],
            "section2": ["section3"],
            "section3": [],
            "section4": ["section1"],
        }
        self.sections_to_remove = ["section2", "section3"]

    def test_filter_section_dependencies(self):
        expected_result = {
            "section1": [],
            "section4": ["section1"],
        }
        result = filter_section_dependencies(self.section_dependencies, self.sections_to_remove)
        self.assertEqual(result, expected_result)

    def test_filter_section_dependencies_no_removal(self):
        sections_to_remove = []
        expected_result = self.section_dependencies
        result = filter_section_dependencies(self.section_dependencies, sections_to_remove)
        self.assertEqual(result, expected_result)

    def test_filter_section_dependencies_all_removed(self):
        sections_to_remove = ["section1", "section2", "section3", "section4"]
        expected_result = {}
        result = filter_section_dependencies(self.section_dependencies, sections_to_remove)
        self.assertEqual(result, expected_result)
