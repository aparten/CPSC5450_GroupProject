from fastapi import APIRouter, UploadFile, File, HTTPException
from jsonschema import ValidationError
import uuid

from app.services.email_storage import save_raw_eml
from app.services.email_processing import parse_and_validate

router = APIRouter(prefix="/email", tags=["email"])

RAW_DIR = Path("/app/email_data/raw")

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
