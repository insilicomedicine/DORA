from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from ai_review.defs import AiReviewCalculationStatus, AiReviewTypes
from ai_review.models import DocumentAIReview
from ai_review.serializers import DocumentAIReviewSerializer
from ai_review.tasks import document_main_metrics_task
from ai_review.utils import build_ai_review_answer, get_review_calculation_status
from base.defs.http import HttpRequestMethod
from documents.models import Document


class AIReviewViewSet(viewsets.GenericViewSet):
    queryset = DocumentAIReview.objects.all()
    serializer_class = DocumentAIReviewSerializer

    def get_queryset(self):
        return super().get_queryset().filter(user=self.request.user)

    @action(methods=["get", "post"], detail=False)
    def document_reviews(self, request):
        if request.method.lower() == HttpRequestMethod.POST:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            document_id = serializer.validated_data["document_id"]

            document_main_metrics_task.delay(document_id)

            return Response({"result": document_id})
        elif request.method.lower() == HttpRequestMethod.GET:
            document_id = request.query_params.get("document_id")
            if not document_id:
                return Response({"detail": "document_id is required"}, status=status.HTTP_400_BAD_REQUEST)

            if not Document.objects.filter(id=document_id, created_by=request.user).exists():
                return Response({"detail": "document not found"}, status=status.HTTP_404_NOT_FOUND)

            review_status = get_review_calculation_status(document_id)
            if review_status:
                return Response(build_ai_review_answer(review_status=AiReviewCalculationStatus.IN_PROGRESS))

            reviews = DocumentAIReview.objects.filter(document_id=document_id)
            if not reviews:
                return Response(status=status.HTTP_404_NOT_FOUND)

            reviews_map = {review.type: review.ai_review for review in reviews}
            return Response(
                build_ai_review_answer(
                    review_status=AiReviewCalculationStatus.COMPLETED,
                    llm_based_review=reviews_map[AiReviewTypes.LLM_BASED],
                    code_based_review=reviews_map[AiReviewTypes.CODE_BASED],
                )
            )
