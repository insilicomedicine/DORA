from rest_framework import serializers

from documents.models import Document
from documents.utils import check_document_not_ready_for_modification, check_sections_with_in_progress_status
from users.defs import LIMITED_DOCUMENT_MESSAGE
from users.utils import can_edit


class DocumentAIReviewSerializer(serializers.Serializer):
    document_id = serializers.UUIDField()

    def validate(self, attrs):
        user = self.context["request"].user
        if not can_edit(user):
            raise serializers.ValidationError(LIMITED_DOCUMENT_MESSAGE)

        document_id = attrs["document_id"]
        document = Document.objects.filter(id=document_id, created_by=user).first()
        if not document:
            raise serializers.ValidationError("document not found")

        sections = document.sections.all()
        for error in [
            check_document_not_ready_for_modification(document),
            check_sections_with_in_progress_status(sections),
        ]:
            if error:
                raise serializers.ValidationError(error)

        return super().validate(attrs)
