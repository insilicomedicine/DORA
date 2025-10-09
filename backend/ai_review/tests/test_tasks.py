from unittest.mock import MagicMock, patch

from django.test import TestCase

from ai_review.defs import AiReviewTypes
from ai_review.models import DocumentAIReview
from ai_review.tasks import document_main_metrics_task
from documents.models import Document
from tests.helpers import create_user


class TestDocumentMainMetricsTask(TestCase):
    def setUp(self):
        user = create_user()

        self.document = Document.objects.create(
            created_by=user,
            settings={"test": "test"},
            template_json={"name": "Test Document", "description": "Test Description"},
        )

    @patch("ai_review.tasks.configure_token_record_callback")
    @patch("ai_review.tasks.generate_article_text")
    @patch("ai_review.tasks.build_metrics_prompts")
    @patch("ai_review.tasks.run_metric_evaluation")
    @patch("kernel.tasks.decorators.send_ws_notification_message")
    def test__document_main_metrics_task__successful_evaluation(
        self,
        mock_send_ws_notification_message,
        mock_run_metric_evaluation,
        mock_build_metrics_prompts,
        mock_generate_article_text,
        mock_configure_callback,
    ):
        # Setup mocks
        mock_callback = MagicMock()
        mock_configure_callback.return_value = mock_callback
        mock_generate_article_text.return_value = "Test article text"
        mock_build_metrics_prompts.return_value = {
            "metric1": {"name": "name1", "prompt": "Test prompt 1"},
            "metric2": {"name": "name2", "prompt": "Test prompt 2"},
        }
        mock_run_metric_evaluation.side_effect = [
            {"score": 8, "feedback": "Good"},
            {"score": 7, "feedback": "Nice"},
        ]
        mock_send_ws_notification_message.return_value = None

        # Run task
        document_main_metrics_task(self.document.id)

        # Verify mocks were called correctly
        mock_configure_callback.assert_called_once_with(self.document)
        mock_generate_article_text.assert_called_once_with(self.document)
        mock_build_metrics_prompts.assert_called_once_with(
            article_name="Test Document", description="Test Description"
        )

        # Verify run_metric_evaluation was called for each metric
        self.assertEqual(mock_run_metric_evaluation.call_count, 2)
        mock_run_metric_evaluation.assert_any_call(
            system_message="Test prompt 1",
            user_query="Test article text",
            token_record_callback=mock_callback,
        )
        mock_run_metric_evaluation.assert_any_call(
            system_message="Test prompt 2",
            user_query="Test article text",
            token_record_callback=mock_callback,
        )

        # Verify review was created
        review = DocumentAIReview.objects.get(document=self.document, type=AiReviewTypes.LLM_BASED)
        expected_review = {
            "metric1": {"score": 8, "name": "name1", "feedback": "Good"},
            "metric2": {"score": 7, "name": "name2", "feedback": "Nice"},
        }
        self.assertEqual(review.ai_review, expected_review)

    @patch("ai_review.tasks.configure_token_record_callback")
    @patch("ai_review.tasks.generate_article_text")
    @patch("ai_review.tasks.build_metrics_prompts")
    @patch("ai_review.tasks.run_metric_evaluation")
    @patch("kernel.tasks.decorators.send_ws_notification_message")
    def test__document_main_metrics_task__handles_evaluation_error(
        self,
        mock_send_ws_notification_message,
        mock_run_metric_evaluation,
        mock_build_metrics_prompts,
        mock_generate_article_text,
        mock_configure_callback,
    ):
        # Setup mocks
        mock_callback = MagicMock()
        mock_configure_callback.return_value = mock_callback
        mock_generate_article_text.return_value = "Test article text"
        mock_build_metrics_prompts.return_value = {
            "metric1": {"name": "name1", "prompt": "Test prompt 1"},
            "metric2": {"name": "name2", "prompt": "Test prompt 2"},
        }
        mock_run_metric_evaluation.side_effect = [
            Exception("Evaluation failed"),
            {"score": 7, "feedback": "Nice"},
        ]
        mock_send_ws_notification_message.return_value = None

        # Run task
        document_main_metrics_task(self.document.id)

        # Verify review was created with failed metric as None
        review = DocumentAIReview.objects.get(document=self.document, type=AiReviewTypes.LLM_BASED)
        expected_review = {"metric1": None, "metric2": {"score": 7, "name": "name2", "feedback": "Nice"}}
        self.assertEqual(review.ai_review, expected_review)
