from django.contrib import admin

from dwh.models import BibliographyPubMed


class BibliographyPubMedAdmin(admin.ModelAdmin):
    list_display = ["id", "pubmed_id", "created_at", "updated_at"]


admin.site.register(BibliographyPubMed, BibliographyPubMedAdmin)
