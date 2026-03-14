import os
import json
from dataclasses import dataclass

from datetime import datetime, timezone
import hashlib
import numpy as np
import pandas as pd

import pickle

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix

JSONL_PATH = "default_emails_parsed_indicators_labeled.jsonl"
assert os.path.isfile(JSONL_PATH), f"JSONL not found: {JSONL_PATH}"

MODEL_OUTPUT_PATH = "model.pkl"

ENGINE_VERSION = "triage_v0.1_midterm"
THRESHOLDS_VERSION = "thr_v0.1"

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def sha256_of_text(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8", errors="ignore")).hexdigest()

@dataclass
class RationaleItem:
    signal: str
    evidence: str
    weight: float
    explanation: str

@dataclass
class ActionItem:
    action: str
    requires_human_approval: bool = True

@dataclass
class ModelInfo:
    engine_version: str
    thresholds_version: str
    model_type: str
    model_hash: str
    timestamp: str

@dataclass
class TriageOutput:
    email_id: str
    triage: dict
    rationale: list
    recommended_actions: list
    model_info: dict

TRIAGE_CLASSES = {"phishing", "suspicious", "benign"}
SEVERITY_LEVELS = {"low", "medium", "high", "critical"}

def load_jsonl(path: str, limit: int | None = None) -> list[dict]:
    out = []
    with open(path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f):
            if limit is not None and i >= limit:
                break
            out.append(json.loads(line))
    return out

records = load_jsonl(JSONL_PATH)
print("Loaded records:", len(records))
print("Example keys:", list(records[0].keys()))


# In[9]:


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

feat_rows = []
meta_rows = []

for rec in records:
    feat_rows.append(extract_features(rec))
    meta_rows.append({
        "email_id": rec["email_id"],
        "split": rec["source"]["split"],
        "label": rec.get("label", None),
    })

X_df = pd.DataFrame(feat_rows)[FEATURE_ORDER]
meta_df = pd.DataFrame(meta_rows)

print("Feature matrix shape:", X_df.shape)
print("Labels:", meta_df["label"].value_counts().to_dict())

X_df.head(3)


# In[10]:


# Scorecard baseline (rules) + triggered rationale

SCORE_WEIGHTS = {
    "has_url": 2.0,
    "shortener": 2.0,
    "punycode": 3.0,
    "unicode": 3.0,
    "lookalike_domain": 4.0,
    "has_ip": 2.0,
    "credentials_high": 4.0,
    "credentials_some": 2.0,
    "urgency_high": 2.0,
    "threat_some": 2.0,
    "payment_some": 2.0,
    "display_name_mismatch": 2.0,
    "sender_domain_mismatch": 3.0,
    "internal_impersonation": 4.0,
    "spf_fail": 2.0,
    "dkim_fail_or_none": 2.0,
    "dmarc_fail_or_none": 3.0,
    "macro_attachment": 3.0,
    "executable_attachment": 5.0,
}

SIGNAL_EXPLANATIONS = {
    "has_url": "Email contains at least one URL.",
    "shortener": "Email contains a URL shortener domain.",
    "punycode": "Email contains a punycode (xn--) domain, often used for lookalike attacks.",
    "unicode": "Email contains non-ASCII (Unicode) characters in a domain, possible homograph attack.",
    "lookalike_domain": "Email contains a domain that looks similar to a protected domain (heuristic).",
    "has_ip": "Email contains an IP address indicator (URL or literal).",
    "credentials_high": "Email contains multiple credential-related keywords (e.g., password, login).",
    "credentials_some": "Email contains credential-related keywords.",
    "urgency_high": "Email contains urgency cues (e.g., urgent, expires).",
    "threat_some": "Email contains threat/penalty language (e.g., suspended, compromised).",
    "payment_some": "Email contains payment/financial language (e.g., invoice, refund).",
    "display_name_mismatch": "Display name appears inconsistent with sender address (derived flag).",
    "sender_domain_mismatch": "Sender domain mismatch detected (derived flag).",
    "internal_impersonation": "Internal impersonation detected (derived flag).",
    "spf_fail": "SPF authentication failed or softfailed.",
    "dkim_fail_or_none": "DKIM missing or failed.",
    "dmarc_fail_or_none": "DMARC missing or failed.",
    "macro_attachment": "Macro-enabled attachment present (docm/xlsm/pptm).",
    "executable_attachment": "Executable/script attachment present (high risk).",
}

def scorecard(feat: dict) -> tuple[float, list[RationaleItem]]:
    score = 0.0
    rationale: list[RationaleItem] = []

    def add(signal: str, evidence: str, weight: float):
        nonlocal score
        score += weight
        rationale.append(RationaleItem(
            signal=signal,
            evidence=evidence,
            weight=float(weight),
            explanation=SIGNAL_EXPLANATIONS.get(signal, signal)
        ))

    if feat["num_urls"] > 0:
        add("has_url", "indicators.urls length > 0", SCORE_WEIGHTS["has_url"])
    if feat["any_shortener"] == 1:
        add("shortener", "indicators.urls[*].is_shortener = true", SCORE_WEIGHTS["shortener"])
    if feat["any_punycode"] == 1:
        add("punycode", "indicators.urls[*].punycode_domain != null OR domain contains xn--", SCORE_WEIGHTS["punycode"])
    if feat["any_unicode_suspicious"] == 1:
        add("unicode", "indicators.urls[*].unicode_suspicious = true", SCORE_WEIGHTS["unicode"])
    if feat["lookalike_domain_detected"] == 1 or feat["any_lookalike_domain"] == 1:
        add("lookalike_domain", "derived_flags.lookalike_domain_detected = true", SCORE_WEIGHTS["lookalike_domain"])
    if feat["has_ip_address"] == 1:
        add("has_ip", "indicators.ip_addresses length > 0 OR IP literal in URL", SCORE_WEIGHTS["has_ip"])

    if feat["credentials"] >= 2:
        add("credentials_high", "keyword_counts.credentials >= 2", SCORE_WEIGHTS["credentials_high"])
    elif feat["credentials"] == 1:
        add("credentials_some", "keyword_counts.credentials == 1", SCORE_WEIGHTS["credentials_some"])

    if feat["urgency"] >= 2:
        add("urgency_high", "keyword_counts.urgency >= 2", SCORE_WEIGHTS["urgency_high"])
    if feat["threat"] >= 1:
        add("threat_some", "keyword_counts.threat >= 1", SCORE_WEIGHTS["threat_some"])
    if feat["payment"] >= 1:
        add("payment_some", "keyword_counts.payment >= 1", SCORE_WEIGHTS["payment_some"])

    if feat["display_name_mismatch"] == 1:
        add("display_name_mismatch", "derived_flags.display_name_mismatch = true", SCORE_WEIGHTS["display_name_mismatch"])
    if feat["sender_domain_mismatch"] == 1:
        add("sender_domain_mismatch", "derived_flags.sender_domain_mismatch = true", SCORE_WEIGHTS["sender_domain_mismatch"])
    if feat["internal_impersonation"] == 1:
        add("internal_impersonation", "derived_flags.internal_impersonation = true", SCORE_WEIGHTS["internal_impersonation"])

    if feat["spf_fail"] == 1:
        add("spf_fail", "headers.auth_results.spf in {fail, softfail}", SCORE_WEIGHTS["spf_fail"])
    if feat["dkim_fail_or_none"] == 1:
        add("dkim_fail_or_none", "headers.auth_results.dkim in {fail, none}", SCORE_WEIGHTS["dkim_fail_or_none"])
    if feat["dmarc_fail_or_none"] == 1:
        add("dmarc_fail_or_none", "headers.auth_results.dmarc in {fail, none}", SCORE_WEIGHTS["dmarc_fail_or_none"])

    if feat["has_macro_attachment"] == 1:
        add("macro_attachment", "body.attachments include macro doc", SCORE_WEIGHTS["macro_attachment"])
    if feat["has_executable_attachment"] == 1:
        add("executable_attachment", "body.attachments include executable/script", SCORE_WEIGHTS["executable_attachment"])

    rationale.sort(key=lambda r: r.weight, reverse=True)
    return score, rationale

for idx in [0, 1, 2]:
    s, r = scorecard(feat_rows[idx])
    print("Email", idx, "score:", s, "top signals:", [ri.signal for ri in r[:3]])


# In[11]:


# 3-class triage thresholds (scorecard)

T_SUSP = 5.0
T_PHISH = 10.0

def score_to_triage_class(score: float) -> str:
    if score >= T_PHISH:
        return "phishing"
    if score >= T_SUSP:
        return "suspicious"
    return "benign"

baseline_preds = []
baseline_scores = []

for feat in feat_rows:
    s, _ = scorecard(feat)
    baseline_scores.append(s)
    baseline_preds.append(score_to_triage_class(s))

baseline_df = meta_df.copy()
baseline_df["risk_score"] = baseline_scores
baseline_df["triage_pred"] = baseline_preds

print(baseline_df["triage_pred"].value_counts().to_dict())
baseline_df.head(3)


# In[12]:


# Logistic Regression (binary) + probability bands → 3-class triage

y_bin = (meta_df["label"] == "phishing").astype(int).values

train_mask = (meta_df["split"] == "train").values
val_mask   = (meta_df["split"] == "val").values
test_mask  = (meta_df["split"] == "test").values

X = X_df.values.astype(float)

X_train, y_train = X[train_mask], y_bin[train_mask]
X_val,   y_val   = X[val_mask],   y_bin[val_mask]
X_test,  y_test  = X[test_mask],  y_bin[test_mask]

ml_pipeline = Pipeline([
    ("scaler", StandardScaler(with_mean=True, with_std=True)),
    ("clf", LogisticRegression(
        max_iter=2000,
        class_weight="balanced",
        solver="lbfgs"
    ))
])

ml_pipeline.fit(X_train, y_train)

p_val = ml_pipeline.predict_proba(X_val)[:, 1]
p_test = ml_pipeline.predict_proba(X_test)[:, 1]

P_LOW = 0.35
P_HIGH = 0.70

def prob_to_triage_class(p_phish: float) -> str:
    if p_phish >= P_HIGH:
        return "phishing"
    if p_phish >= P_LOW:
        return "suspicious"
    return "benign"

val_triage = np.array([prob_to_triage_class(p) for p in p_val])
test_triage = np.array([prob_to_triage_class(p) for p in p_test])

def triage_to_binary(triage_label: str) -> int:
    return 1 if triage_label == "phishing" else 0

val_pred_bin = np.array([triage_to_binary(t) for t in val_triage])
test_pred_bin = np.array([triage_to_binary(t) for t in test_triage])

print("=== Validation (binary report: phishing vs not) ===")
print(classification_report(y_val, val_pred_bin, target_names=["not_phish", "phish"]))

print("=== Test (binary report: phishing vs not) ===")
print(classification_report(y_test, test_pred_bin, target_names=["not_phish", "phish"]))

print("Test confusion matrix:\n", confusion_matrix(y_test, test_pred_bin))

model_hash = sha256_of_text(repr(ml_pipeline))[:12]
print("Model hash (short):", model_hash)

pred_df = meta_df.copy()
pred_df["p_phish"] = np.nan
pred_df.loc[val_mask, "p_phish"] = p_val
pred_df.loc[test_mask, "p_phish"] = p_test
pred_df.loc[train_mask, "p_phish"] = ml_pipeline.predict_proba(X_train)[:, 1]

pred_df["triage_pred_ml"] = pred_df["p_phish"].apply(lambda p: prob_to_triage_class(float(p)))
pred_df["triage_pred_scorecard"] = baseline_df["triage_pred"].values

pred_df.head(5)


# In[13]:


# Confidence calibration (Platt scaling)

import numpy as np
from sklearn.calibration import CalibratedClassifierCV

base_estimator = ml_pipeline

cal_model = CalibratedClassifierCV(
    estimator=base_estimator,
    method="sigmoid",
    cv=3
)

cal_model.fit(X_train, y_train)

p_train_cal = cal_model.predict_proba(X_train)[:, 1]
p_val_cal   = cal_model.predict_proba(X_val)[:, 1]
p_test_cal  = cal_model.predict_proba(X_test)[:, 1]

cal_model_hash = sha256_of_text(repr(cal_model))[:12]
print("Calibrated model hash (short):", cal_model_hash)

pred_df["p_phish_cal"] = np.nan
pred_df.loc[train_mask, "p_phish_cal"] = p_train_cal
pred_df.loc[val_mask, "p_phish_cal"] = p_val_cal
pred_df.loc[test_mask, "p_phish_cal"] = p_test_cal

pred_df[["email_id", "split", "label", "p_phish", "p_phish_cal"]].head(5)

# save
with open(MODEL_OUTPUT_PATH, "wb") as f:
    pickle.dump(cal_model, f, protocol=5)

# In[14]:


# Fusion logic (rules + calibrated ML + scorecard fallback)

P_LOW = 0.35
P_HIGH = 0.70

def prob_to_triage_class(p_phish: float) -> str:
    if p_phish >= P_HIGH:
        return "phishing"
    if p_phish >= P_LOW:
        return "suspicious"
    return "benign"

def hard_override_to_phishing(feat: dict) -> tuple[bool, str]:
    if feat["has_executable_attachment"] == 1:
        return True, "executable_attachment"
    if feat["internal_impersonation"] == 1 and feat["credentials"] >= 1:
        return True, "internal_impersonation"
    if feat["lookalike_domain_detected"] == 1 and feat["credentials"] >= 1:
        return True, "lookalike_domain"
    if feat["any_punycode"] == 1 and feat["credentials"] >= 1:
        return True, "punycode"
    if feat["any_unicode_suspicious"] == 1 and feat["credentials"] >= 1:
        return True, "unicode"
    if feat["dmarc_fail_or_none"] == 1 and feat["sender_domain_mismatch"] == 1 and feat["num_urls"] > 0:
        return True, "dmarc_fail_or_none"
    return False, ""

def fuse_decision(rec: dict, feat: dict, p_phish_cal: float | None) -> dict:
    score, _ = scorecard(feat)
    score_class = score_to_triage_class(score)

    override, override_signal = hard_override_to_phishing(feat)
    if override:
        return {
            "class": "phishing",
            "confidence": 0.95,
            "risk_score": float(score),
            "decision_source": "hard_override",
            "override_signal": override_signal,
            "p_phish_cal": float(p_phish_cal) if p_phish_cal is not None else None,
            "scorecard_class": score_class
        }

    if p_phish_cal is not None and not (isinstance(p_phish_cal, float) and np.isnan(p_phish_cal)):
        p = float(p_phish_cal)
        cls = prob_to_triage_class(p)
        conf = p if cls == "phishing" else (1.0 - p)
        conf = float(max(0.01, min(0.99, conf)))
        return {
            "class": cls,
            "confidence": conf,
            "risk_score": float(score),
            "decision_source": "calibrated_ml",
            "override_signal": None,
            "p_phish_cal": p,
            "scorecard_class": score_class
        }

    conf = float(max(0.01, min(0.99, score / (T_PHISH + 5.0))))
    return {
        "class": score_class,
        "confidence": conf,
        "risk_score": float(score),
        "decision_source": "scorecard_only",
        "override_signal": None,
        "p_phish_cal": None,
        "scorecard_class": score_class
    }

fusion_rows = []
for i, rec in enumerate(records):
    feat = feat_rows[i]
    p_cal = pred_df.loc[i, "p_phish_cal"]
    fusion_rows.append(fuse_decision(rec, feat, None if pd.isna(p_cal) else float(p_cal)))

fusion_df = pd.DataFrame(fusion_rows)
fusion_df.head(5)


# In[15]:


# Severity scoring & prioritization

def compute_severity(feat: dict, triage_class: str, risk_score: float) -> tuple[str, int]:
    s = 0

    if triage_class == "phishing":
        s += 8
    elif triage_class == "suspicious":
        s += 4
    else:
        s += 1

    if feat["num_urls"] > 0:
        s += 1
    s += 2 * feat["any_shortener"]
    s += 3 * feat["any_punycode"]
    s += 3 * feat["any_unicode_suspicious"]
    s += 4 * feat["lookalike_domain_detected"]
    s += 2 * feat["has_ip_address"]

    s += min(3, feat["urgency"])
    s += min(6, 2 * feat["credentials"])
    s += min(4, 2 * feat["payment"])
    s += min(4, 2 * feat["threat"])

    s += 3 * feat["sender_domain_mismatch"]
    s += 2 * feat["display_name_mismatch"]
    s += 4 * feat["internal_impersonation"]
    s += 2 * feat["spf_fail"]
    s += 2 * feat["dkim_fail_or_none"]
    s += 3 * feat["dmarc_fail_or_none"]

    s += 3 * feat["has_macro_attachment"]
    s += 6 * feat["has_executable_attachment"]

    if s >= 18:
        return "critical", int(s)
    if s >= 12:
        return "high", int(s)
    if s >= 6:
        return "medium", int(s)
    return "low", int(s)

severity_labels = []
severity_scores = []

for i in range(len(records)):
    feat = feat_rows[i]
    tri_cls = fusion_df.loc[i, "class"]
    rs = fusion_df.loc[i, "risk_score"]
    sev, sev_score = compute_severity(feat, tri_cls, rs)
    severity_labels.append(sev)
    severity_scores.append(sev_score)

fusion_df["severity"] = severity_labels
fusion_df["severity_score"] = severity_scores

print(fusion_df["severity"].value_counts().to_dict())
fusion_df.head(5)


# In[19]:


# Grounded rationale generator (top-K signals)
from dataclasses import asdict

def build_rationale(feat: dict, top_k: int = 6) -> list[dict]:
    _, rationale_items = scorecard(feat)
    top_items = rationale_items[:top_k]
    return [asdict(ri) for ri in top_items]

rationale_list = []

for i in range(len(records)):
    rationale_list.append(build_rationale(feat_rows[i], top_k=6))

rationale_list[0][:3]



# In[20]:


# Recommended actions (human approval only)

def recommend_actions(triage_class: str, severity: str) -> list[dict]:
    actions = []

    def add(action_name: str):
        actions.append({
            "action": action_name,
            "requires_human_approval": True
        })

    if triage_class == "phishing":
        add("quarantine_recommended")
        add("warn_user_recommended")
        add("create_ticket_recommended")
        if severity in {"high", "critical"}:
            add("block_domain_recommended")

    elif triage_class == "suspicious":
        add("create_ticket_recommended")
        if severity in {"medium", "high", "critical"}:
            add("warn_user_recommended")

    else:
        add("close_as_benign_recommended")
        if severity in {"medium", "high", "critical"}:
            add("monitor_sender_domain_recommended")

    return actions

actions_list = []

for i in range(len(records)):
    tri_cls = fusion_df.loc[i, "class"]
    sev = fusion_df.loc[i, "severity"]
    actions_list.append(recommend_actions(tri_cls, sev))

actions_list[0]


# In[21]:


# Build final triage output objects

def build_triage_output(i: int) -> dict:
    rec = records[i]
    feat = feat_rows[i]

    tri_cls = fusion_df.loc[i, "class"]
    conf = float(fusion_df.loc[i, "confidence"])
    risk_score = float(fusion_df.loc[i, "risk_score"])
    sev = fusion_df.loc[i, "severity"]
    sev_score = int(fusion_df.loc[i, "severity_score"])

    rationale = rationale_list[i]
    actions = actions_list[i]

    out = {
        "email_id": rec["email_id"],
        "triage": {
            "class": tri_cls,
            "confidence": conf,
            "risk_score": risk_score,
            "severity": sev,
            "severity_score": sev_score,
            "decision_source": fusion_df.loc[i, "decision_source"],
            "p_phish_cal": fusion_df.loc[i, "p_phish_cal"],
            "scorecard_class": fusion_df.loc[i, "scorecard_class"],
            "override_signal": fusion_df.loc[i, "override_signal"],
        },
        "rationale": rationale,
        "recommended_actions": actions,
        "model_info": {
            "engine_version": ENGINE_VERSION,
            "thresholds_version": THRESHOLDS_VERSION,
            "model_type": "calibrated_logreg_binary",
            "model_hash": cal_model_hash,
            "timestamp": now_iso(),
        }
    }

    assert out["triage"]["class"] in TRIAGE_CLASSES
    assert out["triage"]["severity"] in SEVERITY_LEVELS
    for a in out["recommended_actions"]:
        assert a.get("requires_human_approval", False) is True

    return out

preview0 = build_triage_output(0)
preview1 = build_triage_output(1)
preview0


# In[22]:


# Quick evaluation (fused triage → binary)

def triage_to_binary(cls: str) -> int:
    return 1 if cls == "phishing" else 0

y_true_test = y_test
triage_test = fusion_df.loc[test_mask, "class"].values
y_pred_test = np.array([triage_to_binary(c) for c in triage_test])

print("=== Fused system on TEST (binary report: phishing vs not) ===")
print(classification_report(y_true_test, y_pred_test, target_names=["not_phish", "phish"]))
print("Confusion matrix:\n", confusion_matrix(y_true_test, y_pred_test))

print("Triage distribution on TEST:", pd.Series(triage_test).value_counts().to_dict())


# In[23]:


import os
import json
import re
import numpy as np
import pandas as pd

from dataclasses import dataclass
from typing import Optional, List

from sklearn.metrics import classification_report, confusion_matrix, precision_recall_fscore_support

HOME = os.path.expanduser("~")
DOWNLOADS_DIR = os.path.join(HOME, "Downloads")
os.makedirs(DOWNLOADS_DIR, exist_ok=True)

OUT_TRIAGE_JSONL = os.path.join(DOWNLOADS_DIR, "triage_outputs.jsonl")
OUT_EVAL_JSON = os.path.join(DOWNLOADS_DIR, "midterm_eval_metrics.json")
OUT_FP_CSV = os.path.join(DOWNLOADS_DIR, "false_positives_top10.csv")
OUT_FN_CSV = os.path.join(DOWNLOADS_DIR, "false_negatives_top10.csv")
OUT_POSTER_TABLE_CSV = os.path.join(DOWNLOADS_DIR, "midterm_summary_table.csv")

print("Outputs will be saved to Downloads:")
print(" -", OUT_TRIAGE_JSONL)
print(" -", OUT_EVAL_JSON)
print(" -", OUT_FP_CSV)
print(" -", OUT_FN_CSV)
print(" -", OUT_POSTER_TABLE_CSV)


# In[24]:


TOKEN_RE = re.compile(r"[a-zA-Z0-9]+")

def normalize_subject_tokens(subject: Optional[str], max_tokens: int = 12) -> List[str]:
    if not subject:
        return []
    toks = TOKEN_RE.findall(subject.lower())
    toks = [t for t in toks if len(t) >= 3]
    return toks[:max_tokens]

def url_path_pattern(url: str) -> str:
    try:
        from urllib.parse import urlparse
        p = urlparse(url)
        host = (p.netloc or "").split("@")[-1].split(":")[0].lower()
        path = (p.path or "").strip("/")
        first_seg = path.split("/")[0] if path else ""
        return f"{host}/{first_seg}".strip("/")
    except Exception:
        return ""

def compute_indicator_fingerprint(rec: dict) -> str:
    domains = rec.get("indicators", {}).get("domains", []) or []
    domains = sorted({(d or "").lower().strip(".") for d in domains if d})

    urls = rec.get("indicators", {}).get("urls", []) or []
    patterns = []
    for uo in urls:
        u = uo.get("url_actual") or ""
        pat = url_path_pattern(u)
        if pat:
            patterns.append(pat)
    patterns = sorted(set(patterns))[:10]

    subject = rec.get("headers", {}).get("subject")
    subj_tokens = normalize_subject_tokens(subject)

    raw = "|".join(domains + patterns + subj_tokens)
    return hashlib.sha256(raw.encode("utf-8", errors="ignore")).hexdigest()

print("Fingerprint example:", compute_indicator_fingerprint(records[0])[:16])


# In[25]:


#Threshold config file (.yaml) for easy tuning


THRESHOLD_CONFIG_YAML = os.path.join(DOWNLOADS_DIR, "triage_thresholds.yaml")

yaml_text = f"""# triage_thresholds.yaml
engine_version: {ENGINE_VERSION}
thresholds_version: {THRESHOLDS_VERSION}

scorecard_thresholds:
  T_susp: {T_SUSP}
  T_phish: {T_PHISH}

probability_bands:
  P_low: {P_LOW}
  P_high: {P_HIGH}
"""

with open(THRESHOLD_CONFIG_YAML, "w", encoding="utf-8") as f:
    f.write(yaml_text)

print("Wrote threshold config:", THRESHOLD_CONFIG_YAML)


# In[32]:


# Batch triage runner + JSONL export

def build_triage_output_with_hooks(i: int) -> dict:
    out = build_triage_output(i)
    out["indicator_fingerprint"] = compute_indicator_fingerprint(records[i])

    assert "model_info" in out
    for k in ["engine_version", "thresholds_version", "model_hash", "timestamp"]:
        assert k in out["model_info"], f"Missing model_info.{k}"

    # if PydanticEnabled:
    #     validated = TriageOutputModel.model_validate(out)
    #     out = validated.model_dump(by_alias=True)

    return out

def batch_run_and_export(n_emails: int = 500, seed: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    total = len(records)

    if n_emails >= total:
        idxs = np.arange(total)
    else:
        idxs = rng.choice(total, size=n_emails, replace=False)

    with open(OUT_TRIAGE_JSONL, "w", encoding="utf-8") as f:
        for i in idxs:
            out = build_triage_output_with_hooks(int(i))
            f.write(json.dumps(out, ensure_ascii=False) + "\n")

    rows = []
    for i in idxs[:min(len(idxs), 2000)]:
        out = build_triage_output_with_hooks(int(i))
        rows.append({
            "email_id": out["email_id"],
            "split": records[int(i)]["source"]["split"],
            "true_label": records[int(i)].get("label"),
            "triage_class": out["triage"]["class"],
            "confidence": out["triage"]["confidence"],
            "risk_score": out["triage"]["risk_score"],
            "severity": out["triage"]["severity"],
            "severity_score": out["triage"]["severity_score"],
            "decision_source": out["triage"]["decision_source"],
            "indicator_fingerprint": out["indicator_fingerprint"][:16],
        })

    return pd.DataFrame(rows)

demo_df = batch_run_and_export(n_emails=500, seed=42)

print("Exported demo JSONL:", OUT_TRIAGE_JSONL)
print("Size (MB):", round(os.path.getsize(OUT_TRIAGE_JSONL) / (1024 * 1024), 2))

demo_df.head(10)


# In[33]:


#  Evaluation report

def triage_to_binary(pred_class: str) -> int:
    return 1 if pred_class == "phishing" else 0

test_indices = np.where(test_mask)[0].tolist()

test_outs = [build_triage_output_with_hooks(i) for i in test_indices]

y_true = np.array([1 if records[i]["label"] == "phishing" else 0 for i in test_indices])
y_pred_bin = np.array([triage_to_binary(o["triage"]["class"]) for o in test_outs])

prec, rec, f1, _ = precision_recall_fscore_support(y_true, y_pred_bin, average="binary", zero_division=0)
cm = confusion_matrix(y_true, y_pred_bin)

triage_classes_test = [o["triage"]["class"] for o in test_outs]
suspicious_rate = float(np.mean(np.array(triage_classes_test) == "suspicious"))

metrics = {
    "engine_version": ENGINE_VERSION,
    "thresholds_version": THRESHOLDS_VERSION,
    "model_hash": cal_model_hash,
    "evaluated_split": "test",
    "n_test": int(len(test_indices)),
    "binary_positive": "phishing",
    "precision_phishing": float(prec),
    "recall_phishing": float(rec),
    "f1_phishing": float(f1),
    "confusion_matrix": {
        "tn": int(cm[0, 0]),
        "fp": int(cm[0, 1]),
        "fn": int(cm[1, 0]),
        "tp": int(cm[1, 1]),
    },
    "suspicious_band_rate": suspicious_rate,
    "timestamp": now_iso(),
}

print("=== TEST Metrics (phishing vs not-phishing) ===")
print(json.dumps(metrics, indent=2))

with open(OUT_EVAL_JSON, "w", encoding="utf-8") as f:
    json.dump(metrics, f, indent=2)

print("Wrote metrics JSON:", OUT_EVAL_JSON)


# In[34]:


# False positives / false negatives tables

def top_signals(out: dict, k: int = 3) -> str:
    rs = out.get("rationale", [])[:k]
    return ", ".join([r.get("signal", "") for r in rs])

rows = []

for idx, out in zip(test_indices, test_outs):
    true_bin = 1 if records[idx]["label"] == "phishing" else 0
    pred_bin = triage_to_binary(out["triage"]["class"])

    rows.append({
        "email_id": out["email_id"],
        "true_label": records[idx]["label"],
        "pred_triage_class": out["triage"]["class"],
        "pred_confidence": out["triage"]["confidence"],
        "risk_score": out["triage"]["risk_score"],
        "severity": out["triage"]["severity"],
        "severity_score": out["triage"]["severity_score"],
        "decision_source": out["triage"]["decision_source"],
        "p_phish_cal": out["triage"]["p_phish_cal"],
        "indicator_fingerprint": out["indicator_fingerprint"],
        "top_rationale_signals": top_signals(out, k=3),
        "is_fp": int(true_bin == 0 and pred_bin == 1),
        "is_fn": int(true_bin == 1 and pred_bin == 0),
    })

err_df = pd.DataFrame(rows)

fp_df = err_df[err_df["is_fp"] == 1].sort_values(
    by=["pred_confidence", "severity_score", "risk_score"],
    ascending=False
).head(10)

fn_df = err_df[err_df["is_fn"] == 1].sort_values(
    by=["severity_score", "risk_score"],
    ascending=False
).head(10)

fp_df.to_csv(OUT_FP_CSV, index=False)
fn_df.to_csv(OUT_FN_CSV, index=False)

print("Wrote false positives:", OUT_FP_CSV, "| rows:", len(fp_df))
print("Wrote false negatives:", OUT_FN_CSV, "| rows:", len(fn_df))

fp_df.head(10)


# In[35]:


# simple summary table (CSV)


summary_table = pd.DataFrame([{
    "Engine Version": ENGINE_VERSION,
    "Thresholds Version": THRESHOLDS_VERSION,
    "Model Hash": cal_model_hash,
    "Test Size": metrics["n_test"],
    "Precision (phishing)": metrics["precision_phishing"],
    "Recall (phishing)": metrics["recall_phishing"],
    "F1 (phishing)": metrics["f1_phishing"],
    "TN": metrics["confusion_matrix"]["tn"],
    "FP": metrics["confusion_matrix"]["fp"],
    "FN": metrics["confusion_matrix"]["fn"],
    "TP": metrics["confusion_matrix"]["tp"],
    "Suspicious Band Rate (test)": metrics["suspicious_band_rate"],
    "Generated At (UTC)": metrics["timestamp"],
}])

summary_table.to_csv(OUT_POSTER_TABLE_CSV, index=False)
print("Wrote poster summary table:", OUT_POSTER_TABLE_CSV)
summary_table
