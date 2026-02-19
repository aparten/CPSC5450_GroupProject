from jsonschema import ValidationError
from app.services.email_parser import parse_eml_bytes, validate_payload

def parse_and_validate(eml_bytes: bytes, email_id: str) -> dict:
    payload = parse_eml_bytes(eml_bytes, email_id)
    validate_payload(payload)
    return payload
