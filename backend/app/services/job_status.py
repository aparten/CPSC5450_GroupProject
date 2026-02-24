from __future__ import annotations
import json
import os
from datetime import datetime, timezone
import redis

REDIS_DSN = os.getenv("REDIS_DSN", "redis://:password123@redis:6379/0")

def _client() -> redis.Redis:
    return redis.Redis.from_url(REDIS_DSN, decode_responses=True)

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()

def set_status(event_id: str, status: str, extra: dict | None = None) -> None:
    r = _client()
    payload = {"event_id": event_id, "status": status, "updated_at": _now()}
    if extra:
        payload.update(extra)
    r.set(f"email_event:{event_id}", json.dumps(payload))

def get_status(event_id: str) -> dict | None:
    r = _client()
    val = r.get(f"email_event:{event_id}")
    return json.loads(val) if val else None