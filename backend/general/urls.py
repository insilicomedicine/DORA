from rest_framework.routers import DefaultRouter

from general.views import SystemViewSet

router = DefaultRouter()
router.register(r"system", SystemViewSet, basename="system")
