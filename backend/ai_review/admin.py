from django.contrib import admin

from ai_review.models import DocumentAIReview


class DocumentAIReviewAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "type",
        "document_id",
        "created_at",
        "updated_at",
    ]


admin.site.register(DocumentAIReview, DocumentAIReviewAdmin)
