from channels.auth import AuthMiddlewareStack  # noqa: F401
from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: F401
from django.urls import path

from app.consumers import NotificationsConsumer

websocket_urlpatterns = [
    path("ws/notifications/", NotificationsConsumer.as_asgi()),
]
