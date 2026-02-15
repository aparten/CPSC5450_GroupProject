from celery import Celery
from app.core.config import settings

app = Celery(
    "app",
    broker=str(settings.REDIS_DSN),
    backend=str(settings.REDIS_DSN),
    include=["app.tasks"],
)
