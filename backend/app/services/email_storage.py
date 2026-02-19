from pathlib import Path

RAW_DIR = Path("/app/email_data/raw")

def ensure_raw_dir() -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)

def save_raw_eml(event_id: str, eml_bytes: bytes) -> Path:
    ensure_raw_dir()
    raw_path = RAW_DIR / f"{event_id}.eml"
    raw_path.write_bytes(eml_bytes)
    return raw_path

def load_raw_eml(event_id: str) -> bytes:
    raw_path = RAW_DIR / f"{event_id}.eml"
    return raw_path.read_bytes()
