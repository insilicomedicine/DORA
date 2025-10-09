from unittest.mock import MagicMock, patch

from django.test import TestCase
from langchain_core.messages import HumanMessage, SystemMessage

from ai_review.logic.calculate_additional_metrics import flatten_sections
from ai_review.utils import (
    build_metrics_prompts,
    configure_metrics_prompt,
    get_metric_info,
    run_metric_evaluation,
    transform_llm_based_review,
    validate_metric_slug,
)
from users.defs import TokenUsage


class TestRunMetricEvaluation(TestCase):
    def setUp(self):
        self.system_message = "System message for Test Article with Test Description"
        self.user_query = "Test query"
        self.token_record_callback = MagicMock()

    @patch("ai_review.utils.init_llm_mini")
    def test_successful_evaluation(self, mock_init_llm_mini):
        mock_llm = MagicMock()
        mock_llm.invoke.return_value = MagicMock(
            response_metadata={
                "token_usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30}
            },
            content='{"score": 8, "feedback": "Good article"}',
        )
        mock_init_llm_mini.return_value = mock_llm
        mock_llm.bind.return_value = mock_llm

        result = run_metric_evaluation(
            self.system_message,
            self.user_query,
            self.token_record_callback,
        )

        mock_llm.invoke.assert_called_once_with(
            [
                SystemMessage(content="System message for Test Article with Test Description"),
                HumanMessage(content="Test query"),
            ],
        )

        self.token_record_callback.assert_called_once_with(
            token_usage=TokenUsage.from_dict(
                {
                    "prompt_tokens": 10,
                    "completion_tokens": 20,
                    "total_tokens": 30,
                }
            ),
        )

        self.assertEqual(result, {"score": 8, "feedback": "Good article"})

    @patch("ai_review.utils.init_llm_mini")
    def test_evaluation_with_error(self, mock_init_llm):
        mock_llm = MagicMock()
        mock_llm.side_effect = Exception("Test error")
        mock_init_llm.return_value = mock_llm

        with self.assertRaises(Exception):  # noqa: B017
            run_metric_evaluation(
                self.system_message,
                self.user_query,
                self.token_record_callback,
            )


class TestValidateMetricSlug(TestCase):
    def setUp(self):
        self.prompt_templates = {
            "general_evaluation": {
                "overall_quality": {"name": "Overall Quality", "description": "Test description"}
            },
            "detailed_evaluation_metrics": {
                "clarity": {"name": "Clarity", "description": "Test description"}
            },
        }

    def test_validate_valid_overall_metric(self):
        validate_metric_slug("overall_quality", self.prompt_templates, is_overall=True)

    def test_validate_valid_detailed_metric(self):
        validate_metric_slug("clarity", self.prompt_templates, is_overall=False)

    def test_validate_invalid_overall_metric(self):
        with self.assertRaises(ValueError):
            validate_metric_slug("invalid_metric", self.prompt_templates, is_overall=True)

    def test_validate_invalid_detailed_metric(self):
        with self.assertRaises(ValueError):
            validate_metric_slug("invalid_metric", self.prompt_templates, is_overall=False)


class TestGetMetricInfo(TestCase):
    def setUp(self):
        self.prompt_templates = {
            "general_evaluation": {
                "overall_quality": {"name": "Overall Quality", "description": "Overall quality description"}
            },
            "detailed_evaluation_metrics": {
                "clarity": {"name": "Clarity", "description": "Clarity description"}
            },
        }

    def test_get_overall_metric_info(self):
        result = get_metric_info(self.prompt_templates, "overall_quality", is_overall=True)
        self.assertEqual(result, {"name": "Overall Quality", "description": "Overall quality description"})

    def test_get_detailed_metric_info(self):
        result = get_metric_info(self.prompt_templates, "clarity", is_overall=False)
        self.assertEqual(result, {"name": "Clarity", "description": "Clarity description"})

    def test_get_nonexistent_metric_info(self):
        with self.assertRaises(KeyError):
            get_metric_info(self.prompt_templates, "nonexistent_metric", is_overall=True)


