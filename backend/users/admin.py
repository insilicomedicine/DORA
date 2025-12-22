from typing import Any

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.db.models.query import QuerySet

from users.models import AITokenUsage, Profile
from users.subscription.utils import SubscriptionFieldMixin


@admin.action(description="Unblock selected users")
def unblock_users(modeladmin: Any, request: Any, queryset: QuerySet[User]) -> None:
    for user in queryset:
        user.profile.unblock()


class UserBlockListFilter(admin.SimpleListFilter):
    LOOKUP_YES = "yes"
    LOOKUP_NO = "no"
    LOOKUPS = [(LOOKUP_YES, "Yes"), (LOOKUP_NO, "No")]

    title = "Is blocked"
    parameter_name = "is_blocked"

    def lookups(self, request: Any, model_admin: Any) -> list[tuple[Any, str]]:
        return self.LOOKUPS

    def queryset(self, request: Any, queryset: QuerySet[Any]) -> QuerySet[Any] | None:
        value = self.value()
        if value is not None:
            blocked_user_ids = [profile.user_id for profile in Profile.objects.all() if profile.is_blocked]
            if value == self.LOOKUP_YES:
                return queryset.filter(id__in=blocked_user_ids)
            elif value == self.LOOKUP_NO:
                return queryset.exclude(id__in=blocked_user_ids)
        return queryset


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    exclude = ["deleted_at"]


class UserAdmin(SubscriptionFieldMixin, BaseUserAdmin):
    inlines = [ProfileInline]
    list_display = (
        "username",
        "groups_display",
        "is_staff",
        "activated_at",
        "date_joined",
        "is_blocked",
    )
    list_filter = (
        "is_staff",
        "is_superuser",
        "is_active",
        "groups",
        "profile__activated_at",
        UserBlockListFilter,
    )
    ordering = ("-date_joined",)
    actions = [unblock_users]

    def get_inlines(self, request: Any, obj: User | None = None) -> list[type[admin.StackedInline]]:
        """Only show ProfileInline when editing existing users, not when creating new ones."""
        if obj is None:
            # obj is None when creating a new user
            return []
        return self.inlines

    @admin.display(description="Activated at")
    def activated_at(self, user: User) -> str:
        return user.profile.activated_at

    @admin.display(description="Is blocked", boolean=True)
    def is_blocked(self, user: User) -> bool:
        return user.profile.is_blocked

    @admin.display(description="Groups")
    def groups_display(self, user: User) -> str:
        return ", ".join([group.name for group in user.groups.all()])


class AITokenUsageAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "ai_model",
        "usage_type",
        "prompt_tokens",
        "completion_tokens",
        "tokens_used",
        "created_at",
    ]


admin.site.unregister(User)
admin.site.register(User, UserAdmin)
admin.site.register(AITokenUsage, AITokenUsageAdmin)
