from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
from jsonschema import ValidationError
import uuid

from app.services.email_storage import save_raw_eml
from app.services.email_processing import parse_and_validate
from app.tasks.email_tasks import parse_inbox_email

from fastapi import APIRouter
from app.tasks.email_tasks import scan_inbox_and_enqueue

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
def ingest_inbox(limit: int = 50):
    job = scan_inbox_and_enqueue.delay(limit=limit)
    return {"status": "queued", "task_id": job.id, "limit": limit}

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
