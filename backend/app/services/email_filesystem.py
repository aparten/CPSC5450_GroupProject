# app/services/email_filesystem.py
from __future__ import annotations
from pathlib import Path
import shutil

EMAIL_DATA_ROOT = Path("/app/email_data")
INBOX_DIR = EMAIL_DATA_ROOT / "ingest_input"
PROCESSING_DIR = EMAIL_DATA_ROOT / "processing"
DONE_DIR = EMAIL_DATA_ROOT / "done"
PARSED_DIR = EMAIL_DATA_ROOT / "parsed"
ERRORS_DIR = EMAIL_DATA_ROOT / "errors"

def ensure_dirs() -> None:
    for d in [INBOX_DIR, PROCESSING_DIR, DONE_DIR, PARSED_DIR, ERRORS_DIR]:
        d.mkdir(parents=True, exist_ok=True)

def list_inbox_eml() -> list[str]:
    ensure_dirs()
    return sorted([p.name for p in INBOX_DIR.glob("*.eml") if p.is_file()])

def claim_inbox_file(filename: str, event_id: str) -> Path:
    """
    Move inbox/{filename} -> processing/{event_id}__{filename}
    This acts as a lock/claim.
    """
    ensure_dirs()
    src = INBOX_DIR / filename
    if not src.exists():
        raise FileNotFoundError(f"Inbox file not found: {filename}")

    dst = PROCESSING_DIR / f"{event_id}__{filename}"
    # Move within same volume should be atomic-ish
    src.replace(dst)
    return dst

def read_processing_eml(processing_path: Path) -> bytes:
    return processing_path.read_bytes()

def archive_raw_success(processing_path: Path) -> Path:
    ensure_dirs()
    dst = DONE_DIR / processing_path.name
    processing_path.replace(dst)
    return dst

def write_parsed_json(event_id: str, payload: dict) -> Path:
    import json
    ensure_dirs()
    out = PARSED_DIR / f"{event_id}.json"
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return out

def write_error(event_id: str, message: str) -> Path:
    ensure_dirs()
    out = ERRORS_DIR / f"{event_id}.txt"
    out.write_text(message, encoding="utf-8")
    return out