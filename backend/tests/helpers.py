from typing import Optional

from django.contrib.auth.models import User
from humanfriendly.text import random_string

from documents.models import Document, Section


def create_document(user: User) -> Document:
    document = Document.objects.create(
        created_by=user,
        settings={"test": "test"},
        template_json={
            "name": "Test Document",
            "description": "Test Description",
            "sections": [{"slug": "Main", "title": "Main"}],
        },
    )
    Section.objects.create(
        document=document,
        slug="Main",
        title="Main",
        status="completed",
    )
    return document


def create_user(
    username: Optional[str] = None,
    password: str = "pass",  # nosec
    is_superuser: bool = False,
) -> User:
    if not username:
        username = f"{random_string(10)}@example.com"

    return User.objects.create_user(
        username=username,
        email=username,
        password=password,
        is_superuser=is_superuser,
    )
