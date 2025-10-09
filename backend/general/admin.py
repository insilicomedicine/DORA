from typing import Any

from django.contrib import admin
from django.db.models import JSONField
from django.db.models.query import QuerySet
from django.urls import reverse
from django.utils import timezone
from django.utils.html import mark_safe
from django_json_widget.widgets import JSONEditorWidget

from base.throttling import IPRateThrottle
from general.models import BlacklistedIP, Config, LogRecord


@admin.action(description="Unblock selected IPs")
def unblock_ips(modeladmin: Any, request: Any, queryset: QuerySet[BlacklistedIP]) -> None:
    throttle = IPRateThrottle()
    for blacklisted_ip in queryset:
        throttle.unblock(blacklisted_ip.ip_address)

        blacklisted_ip.blacklist_ends_at = timezone.now()
        blacklisted_ip.save()


class ConfigAdmin(admin.ModelAdmin):
    formfield_overrides = {
        JSONField: {"widget": JSONEditorWidget},
    }
    list_display = ["key", "created_at"]
    exclude = ["deleted_at"]


class BlacklistedIPExpiredFilter(admin.SimpleListFilter):
    LOOKUP_YES = "yes"
    LOOKUP_NO = "no"
    LOOKUPS = [(LOOKUP_YES, "Yes"), (LOOKUP_NO, "No")]

    title = "Expired"
    parameter_name = "expired"

    def lookups(self, request: Any, model_admin: Any) -> list[tuple[Any, str]]:
        return self.LOOKUPS

    def queryset(self, request: Any, queryset: QuerySet[Any]) -> QuerySet[Any] | None:
        value = self.value()
        if value is not None:
            now = timezone.now()
            if value == self.LOOKUP_YES:
                return queryset.filter(blacklist_ends_at__lt=now)
            elif value == self.LOOKUP_NO:
                return queryset.filter(blacklist_ends_at__gte=now)
        return queryset


class BlacklistedIPAdmin(admin.ModelAdmin):
    list_display = ["ip_address", "blacklist_starts_at", "blacklist_ends_at", "expired"]
    list_filter = ["ip_address", BlacklistedIPExpiredFilter]
    exclude = ["deleted_at"]
    actions = [unblock_ips]

    @admin.display(description="Expired", boolean=True)
    def expired(self, obj: BlacklistedIP) -> bool:
        return obj.expired


class LogRecordAdmin(admin.ModelAdmin):
    readonly_fields = ("created_at", "user", "value", "value_message", "formated_value")
    fieldsets = [(None, {"fields": (("created_at", "user"), "value_message", "formated_value")})]
    list_display = ["created_at", "link_to_user", "value_message"]
    list_select_related = ("user",)
    list_filter = ["created_at", "user"]

    @staticmethod
    def link_to_user(obj):
        if obj.user:
            link = reverse("admin:auth_user_change", args=[obj.user.pk])  # model name has to be lowercase
            return mark_safe(f'<a href="{link}">{obj.user}</a>')
        else:
            return ""

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user").only("created_at", "value", "user")


admin.site.register(Config, ConfigAdmin)
admin.site.register(BlacklistedIP, BlacklistedIPAdmin)
admin.site.register(LogRecord, LogRecordAdmin)
