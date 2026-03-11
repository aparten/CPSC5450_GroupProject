# app/tasks/email_tasks.py
from __future__ import annotations

from uuid import UUID
from sqlmodel import Session

from app.tasks.worker import app
from app.core.db import engine
from app import crud
from app.models.email import EmailStatus
from pathlib import Path

from app.services.email_processing import parse_and_validate
from app.services.email_filesystem import (
    read_processing_eml,
    write_parsed_json,
    write_error,
    archive_raw_success,
)
from app.services.job_status import set_status  # if you're still using this


@app.task(bind=True, name="app.tasks.email_tasks.parse_inbox_email")
def parse_inbox_email(self, event_id: str, processing_path: str) -> dict:
    event_uuid = UUID(event_id)

    # optional: status tracking
    set_status(event_id, "processing", {"processing_path": processing_path})

    with Session(engine) as session:
        try:
            crud.set_email_event_status(session, event_id=event_uuid, status=EmailStatus.processing)

            eml_bytes = read_processing_eml(Path(processing_path))
            payload = parse_and_validate(eml_bytes, email_id=event_id)

            # 1) Write parsed JSON to filesystem (you already have this working)
            out_path = write_parsed_json(event_id, payload)

            # 2) Write parsed result to DB (THIS is what you want)
            crud.upsert_email_parsed(session, event_id=event_uuid, payload=payload)

            # 3) Mark done, archive raw
            archive_raw_success(Path(processing_path))
            crud.set_email_event_status(session, event_id=event_uuid, status=EmailStatus.done)

            set_status(event_id, "done", {"parsed_path": str(out_path)})
            return {"event_id": event_id, "parsed_path": str(out_path)}

        except Exception as e:
            write_error(event_id, f"Unhandled error: {e}")
            crud.set_email_event_status(session, event_id=event_uuid, status=EmailStatus.failed, error=str(e))
            set_status(event_id, "failed", {"error": str(e)})
            raise