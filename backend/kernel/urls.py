from rest_framework.routers import DefaultRouter

from kernel.views import TemplateViewSet

router = DefaultRouter()
router.register("", TemplateViewSet, basename="template")
