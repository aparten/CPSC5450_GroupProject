from pydantic import BaseModel
from email.message import EmailMessage
from typing import Annotated
from app.models.email import EmailEvent, EmailParsed, EmailResolution, EmailAction, EmailResolutionBase
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from jsonschema import ValidationError
import uuid

from app import crud
from app.services.email_storage import save_raw_eml
from app.services.email_processing import parse_and_validate

from fastapi import APIRouter, Depends
from sqlmodel import Session, select, Sequence

from app.core.db import get_db
from app.crud import create_email_event
from app.services.email_filesystem import list_inbox_eml, claim_inbox_file
from app.tasks.worker import app as celery_app
from app.api.deps import CurrentUser

router = APIRouter(prefix="/email", tags=["email"])

RAW_DIR = Path("/app/email_data/raw")
INBOX_DIR = Path("/app/email_data/ingest_input")

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

    # NEXT (later): insert row into email_events with status='queued'
    # NEXT (later): celery task .delay(event_id)

    return {
        "event_id": event_id,
        "raw_path": str(raw_path),
        "status": "queued"
    }

@router.post("/ingest/inbox")
def ingest_inbox(db: Session = Depends(get_db)):
    filenames = list_inbox_eml()
    queued = []

    for filename in filenames:
        event_id = uuid.uuid4()

        # Move file to processing and get the actual path the worker should read
        processing_path = claim_inbox_file(filename, str(event_id))

        # Record event immediately (queued)
        crud.create_email_event(
            db,
            event_id=event_id,
            source_filename=filename,
            raw_path=str(processing_path),
        )

        # Enqueue task with the REAL file location
        celery_app.send_task("app.tasks.email_tasks.parse_inbox_email", args=[
            str(event_id),
            str(processing_path),
        ])

        queued.append({"event_id": str(event_id), "filename": filename})

    return {"queued_count": len(queued), "queued": queued}

# Endpoint to add an email to INBOX_DIR
@router.post("/add_email")
def add_email(file: UploadFile = File(...)):
    eml_bytes = file.file.read()
    _validate_upload(file, eml_bytes)

    filename = f"{file.filename}.eml"
    file_path = INBOX_DIR / filename

    try:
        with open(file_path, "wb") as f:
            f.write(eml_bytes)
    except Exception as e:
        raise HTTPException(500, f"Failed to save email to inbox: {e}")

    return {"status": "success", "file_path": str(file_path)}

@router.get('/messages')
async def list_messages(
        start: int = 0,
        limit: Annotated[int, Query(le=100)] = 100,
        db: Session = Depends(get_db),
) -> list[EmailEvent]:
    events = db.exec(select(EmailEvent)).all()
    return events

@router.get('/message/{message_id}')
async def get_message(
        message_id: uuid.UUID,
        db: Session = Depends(get_db),
):
    event = db.get(EmailEvent, message_id)
    message = db.get(EmailParsed, message_id)
    resolution = db.get(EmailResolution, message_id)
    return { "event": event, "message": message, "resultions": resolution }

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
    )
    db.add(resolution)
    db.commit()

    db.refresh(resolution)
    return resolution

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
