from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APIRequestFactory, APITestCase, force_authenticate

from ai_review.defs import AiReviewTypes
from ai_review.models import DocumentAIReview
from ai_review.views import AIReviewViewSet
from documents.models import Document, Section
from tests.helpers import create_user


class TestAIReviewViewSet(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = AIReviewViewSet.as_view({"post": "document_reviews", "get": "document_reviews"})
        self.user = create_user()
        self.document = Document.objects.create(
            created_by=self.user,
            settings={"test": "test"},
            template_json={"name": "Test Document", "description": "Test Description"},
        )
        self.section = Section.objects.create(document=self.document, status="completed")
        self.review = DocumentAIReview.objects.create(
            document=self.document,
            type=AiReviewTypes.LLM_BASED,
            ai_review={
                "overall_impression": {
                    "score": 9,
                    "score_explanation": "The text provides a comprehensive and detailed overview",
                },
                "content_and_relevance": {
                    "score": 8,
                    "strengths": "The article is well-researched and provides a comprehensive analysis ",
                    "suggestions": {
                        "1": {
                            "text": "The article lacks a clear introduction and conclusion, which could help",
                            "seriousness": "medium",
                        }
                    },
                },
            },
        )
        self.review = DocumentAIReview.objects.create(
            document=self.document,
            type=AiReviewTypes.CODE_BASED,
            ai_review={"content_and_relevance": {"score": 88}},
        )

    @patch("ai_review.serializers.check_document_not_ready_for_modification")
    @patch("ai_review.serializers.check_sections_with_in_progress_status")
    @patch("ai_review.views.document_main_metrics_task")
    def test__generate_document_review__valid_document__returns_review(
        self, mock_task, mock_check_sections, mock_check_doc
    ):
        mock_check_doc.return_value = None
        mock_check_sections.return_value = None

        request = self.factory.post("/api/ai-review/document_reviews/", {"document_id": self.document.id})
        force_authenticate(request, user=self.user)
        response = self.view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_task.delay.assert_called_once_with(self.document.id)
        self.assertEqual(response.data, {"result": self.document.id})

    @patch("ai_review.serializers.check_document_not_ready_for_modification")
    def test__generate_document_review__document_not_ready__returns_400(self, mock_check_doc):
        mock_check_doc.return_value = "Document is not ready"
        request = self.factory.post("/api/ai-review/document_reviews/", {"document_id": self.document.id})
        force_authenticate(request, user=self.user)
        response = self.view(request)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data, {"detail": "Document is not ready"})

    @patch("ai_review.serializers.check_document_not_ready_for_modification")
    @patch("ai_review.serializers.check_sections_with_in_progress_status")
    def test__generate_document_review__sections_in_progress__returns_400(
        self, mock_check_sections, mock_check_doc
    ):
        mock_check_doc.return_value = None
        mock_check_sections.return_value = "Sections are in progress"

        request = self.factory.post("/api/ai-review/document_reviews/", {"document_id": self.document.id})
        force_authenticate(request, user=self.user)
        response = self.view(request)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data, {"detail": "Sections are in progress"})

    def test__document_review__existing_review__returns_review(self):
        request = self.factory.get("/api/ai-review/document_reviews/", {"document_id": self.document.id})
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, dict)

    def test__document_review__non_existent_document__returns_404(self):
        non_existent_id = "bbebe9c4-57c2-414d-9e73-d23acc2ad95b"
        request = self.factory.get("/api/ai-review/document_reviews/", {"document_id": non_existent_id})
        force_authenticate(request, user=self.user)
        response = self.view(request)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch("ai_review.serializers.check_document_not_ready_for_modification")
    @patch("ai_review.serializers.check_sections_with_in_progress_status")
    @patch("ai_review.views.document_main_metrics_task")
    def test__generate_document_review__task_raises_exception__returns_404(
        self, mock_task, mock_check_sections, mock_check_doc
    ):
        mock_check_doc.return_value = None
        mock_check_sections.return_value = None
        mock_task.side_effect = Exception("Task failed")

        request = self.factory.post("/api/ai-review/document_reviews/", {"document_id": self.document.id})
        force_authenticate(request, user=self.user)
        response = self.view(request)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_task.delay.assert_called_once_with(self.document.id)

    def test__generate_document_review__document_does_not_exist__returns_400(self):
        non_existent_id = "bbebe9c4-57c2-414d-9e73-d23acc2ad95b"
        request = self.factory.post("/api/ai-review/document_reviews/", {"document_id": non_existent_id})
        force_authenticate(request, user=self.user)
        response = self.view(request)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
