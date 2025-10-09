from django.conf import settings
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from app.settings import SOCIALACCOUNT_PROVIDERS
from kernel.defs import SearchResource


class SystemViewSet(viewsets.GenericViewSet):
    serializer_class = None

    @action(methods=["get"], detail=False)
    def info(self, request):
        return Response(
            {
                "search_sources": [
                    {
                        "name": SearchResource.PUBMED,
                        "available": settings.PHARMACOGNITIVE_API_URL is not None,
                    },
                    {
                        "name": SearchResource.PMC,
                        "available": settings.PHARMACOGNITIVE_API_URL is not None,
                    },
                    {
                        "name": SearchResource.WEBSEARCH,
                        "available": settings.IS_WEBSEARCH_ENABLED,
                    },
                    {
                        "name": SearchResource.CUSTOM_BIB,
                        "available": settings.IS_BIBLIOGRAPHY_ENABLED
                        and bool(settings.EMBEDDING_OPENAI_API_CONFIGS),
                    },
                ]
            }
        )

    @action(methods=["get"], detail=False, permission_classes=[AllowAny])
    def social_account_providers(self, request):
        return Response({"providers": list(SOCIALACCOUNT_PROVIDERS.keys())})
