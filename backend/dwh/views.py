from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from dwh.requests.scientific_publication import ScientificPublicationMetadataRequest
from dwh.serializers import DwhScientificPublicationMetadataSerializer


class ScientificPublicationViewSet(viewsets.GenericViewSet):
    AUTHOR_PLACEHOLDER = "zzz"

    serializer_class = DwhScientificPublicationMetadataSerializer

    @action(methods=["post"], detail=False)
    def metadata(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order_by = serializer.validated_data["order_by"]
        pubmed_ids = serializer.validated_data["pubmed_ids"]
        if not pubmed_ids:
            return Response({"data": []})

        try:
            metadata = ScientificPublicationMetadataRequest(pubmed_ids).make_request()
        except ValueError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        for item in metadata:
            item["authors"] = item.get("authors") or []

        if order_by == DwhScientificPublicationMetadataSerializer.ORDER_BY_ID:
            sorted_metadata = sorted(metadata, key=lambda data: pubmed_ids.index(data.get("pubmed_id", 0)))
        else:
            sorted_metadata = sorted(
                metadata,
                key=lambda data: [
                    author if author is not None else self.AUTHOR_PLACEHOLDER
                    for author in (data["metadata"].get("authors") or [self.AUTHOR_PLACEHOLDER])
                ],
            )

        return Response({"data": sorted_metadata})
