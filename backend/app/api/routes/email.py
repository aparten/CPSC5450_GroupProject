from app.models.audit import AuditEvent
from typing import Annotated
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from jsonschema import ValidationError
from pydantic import BaseModel
from sqlmodel import Session, delete, select

from app import crud
from app.api.deps import CurrentUser
from app.core.db import get_db
from app.models.email import EmailEvent, EmailAction, EmailParsed, EmailResolution, EmailResolutionBase
from app.services.email_filesystem import (
    INBOX_DIR,
    claim_inbox_file,
    list_inbox_eml,
    move_claimed_to_errors,
    purge_operational_dirs,
)
from app.services.email_processing import parse_and_validate
from app.services.email_storage import save_raw_eml
from app.tasks.worker import app as celery_app

router = APIRouter(prefix="/email", tags=["email"])

MAX_INBOX_BATCH = 100


def _validate_upload(file: UploadFile, eml_bytes: bytes) -> None:
    if not file.filename or not isinstance(file.filename, str):
        raise HTTPException(400, "Uploaded file has no filename")
    if not file.filename.lower().endswith(".eml"):
        raise HTTPException(400, "Please upload a .eml file")
    if not eml_bytes:
        raise HTTPException(400, "Uploaded file was empty")


@router.post("/ingest")
async def ingest_email(file: UploadFile = File(...)):
    eml_bytes = await file.read()
    _validate_upload(file, eml_bytes)

    event_id = str(uuid.uuid4())

    try:
        raw_path = save_raw_eml(event_id, eml_bytes)
    except Exception as e:
        raise HTTPException(500, f"Failed to write raw email file: {e}")

    return {
        "event_id": event_id,
        "raw_path": str(raw_path),
        "status": "queued"
    }


@router.post("/ingest/inbox")
def ingest_inbox(db: Session = Depends(get_db)):
    total_queued = []
    total_failed = []

    while True:
        filenames = list_inbox_eml()[:MAX_INBOX_BATCH]
        if not filenames:
            break

        for filename in filenames:
            event_id = uuid.uuid4()
            processing_path = None
            event_created = False

            try:
                processing_path = claim_inbox_file(filename, str(event_id))

                crud.create_email_event(
                    db,
                    event_id=event_id,
                    source_filename=filename,
                    raw_path=str(processing_path),
                )
                event_created = True

                celery_app.send_task("app.tasks.email_tasks.parse_inbox_email", args=[
                    str(event_id),
                    str(processing_path),
                ])

                total_queued.append({"event_id": str(event_id), "filename": filename})

            except Exception as e:
                if processing_path and processing_path.exists():
                    try:
                        move_claimed_to_errors(processing_path)
                    except Exception:
                        pass

                if event_created:
                    try:
                        db.exec(delete(EmailEvent).where(EmailEvent.event_id == event_id))
                        db.commit()
                    except Exception:
                        pass

                total_failed.append({"filename": filename, "error": str(e)})

    return {
        "queued_count": len(total_queued),
        "failed_count": len(total_failed),
        "queued": total_queued,
        "failed": total_failed,
    }


@router.post("/add_email")
def add_email(file: UploadFile = File(...)):
    eml_bytes = file.file.read()
    _validate_upload(file, eml_bytes)

    file_path = INBOX_DIR / file.filename

    try:
        file_path.write_bytes(eml_bytes)
    except Exception as e:
        raise HTTPException(500, f"Failed to save email to inbox: {e}")

    return {"status": "success", "file_path": str(file_path)}


@router.get('/messages')
async def list_messages(
        current_user: CurrentUser,
        start: int = 0,
        limit: Annotated[int, Query(le=100)] = 100,
        db: Session = Depends(get_db),
) -> list[EmailEvent]:
    return db.exec(select(EmailEvent).offset(start).limit(limit)).all()


@router.get('/message/{message_id}')
async def get_message(
        current_user: CurrentUser,
        message_id: uuid.UUID,
        db: Session = Depends(get_db),
):
    event = db.get(EmailEvent, message_id)
    message = db.get(EmailParsed, message_id)
    resolution = db.get(EmailResolution, message_id)
    return {"event": event, "message": message, "resolution": resolution}


@router.post('/message/{message_id}/resolve')
async def resolve_email(
        message_id: uuid.UUID,
        base_resolution: EmailResolutionBase,
        current_user: CurrentUser,
        db: Session = Depends(get_db),
) -> EmailResolution:
    resolution = EmailResolution(
        event_id=message_id,
        acting_user_id=current_user.id,
        action=base_resolution.action,
        reason=base_resolution.reason,
    )
    db.add(resolution)

    audit_event = AuditEvent(
        acting_user_id=current_user.id,
        action="email.resolve_email",
        data={
            "event_id": str(message_id),
        }
    )
    db.add(audit_event)

    db.commit()
    db.refresh(resolution)
    return resolution


@router.post("/purge_filesystem")
def purge_filesystem():
    """Delete all files from operational directories (done, errors, ingest_input, parsed, processing).
    Does not touch synthetic_test_pool. Use to reset state between test runs."""
    deleted = purge_operational_dirs()
    return {"deleted_total": sum(deleted.values()), "deleted_by_dir": deleted}


@router.post("/purge_db")
def purge_db(db: Session = Depends(get_db)):
    """Delete all rows from email tables in FK-safe order.
    Use alongside purge_filesystem for a full reset between test runs."""
    db.exec(delete(EmailResolution))
    db.exec(delete(EmailParsed))
    db.exec(delete(EmailEvent))
    db.commit()
    return {"status": "ok", "tables_cleared": ["email_resolution", "email_parsed", "email_events"]}


@router.post("/parse")
async def parse_email(file: UploadFile = File(...)):
    eml_bytes = await file.read()
    _validate_upload(file, eml_bytes)

    event_id = str(uuid.uuid4())

    try:
        raw_path = save_raw_eml(event_id, eml_bytes)
    except Exception as e:
        raise HTTPException(500, f"Failed to write raw email file: {e}")

    try:
        payload = parse_and_validate(eml_bytes, email_id=event_id)
    except ValidationError as e:
        raise HTTPException(422, f"Schema validation failed: {e.message}")

    return {
        "event_id": event_id,
        "raw_path": str(raw_path),
        "parsed": payload
    }
