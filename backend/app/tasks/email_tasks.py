# app/tasks/email_tasks.py
from __future__ import annotations
import uuid
from jsonschema import ValidationError
from .worker import app

from app.services.email_processing import parse_and_validate
from app.services.email_filesystem import (
    list_inbox_eml,
    claim_inbox_file,
    read_processing_eml,
    write_parsed_json,
    write_error,
    archive_raw_success,
)
from app.services.job_status import set_status

@app.task(name="scan_inbox_and_enqueue")
def scan_inbox_and_enqueue(limit: int = 50) -> dict:
    files = list_inbox_eml()[:limit]
    enqueued = 0

    for filename in files:
        event_id = str(uuid.uuid4())
        # enqueue parse job for each file
        parse_inbox_email.delay(event_id, filename)
        enqueued += 1

    return {"found": len(files), "enqueued": enqueued}

@app.task(bind=True, name="parse_inbox_email")
def parse_inbox_email(self, event_id: str, filename: str) -> dict:
    set_status(event_id, "processing", {"filename": filename})

    try:
        processing_path = claim_inbox_file(filename, event_id)
        eml_bytes = read_processing_eml(processing_path)

        payload = parse_and_validate(eml_bytes, email_id=event_id)
        out_path = write_parsed_json(event_id, payload)

        archive_path = archive_raw_success(processing_path)
        set_status(event_id, "done", {"parsed_path": str(out_path), "raw_path": str(archive_path)})

        return {"event_id": event_id, "parsed_path": str(out_path), "raw_path": str(archive_path)}

    except FileNotFoundError as e:
        # Somebody else already claimed it, or it was removed
        set_status(event_id, "skipped", {"filename": filename, "reason": str(e)})
        return {"event_id": event_id, "skipped": True, "reason": str(e)}

    except ValidationError as e:
        err_path = write_error(event_id, f"Schema validation failed: {e.message}")
        set_status(event_id, "failed", {"filename": filename, "error": e.message, "error_path": str(err_path)})
        raise

    except Exception as e:
        err_path = write_error(event_id, f"Unhandled error: {e}")
        set_status(event_id, "failed", {"filename": filename, "error": str(e), "error_path": str(err_path)})
        raise