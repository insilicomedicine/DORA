import logging
import os

import django
from celery import Celery
from celery.schedules import crontab
from celery.signals import setup_logging
from django.conf import settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "app.settings")

django.setup()

app = Celery("app")

app.config_from_object("django.conf:settings", namespace="CELERY")

app.autodiscover_tasks()
logger = logging.getLogger(__name__)

beat_schedule = {
    "sync_mcp_server_task": {
        "task": "sync_mcp_server_task",
        "schedule": crontab(minute=0, hour=0),
        "args": (),
    },
}

try:
    from payment.tasks import CELERY_TASKS

    beat_schedule.update(CELERY_TASKS)
except ImportError:
    logger.info("Celery tasks related to payment app were not imported")

app.conf.beat_schedule = beat_schedule


@setup_logging.connect
def config_loggers(*args, **kwargs):
    from logging.config import dictConfig

    dictConfig(settings.LOGGING)
