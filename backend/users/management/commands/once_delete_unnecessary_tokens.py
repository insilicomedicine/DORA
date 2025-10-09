from datetime import datetime

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from rest_framework.authtoken.models import Token


class Command(BaseCommand):
    help = "Deletes all Token records created on 6th of march 2025 and later."

    def handle(self, *args, **kwargs):
        date = datetime(2025, 3, 6, 0, 0)
        tokens = Token.objects.filter(created__gte=date)

        if not tokens.exists():
            self.stdout.write("No tokens found to be deleted.")
            return

        non_gmail_users = []
        gmail_users = []
        for token in tokens:
            user = User.objects.get(id=token.user_id)
            if user.email.endswith("@gmail.com"):
                gmail_users.append((user.username, token.key))
            else:
                non_gmail_users.append((user.username, token.key))

        if gmail_users:
            self.stdout.write("Gmail users:")
            for user, token_key in gmail_users:
                self.stdout.write(f"{user} - {token_key}")
            if input("Delete these tokens? [y/N] ").lower() == "y":
                Token.objects.filter(key__in=[token_key for _, token_key in gmail_users]).delete()
                self.stdout.write("Deleted.")
            else:
                self.stdout.write("Not deleted.")

        if non_gmail_users:
            self.stdout.write("Non-Gmail users:")
            for user, token_key in non_gmail_users:
                self.stdout.write(f"{user} - {token_key}")
            if input("Delete these tokens? [y/N] ").lower() == "y":
                Token.objects.filter(key__in=[token_key for _, token_key in non_gmail_users]).delete()
                self.stdout.write("Deleted.")
            else:
                self.stdout.write("Not deleted.")
