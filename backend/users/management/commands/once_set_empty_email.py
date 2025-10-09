from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db.models import Q

from users.utils import find_user_email


class Command(BaseCommand):
    help = "Fills empty email fields for users using their username."

    def handle(self, *args, **kwargs):
        users_to_update = User.objects.filter(Q(email="") | Q(email__isnull=True))

        if not users_to_update.exists():
            self.stdout.write(self.style.SUCCESS("No users to update."))
            return

        for user in users_to_update:
            if email := find_user_email(user):
                user.email = email
                user.save()
                self.stdout.write(self.style.SUCCESS(f"Updated user {user.id}: email -> {user.email}"))
            else:
                self.stdout.write(self.style.ERROR(f"Invalid email for user {user.id}: {user.name}"))

        self.stdout.write(self.style.SUCCESS(f"Total users updated: {users_to_update.count()}"))
