from django.db import models

from base.models import BaseModel


class BibliographyPubMed(BaseModel):
    pubmed_id = models.PositiveIntegerField(unique=True)
    metadata = models.JSONField()
    chunks = models.JSONField()
