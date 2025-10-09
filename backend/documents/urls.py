from rest_framework.routers import DefaultRouter

from documents.views import DocumentViewSet, SectionViewSet, TransparencyViewSet

router = DefaultRouter()
router.register(r"sections", SectionViewSet, basename="section")
router.register(r"transparency", TransparencyViewSet, basename="transparency")
router.register(r"", DocumentViewSet, basename="document")
