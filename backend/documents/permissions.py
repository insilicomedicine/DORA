from typing import Any

from django.db import models
from django.http import Http404
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request

from documents.models import Document, Section


class CustomPermission(models.Model):
    """
    A class to store all user permissions that do not match any model.
    """

    class Meta:
        managed = False
        permissions = (("can_access_all_documents", "Can access all documents"),)


class CanAccessAllDocuments(IsAuthenticated):
    def has_permission(self, request: Request, view: Any) -> bool:
        is_authenticated = super().has_permission(request, view)
        return is_authenticated and request.user.has_perm("documents.can_access_all_documents")


class IsDocumentOwner(IsAuthenticated):
    def has_object_permission(self, request: Request, view: Any, obj: "Document") -> bool:
        is_authenticated = super().has_permission(request, view)

        if not is_authenticated:
            return False

        if isinstance(obj, Document):
            if obj.created_by != request.user:
                raise Http404

        elif isinstance(obj, Section):
            if obj.document.created_by != request.user:
                raise Http404

        return True
