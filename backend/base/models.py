import uuid

from django.db import models, transaction
from django.utils import timezone


class BaseQuerySet(models.QuerySet):
    def delete(self):
        with transaction.atomic():
            return super().update(deleted_at=timezone.now())

    def hard_delete(self):
        return super().delete()


class BaseManager(models.Manager):
    def __init__(self, *args, **kwargs):
        self.alive_only = kwargs.pop("alive_only", True)
        super().__init__(*args, **kwargs)

    def get_queryset(self):
        if self.alive_only:
            return BaseQuerySet(self.model).filter(deleted_at__isnull=True)
        return BaseQuerySet(self.model)

    def hard_delete(self):
        return self.get_queryset().hard_delete()


class BaseModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)  # TODO: Change to UUID v7
    created_at = models.DateTimeField("Created At", auto_now_add=True)
    updated_at = models.DateTimeField("Updated At", auto_now=True)
    deleted_at = models.DateTimeField("Deleted At", null=True, blank=True)

    objects = BaseManager()
    all_objects = BaseManager(alive_only=False)

    class Meta:
        abstract = True
        ordering = ["-created_at"]

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None

    def delete(self) -> None:
        with transaction.atomic():
            self.deleted_at = timezone.now()
            self.save()

    def hard_delete(self) -> None:
        with transaction.atomic():
            super().delete()

    def update_fields(self, fields: dict) -> None:
        with transaction.atomic():
            model = type(self)
            instance = model.objects.select_for_update().get(pk=self.pk)
            for field, value in fields.items():
                setattr(instance, field, value)
            instance.save(update_fields=fields.keys())
