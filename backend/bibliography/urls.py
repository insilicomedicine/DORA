from rest_framework.routers import DefaultRouter

from bibliography.views import BibliographyViewSet, CustomBibliographyFileViewSet

router = DefaultRouter()
router.register(r"custom_file", CustomBibliographyFileViewSet, basename="custom_file")
router.register(r"", BibliographyViewSet, basename="bibliography")
