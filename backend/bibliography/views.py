from django.db.models import Case, IntegerField, Value, When
from rest_framework import mixins, status, viewsets
from rest_framework.filters import OrderingFilter
from rest_framework.response import Response

from base.mixins import GetSerializerClassMixin
from base.pagination import CustomCursorPagination
from base.storage.s3 import S3Storage
from bibliography.defs import CustomBibliographyFileS3Template, CustomBibliographyFileStatus
from bibliography.models import Bibliography, CustomBibliographyFile
from bibliography.serializers import (
    CreateBibilographySerializer,
    CustomBibliographyFileCreateSerializer,
    CustomBibliographyFileDetailSerializer,
    CustomBibliographyFileListSerializer,
    CustomBibliographyFileUpdateSerializer,
)


class BibliographyViewSet(
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    queryset = Bibliography.objects.all()
    serializer_class = CreateBibilographySerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ret = serializer.save()
        return Response(ret, status=status.HTTP_201_CREATED)


class CustomBibliographyFilePagination(CustomCursorPagination):
    ordering = ("ordering_priority", "-created_at")


class CustomBibliographyFileViewSet(
    GetSerializerClassMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.RetrieveModelMixin,
    mixins.ListModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    queryset = CustomBibliographyFile.objects.all()
    serializer_class = None
    serializer_action_classes = {
        "list": CustomBibliographyFileListSerializer,
        "retrieve": CustomBibliographyFileDetailSerializer,
        "create": CustomBibliographyFileCreateSerializer,
        "partial_update": CustomBibliographyFileUpdateSerializer,
    }
    pagination_class = CustomBibliographyFilePagination
    filter_backends = [OrderingFilter]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        qs = super().get_queryset().filter(user=self.request.user)

        status = self.request.query_params.get("status")
        ordering = self.request.query_params.get("ordering")

        if status is not None:
            qs = qs.filter(status=status)

        if not ordering:
            qs = qs.annotate(
                ordering_priority=Case(
                    When(
                        status__in=[
                            CustomBibliographyFileStatus.UPLOADING,
                            CustomBibliographyFileStatus.UPLOADED,
                        ],
                        then=Value(0),
                    ),
                    default=Value(1),
                    output_field=IntegerField(),
                )
            )
        return qs

    def perform_destroy(self, instance: CustomBibliographyFile) -> None:
        S3Storage().remove(CustomBibliographyFileS3Template.format(pk=instance.pk))
        instance.custombibliographychunkembeddings_set.all().delete()
        return super().perform_destroy(instance)
