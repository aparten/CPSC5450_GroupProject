"""
Generate synthetic .eml files from the labeled JSONL dataset.

Usage:
    python scripts/generate_test_emails.py --count 500
    python scripts/generate_test_emails.py --count 500 --output backend/app/email_data/synthetic_test_pool/

The JSONL records originate from a CSV dataset and have null header fields.
This script synthesizes plausible RFC 2822 headers from the label and record index
so the resulting .eml files exercise the full ingestion pipeline.
"""

from __future__ import annotations

import argparse
import json
import random
import uuid
from collections import Counter
from datetime import datetime, timezone, timedelta
from email.message import EmailMessage
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
JSONL_PATH = REPO_ROOT / "triage_engine" / "default_emails_parsed_indicators_labeled.jsonl"
DEFAULT_OUTPUT = REPO_ROOT / "backend" / "app" / "email_data" / "synthetic_test_pool"

# Synthetic sender pools keyed by label
_PHISHING_SENDERS = [
    ("Account Security", "security-noreply@acc0unt-verify.com"),
    ("IT Helpdesk", "helpdesk@corp-support-desk.net"),
    ("PayPal", "service@paypa1-billing.com"),
    ("Microsoft Support", "support@micros0ft-alerts.org"),
    ("HR Department", "hr-team@company-benefits-portal.com"),
]
_BENIGN_SENDERS = [
    ("Alice Johnson", "alice.johnson@university.edu"),
    ("Bob Martinez", "bob.martinez@company.com"),
    ("Carol Lee", "carol.lee@nonprofit.org"),
    ("Dave Kim", "dave.kim@startup.io"),
    ("Eve Nguyen", "eve.nguyen@consulting.co"),
]
_SUSPICIOUS_SENDERS = [
    ("Newsletter", "info@bulk-mailer-promo.biz"),
    ("Deals Team", "deals@discount-offers-daily.com"),
    ("Admin", "admin@webmail-update-required.net"),
]

_SUBJECTS = {
    "phishing": [
        "Urgent: Verify your account immediately",
        "Action required: Your password will expire",
        "Your account has been compromised",
        "Invoice #{{n}} overdue — immediate payment required",
        "IT Alert: Reset your credentials now",
        "Suspicious login detected on your account",
    ],
    "benign": [
        "Re: Meeting notes from Tuesday",
        "Project update for Q{{n}}",
        "Lunch plans for Friday?",
        "Reminder: Team standup at 10am",
        "FYI: Updated policy document attached",
        "Welcome to the team!",
    ],
    "suspicious": [
        "You've been selected for a special offer",
        "Limited time: Claim your reward",
        "Important update about your subscription",
        "Unsubscribe from our mailing list",
        "Your free trial is ending soon",
    ],
}

_TO_ADDRESSES = [
    "analyst@soc.internal",
    "security-team@soc.internal",
    "inbox@phish-trap.internal",
]


def _pick_sender(label: str, idx: int) -> tuple[str, str]:
    pool = {"phishing": _PHISHING_SENDERS, "benign": _BENIGN_SENDERS}.get(
        label, _SUSPICIOUS_SENDERS
    )
    return pool[idx % len(pool)]


def _pick_subject(label: str, idx: int) -> str:
    options = _SUBJECTS.get(label, _SUBJECTS["suspicious"])
    s = options[idx % len(options)]
    return s.replace("{{n}}", str(idx))


def _random_date(seed: int) -> str:
    rng = random.Random(seed)
    base = datetime(2024, 1, 1, tzinfo=timezone.utc)
    offset = timedelta(days=rng.randint(0, 365), hours=rng.randint(0, 23))
    return (base + offset).strftime("%a, %d %b %Y %H:%M:%S +0000")


def record_to_eml(record: dict, idx: int) -> bytes:
    label = record.get("label") or "benign"
    display_name, from_addr = _pick_sender(label, idx)

    msg = EmailMessage()
    msg["From"] = f"{display_name} <{from_addr}>"
    msg["To"] = _TO_ADDRESSES[idx % len(_TO_ADDRESSES)]
    msg["Subject"] = _pick_subject(label, idx)
    msg["Date"] = _random_date(idx)
    msg["Message-ID"] = f"<{uuid.uuid4()}@synthetic.test>"

    auth_results = record.get("headers", {}).get("auth_results", {}) or {}
    spf = auth_results.get("spf") or "none"
    dkim = auth_results.get("dkim") or "none"
    dmarc = auth_results.get("dmarc") or "none"
    msg["Authentication-Results"] = (
        f"synthetic.test; spf={spf}; dkim={dkim}; dmarc={dmarc}"
    )

    body_text = (record.get("body") or {}).get("plain_text") or "(no body)"
    msg.set_content(body_text)

    return bytes(msg)


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic .eml test files")
    parser.add_argument("--count", type=int, default=500, help="Number of emails to generate")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Output directory")
    args = parser.parse_args()

    args.output.mkdir(parents=True, exist_ok=True)

    records: list[dict] = []
    with open(JSONL_PATH, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                records.append(json.loads(line))
            if len(records) >= args.count:
                break

    if len(records) < args.count:
        print(f"Warning: only {len(records)} records available, generating all of them.")

    label_counts: Counter = Counter()
    for idx, record in enumerate(records):
        label = record.get("label") or "benign"
        filename = f"{idx:04d}_{label}.eml"
        eml_bytes = record_to_eml(record, idx)
        (args.output / filename).write_bytes(eml_bytes)
        label_counts[label] += 1

    total = sum(label_counts.values())
    print(f"Generated {total} .eml files in {args.output}")
    for label, count in sorted(label_counts.items()):
        print(f"  {label}: {count}")


if __name__ == "__main__":
    main()
