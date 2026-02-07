import json
from pathlib import Path
from email import policy
from email.parser import BytesParser
from jsonschema import validate, ValidationError
from datetime import datetime, timezone
from fastapi import HTTPException
from email.utils import parseaddr

SCHEMA_PATH = Path(__file__).resolve().parents[1] / "schema" / "email_schema.json"

def load_schema():
    try:
        return json.loads(SCHEMA_PATH.read_text())
    except FileNotFoundError:
        raise HTTPException(500, "Schema file not found.")
    except json.JSONDecodeError:
        raise HTTPException(500, "Invalid schema JSON.")

def parse_eml_bytes(eml_bytes: bytes) -> dict:
    message = BytesParser(policy=policy.default).parsebytes(eml_bytes)

    # Extract body
    plain_text = None
    html_text = None

    if message.is_multipart():
        for part in message.walk():
            ctype = part.get_content_type()
            disp = (part.get("Content-Disposition") or "").lower()

            if "attachment" in disp:
                continue

            if ctype == "text/plain" and plain_text is None:
                plain_text = part.get_content()
            elif ctype == "text/html" and html_text is None:
                html_text = part.get_content()
    else:
        content = message.get_content()
        if message.get_content_type() == "text/html":
            html_text = content
        else:
            plain_text = content

    # Extract display name
    from_display_name, from_address = parseaddr(message.get("From") or "")

    # Extract attachement filenames
    attachments = []
    for part in message.walk():
        disp = (part.get("Content-Disposition") or "").lower()
        if "attachment" in disp:
            filename = part.get_filename()
            if filename:
                ext = Path(filename).suffix or None
                attachments.append({
                    "filename": filename,
                    "file_ext": ext
                })

    # Build parsed email
    parsed_email = {
        "email_id": "123456",  # TODO: generate real ID

        "source": {
            "dataset": "unknown",   # TODO: fill in if needed
            "split": "train"        # TODO: make this dynamic
        },

        "headers": {
            "from_address": from_address or None,
            "from_display_name": from_display_name or None,
            "reply_to": message.get("Reply-To"),
            "return_path": message.get("Return-Path"),
            "to_address": message.get("To"),
            "subject": message.get("Subject"),
            "date": message.get("Date"),
            "message_id": message.get("Message-ID"),

            "auth_results": { # TODO: extract actual values
                "spf": None,
                "dkim": None,
                "dmarc": None
            }
        },

        "body": {
            "has_html": html_text is not None,
            "plain_text": plain_text,
            "attachments": attachments
        },

        "indicators": {
            "urls": [],        # TODO: extract URLs
            "domains": [],     # TODO: extract domains
            "ip_addresses": [] # TODO: extract IPs
        },

        "derived_flags": {
            "display_name_mismatch": False,
            "sender_domain_mismatch": False,
            "lookalike_domain_detected": False,
            "internal_impersonation": False,
            "unicode_trick_detected": False
        },

        "keyword_counts": { # Values that have not yet been set will be < 0 by default
            "urgency": -1,
            "credentials": -1,
            "payment": -1,
            "threat": -1
        },

        "label": "null"
    }

    return parsed_email

def validate_payload(payload: dict):
    schema = load_schema()
    validate(instance=payload, schema=schema)