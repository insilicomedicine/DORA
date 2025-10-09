from django.db import models

from base.models import BaseModel
from documents.models import Document


class DocumentAIReview(BaseModel):
    document = models.ForeignKey(Document, verbose_name="Document", on_delete=models.CASCADE)
    type = models.TextField("Type", max_length=30)
    ai_review = models.JSONField("ai_review", null=True, blank=True)
