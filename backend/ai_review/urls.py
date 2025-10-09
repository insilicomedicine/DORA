from rest_framework.routers import DefaultRouter

from ai_review.views import AIReviewViewSet

router = DefaultRouter()
router.register(r"", AIReviewViewSet, basename="ai_review")
