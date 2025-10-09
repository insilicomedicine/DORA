from django.core.management.base import BaseCommand
from django.db.models import Q

from users.models import AITokenUsage


class Command(BaseCommand):
    help = "Correct ai_model in token usages once"

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS("Starting correction of AI model in token usages..."))

        self.correct_ai_model_in_token_usages()

        self.stdout.write(self.style.SUCCESS("Correction completed successfully."))

    def correct_ai_model_in_token_usages(self):
        model_usage_mapping = AITokenUsage.model_usage_type_mapping()

        for model, usage_types in model_usage_mapping.items():
            AITokenUsage.objects.filter(~Q(ai_model=model), usage_type__in=usage_types).update(ai_model=model)
