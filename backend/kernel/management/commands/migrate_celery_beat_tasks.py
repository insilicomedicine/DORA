from django.core.management.base import BaseCommand
from django_celery_beat.models import CrontabSchedule, IntervalSchedule, PeriodicTask


class Command(BaseCommand):
    help = "Migrate celery beat tasks from code configuration to django-celery-beat database"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting migration of celery beat tasks..."))

        # Define crontab-based tasks to migrate
        crontab_tasks = [
            {
                "name": "sync_mcp_server_task",
                "task": "sync_mcp_server_task",
                "crontab": {
                    "minute": "0",
                    "hour": "0",
                    "day_of_week": "*",
                    "day_of_month": "*",
                    "month_of_year": "*",
                },
                "args": [],
                "kwargs": {},
                "enabled": False,
                "description": "Daily task to sync tools from all active MCP servers",
            },
            {
                "name": "payment_reprocessing_webhook_events",
                "task": "payment_reprocessing_webhook_events",
                "crontab": {
                    "minute": "*/15",
                    "hour": "*",
                    "day_of_week": "*",
                    "day_of_month": "*",
                    "month_of_year": "*",
                },
                "args": [],
                "kwargs": {},
                "enabled": False,
                "description": "Reprocess failed webhook events every 15 minutes",
            },
            {
                "name": "payment_weekly_statistics_report",
                "task": "payment_weekly_statistics_report",
                "crontab": {
                    "minute": "0",
                    "hour": "0",
                    "day_of_week": "4",  # Thursday
                    "day_of_month": "*",
                    "month_of_year": "*",
                },
                "args": [],
                "kwargs": {},
                "enabled": False,
                "description": "Generate weekly payment statistics report every Thursday at midnight",
            },
        ]

        # Define interval-based tasks to migrate
        interval_tasks = [
            {
                "name": "schedule_pending_research_sessions",
                "task": "schedule_pending_research_sessions",
                "interval": {
                    "every": 1,
                    "period": IntervalSchedule.SECONDS,
                },
                "args": [],
                "kwargs": {},
                "enabled": False,
                "description": "Schedule pending research sessions every second",
                "queue": "beat",
            },
        ]

        migrated_count = 0

        # Migrate crontab tasks
        for task_config in crontab_tasks:
            # Create or get the crontab schedule
            schedule, created = CrontabSchedule.objects.get_or_create(
                minute=task_config["crontab"]["minute"],
                hour=task_config["crontab"]["hour"],
                day_of_week=task_config["crontab"]["day_of_week"],
                day_of_month=task_config["crontab"]["day_of_month"],
                month_of_year=task_config["crontab"]["month_of_year"],
            )

            if created:
                self.stdout.write(self.style.SUCCESS(f"  Created crontab schedule: {schedule}"))

            # Create or update the periodic task
            task, created = PeriodicTask.objects.update_or_create(
                name=task_config["name"],
                defaults={
                    "task": task_config["task"],
                    "crontab": schedule,
                    "interval": None,  # Clear interval if switching from interval to crontab
                    "args": task_config["args"],
                    "kwargs": task_config["kwargs"],
                    "enabled": task_config["enabled"],
                    "description": task_config.get("description", ""),
                    "queue": task_config.get("queue"),
                },
            )

            action = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"  {action} periodic task: {task.name} - {task.task}"))
            migrated_count += 1

        # Migrate interval tasks
        for task_config in interval_tasks:
            # Create or get the interval schedule
            schedule, created = IntervalSchedule.objects.get_or_create(
                every=task_config["interval"]["every"],
                period=task_config["interval"]["period"],
            )

            if created:
                self.stdout.write(self.style.SUCCESS(f"  Created interval schedule: {schedule}"))

            # Create or update the periodic task
            task, created = PeriodicTask.objects.update_or_create(
                name=task_config["name"],
                defaults={
                    "task": task_config["task"],
                    "interval": schedule,
                    "crontab": None,  # Clear crontab if switching from crontab to interval
                    "args": task_config["args"],
                    "kwargs": task_config["kwargs"],
                    "enabled": task_config["enabled"],
                    "description": task_config.get("description", ""),
                    "queue": task_config.get("queue"),
                },
            )

            action = "Created" if created else "Updated"
            self.stdout.write(self.style.SUCCESS(f"  {action} periodic task: {task.name} - {task.task}"))
            migrated_count += 1

        self.stdout.write(
            self.style.SUCCESS(f"\nMigration completed! {migrated_count} task(s) migrated to database.")
        )
        self.stdout.write(
            self.style.WARNING(
                "\nNote: You can now manage these tasks in Django Admin at /admin/django_celery_beat/"
            )
        )
