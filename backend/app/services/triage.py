import numpy
import pickle
from pathlib import Path

from sklearn.calibration import CalibratedClassifierCV

from app.models.email import EmailParsed

CLASSIFIER_MODEL_PATH = Path("/app/triage_engine/model.pkl")

def _load_classifier(path: Path) -> CalibratedClassifierCV:
    with open(path, "rb") as f:
        return pickle.load(f)

class TriageEngine:
    def __init__(self):
        self.classifier = _load_classifier(CLASSIFIER_MODEL_PATH)

    def triage(self, email: dict) -> dict:
        features = extract_features(email)
        data = numpy.array([features[key] for key in FEATURE_ORDER]).reshape(1, -1)

        pred = self.classifier.predict_proba(data)

        return {
            "p_benign": float(pred[0, 0]),
            "p_phishing": float(pred[0, 1]),
        }

# Deterministic feature extraction

FEATURE_ORDER = [
    "num_urls",
    "num_domains",
    "any_shortener",
    "any_punycode",
    "any_unicode_suspicious",
    "any_lookalike_domain",
    "has_ip_address",
    "urgency",
    "credentials",
    "payment",
    "threat",
    "display_name_mismatch",
    "sender_domain_mismatch",
    "internal_impersonation",
    "unicode_trick_detected",
    "lookalike_domain_detected",
    "spf_fail",
    "dkim_fail_or_none",
    "dmarc_fail_or_none",
    "has_attachment",
    "has_macro_attachment",
    "has_executable_attachment",
]

def safe_get(d: dict, path: list[str], default=None):
    cur = d
    for k in path:
        if not isinstance(cur, dict) or k not in cur:
            return default
        cur = cur[k]
    return cur

def extract_features(rec: dict) -> dict:
    urls = safe_get(rec, ["indicators", "urls"], default=[]) or []
    domains = safe_get(rec, ["indicators", "domains"], default=[]) or []
    ips = safe_get(rec, ["indicators", "ip_addresses"], default=[]) or []

    num_urls = len(urls)
    num_domains = len(domains)

    any_shortener = int(any(u.get("is_shortener") for u in urls))
    any_punycode = int(any((u.get("punycode_domain") is not None) or ("xn--" in (u.get("domain") or "")) for u in urls))
    any_unicode = int(any(u.get("unicode_suspicious") for u in urls))
    any_lookalike_domain = int(bool(safe_get(rec, ["derived_flags", "lookalike_domain_detected"], default=False)))

    has_ip_address = int(len(ips) > 0)

    kw = safe_get(rec, ["keyword_counts"], default={}) or {}
    urgency = int(kw.get("urgency", 0) or 0)
    credentials = int(kw.get("credentials", 0) or 0)
    payment = int(kw.get("payment", 0) or 0)
    threat = int(kw.get("threat", 0) or 0)

    df = safe_get(rec, ["derived_flags"], default={}) or {}
    display_name_mismatch = int(bool(df.get("display_name_mismatch", False)))
    sender_domain_mismatch = int(bool(df.get("sender_domain_mismatch", False)))
    internal_impersonation = int(bool(df.get("internal_impersonation", False)))
    unicode_trick_detected = int(bool(df.get("unicode_trick_detected", False)))
    lookalike_domain_detected = int(bool(df.get("lookalike_domain_detected", False)))

    auth = safe_get(rec, ["headers", "auth_results"], default={}) or {}
    spf = (auth.get("spf") or "").lower()
    dkim = (auth.get("dkim") or "").lower()
    dmarc = (auth.get("dmarc") or "").lower()

    spf_fail = int(spf in {"fail", "softfail"})
    dkim_fail_or_none = int(dkim in {"fail", "none"} or dkim == "")
    dmarc_fail_or_none = int(dmarc in {"fail", "none"} or dmarc == "")

    attachments = safe_get(rec, ["body", "attachments"], default=[]) or []
    has_attachment = int(len(attachments) > 0)
    macro_ext = {"docm", "xlsm", "pptm"}
    exec_ext = {"exe", "js", "vbs", "ps1", "hta", "iso", "scr", "bat", "cmd"}

    has_macro_attachment = int(any((a.get("file_ext") or "").lower() in macro_ext for a in attachments))
    has_executable_attachment = int(any((a.get("file_ext") or "").lower() in exec_ext for a in attachments))

    feat = {
        "num_urls": num_urls,
        "num_domains": num_domains,
        "any_shortener": any_shortener,
        "any_punycode": any_punycode,
        "any_unicode_suspicious": any_unicode,
        "any_lookalike_domain": any_lookalike_domain,
        "has_ip_address": has_ip_address,
        "urgency": urgency,
        "credentials": credentials,
        "payment": payment,
        "threat": threat,
        "display_name_mismatch": display_name_mismatch,
        "sender_domain_mismatch": sender_domain_mismatch,
        "internal_impersonation": internal_impersonation,
        "unicode_trick_detected": unicode_trick_detected,
        "lookalike_domain_detected": lookalike_domain_detected,
        "spf_fail": spf_fail,
        "dkim_fail_or_none": dkim_fail_or_none,
        "dmarc_fail_or_none": dmarc_fail_or_none,
        "has_attachment": has_attachment,
        "has_macro_attachment": has_macro_attachment,
        "has_executable_attachment": has_executable_attachment,
    }

    for k in FEATURE_ORDER:
        if k not in feat:
            feat[k] = 0

    return feat
