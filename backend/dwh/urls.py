from rest_framework.routers import DefaultRouter

from dwh.views import ScientificPublicationViewSet

router = DefaultRouter()
router.register(r"scientific_publication", ScientificPublicationViewSet, basename="scientific_publication")
