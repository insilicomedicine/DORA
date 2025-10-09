from django.contrib import admin

from bibliography.models import Bibliography


class BibliographyAdmin(admin.ModelAdmin):
    list_display = ["id", "content_type", "object_id", "created_at"]


admin.site.register(Bibliography, BibliographyAdmin)
