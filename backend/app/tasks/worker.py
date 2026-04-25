from celery import Celery
from app.core.config import settings

app = Celery(
    "app",
    broker=str(settings.REDIS_DSN),
    backend=str(settings.REDIS_DSN),
    include=[
        "app.tasks.tasks",
        "app.tasks.email_tasks"
    ],
)

app.conf.task_soft_time_limit = 120  # raises SoftTimeLimitExceeded after 2 min
app.conf.task_time_limit = 180       # hard kill after 3 min
app.conf.task_acks_late = True       # only ack after task completes (safer re-delivery)