class TestConfigureMetricsPrompt(TestCase):
    def setUp(self):
        self.prompt_templates = {
            "general_evaluation": {
                "overall_quality": {
                    "name": "Overall Quality",
                    "description": "Overall quality description",
                    "article_name": "Article",
                }
            },
            "detailed_evaluation_metrics": {
                "clarity": {"name": "Clarity", "description": "Clarity description"}
            },
            "overall_evaluation_extended_prompt": "Template for {article_name} with {description}",
            "metric_evaluation_extended_prompt": "Metric template for {metric_name}",
            "min_score": 1,
            "max_score": 10,
        }

    def test_configure_overall_metric_prompt(self):
        result = configure_metrics_prompt("overall_quality", self.prompt_templates, is_overall=True)
        self.assertEqual(result["name"], "Overall Quality")
        self.assertIn("Template for the article with Overall quality description", result["prompt"])

    def test_configure_detailed_metric_prompt(self):
        result = configure_metrics_prompt("clarity", self.prompt_templates, is_overall=False)
        self.assertEqual(result["name"], "Clarity")
        self.assertIn("Metric template for Clarity", result["prompt"])


class TestBuildMetricsPrompts(TestCase):
    def setUp(self):
        self.article_name = "Test Article"
        self.description = "Test Description"
        self.prompt_templates = {
            "general_evaluation": {
                "overall_quality": {"name": "Overall Quality", "description": "Description"}
            },
            "detailed_evaluation_metrics": {"clarity": {"name": "Clarity", "description": "Description"}},
            "overall_evaluation_extended_prompt": "Template for {article_name}",
            "metric_evaluation_extended_prompt": "Template for {article_name}",
            "min_score": 1,
            "max_score": 10,
        }

    @patch("ai_review.utils.Config.get")
    def test_build_metrics_prompts(self, mock_config_get):
        mock_config_get.return_value = self.prompt_templates
        result = build_metrics_prompts(self.article_name, self.description)

        self.assertIn("overall_quality", result)
        self.assertIn("clarity", result)
        self.assertEqual(len(result), 2)


class TestTransformData(TestCase):
    def test_transform_complete_data(self):
        input_data = {
            "overall_impression": {"score": 8, "score_explanation": "Good overall"},
            "clarity": {
                "score": 7,
                "score_explanation": "Clear enough",
                "strengths": ["Good structure"],
                "suggestions": {"1": {"text": "Improve intro", "seriousness": "medium"}},
            },
        }

        result = transform_llm_based_review(input_data)

        self.assertEqual(result["overall_impression"]["score"], 8)
        self.assertEqual(len(result["categories"]), 1)
        self.assertEqual(result["categories"][0]["score"], 7)
        self.assertEqual(len(result["categories"][0]["suggestions"]), 1)

    def test_transform_data_without_suggestions(self):
        input_data = {
            "overall_impression": {"score": 8, "score_explanation": "Good overall"},
            "clarity": {"score": 7, "score_explanation": "Clear enough", "strengths": ["Good structure"]},
        }

        result = transform_llm_based_review(input_data)

        self.assertEqual(result["overall_impression"]["score"], 8)
        self.assertEqual(len(result["categories"]), 1)
        self.assertEqual(result["categories"][0]["suggestions"], [])


class TestFlattenSections(TestCase):
    def test_flatten_sections(self):
        sections = [
            {
                "title": "Title1",
                "result": {"data": "Text1"},
                "sub_sections": [
                    {"title": "Title1.1", "result": {"data": "Text1.1"}},
                    {"title": "Title1.2", "result": {"data": "Text1.2"}},
                ],
            },
            {"title": "Title2", "result": {"data": "Text2"}},
        ]

        result = flatten_sections(sections)

        self.assertEqual(len(result), 4)
        self.assertEqual(result[0]["title"], "Title1")
        self.assertEqual(result[1]["title"], "Title1.1")
        self.assertEqual(result[2]["title"], "Title1.2")
        self.assertEqual(result[3]["title"], "Title2")

    def test_flatten_sections_with_repeating_titles(self):
        sections = [
            {
                "title": "Title1",
                "result": {"data": "Text1"},
                "sub_sections": [
                    {"title": "Title1.1", "result": {"data": "Text1.1"}},
                    {"title": "Title1.1", "result": {"data": "Text1.2"}},
                ],
            },
        ]

        result = flatten_sections(sections)

        self.assertEqual(len(result), 3)
        self.assertEqual(result[0]["title"], "Title1")
        self.assertEqual(result[1]["title"], "Title1.1")
        self.assertEqual(result[2]["title"], "Title1.1 2")
