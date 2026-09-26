"""
auditPitchContent(pitch_slides, policy_docs) -> structured audit report.

Output schema per claim (per the required contract):
  {
    "claim_text": str,
    "status": "Verified" | "Flagged" | "Untraceable" | "Context",
    "source_clause": str,      # exact sentence/snippet from the PDF backing the claim
    "confidence_score": int,   # 0-100
  }

Two audit engines, tried in order, so the app never hard-depends on a paid
or rate-limited API:
  1. Groq LLM strict-similarity check (when GROQ_API_KEY is configured):
     the model is shown the claim AND its cited clause and asked to verify
     the claim's numbers/wording actually appear in that clause, returning
     the schema above directly.
  2. Deterministic TF-IDF cosine similarity (always available, zero cost):
     independently re-derives a confidence score from the same index the
     generator drew from - it never just trusts the generator's own
     retrievalScore, so a bug in generation can't blind the audit too.

Either way this is a SEPARATE pass from generation, which is what makes an
audit meaningful rather than decorative.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.services import llm
from app.utils.tfidf import TfidfIndex

PASS_THRESHOLD = 0.35
FLAG_THRESHOLD = 0.15

STATUS_CONTEXT = "Context"
STATUS_VERIFIED = "Verified"
STATUS_FLAGGED = "Flagged"
STATUS_UNTRACEABLE = "Untraceable"


def _score_to_status(score: float) -> str:
    if score >= PASS_THRESHOLD:
        return STATUS_VERIFIED
    if score >= FLAG_THRESHOLD:
        return STATUS_FLAGGED
    return STATUS_UNTRACEABLE


async def _llm_verify_claim(claim_text: str, source_clause: str) -> dict[str, Any] | None:
    prompt = (
        f'Pitch bullet: """{claim_text}"""\n\n'
        f'Cited source clause from the policy brochure: """{source_clause}"""\n\n'
        "Perform a strict text-similarity/fact-check: does every number, percentage, "
        "and specific benefit in the pitch bullet actually appear (verbatim or as a "
        "clear paraphrase) in the cited source clause? Respond as a JSON object with "
        'exactly these keys: "status" (one of "Verified", "Flagged", "Untraceable" - '
        'Verified if all figures match, Flagged if partially supported/ambiguous, '
        'Untraceable if the bullet contains a number or claim NOT present in the clause), '
        '"confidence_score" (integer 0-100), "source_clause" (the exact sentence or '
        "phrase from the cited clause that most directly proves the claim - quote it "
        'verbatim from the clause text given above).'
    )
    data = await llm.complete_json(prompt, max_tokens=300, temperature=0.0)
    if not isinstance(data, dict):
        return None
    status = data.get("status")
    if status not in (STATUS_VERIFIED, STATUS_FLAGGED, STATUS_UNTRACEABLE):
        return None
    try:
        confidence = int(data.get("confidence_score"))
    except (TypeError, ValueError):
        return None
    confidence = max(0, min(100, confidence))
    quoted = str(data.get("source_clause") or source_clause).strip()
    return {"status": status, "confidence_score": confidence, "source_clause": quoted}


def audit_pitch_content(pitch_slides: list[dict], policy_index: TfidfIndex) -> dict[str, Any]:
    """Synchronous, deterministic audit path (TF-IDF only). Kept as the
    default/fast entry point and as the guaranteed fallback the async path
    below uses when Groq is unavailable or fails on a given claim."""
    claim_results: list[dict[str, Any]] = []
    docs_by_id = {d.id: d for d in policy_index.docs}

    for slide in pitch_slides:
        for claim in slide["claims"]:
            ctype = claim["type"]

            if ctype in ("context", "assumption_flag", "verified_flag"):
                claim_results.append({
                    "claimId": claim["id"], "slideId": slide["id"], "claim_text": claim["text"],
                    "status": STATUS_CONTEXT, "confidence_score": None,
                    "reason": "Non-policy statement (company context, live-data provenance note, or Marsh value prop) - not subject to source-clause verification.",
                    "source_clause": None, "sourceClauseId": None,
                })
                continue

            if ctype == "recommendation":
                claim_results.append({
                    "claimId": claim["id"], "slideId": slide["id"], "claim_text": claim["text"],
                    "status": STATUS_CONTEXT, "confidence_score": None,
                    "reason": "Derived from the comparator rubric on this slide - verify the rubric rows instead of this summary line.",
                    "source_clause": None, "sourceClauseId": None,
                })
                continue

            # type == "policy_claim": this MUST trace to a real clause.
            source_clause_id = claim.get("sourceClauseId")
            if not source_clause_id:
                claim_results.append({
                    "claimId": claim["id"], "slideId": slide["id"], "claim_text": claim["text"],
                    "status": STATUS_UNTRACEABLE, "confidence_score": 0,
                    "reason": "No source clause attached at generation time - untraceable claim.",
                    "source_clause": None, "sourceClauseId": None,
                })
                continue

            source_doc = docs_by_id.get(source_clause_id)
            if not source_doc:
                claim_results.append({
                    "claimId": claim["id"], "slideId": slide["id"], "claim_text": claim["text"],
                    "status": STATUS_UNTRACEABLE, "confidence_score": 0,
                    "reason": f"Cited clause id {source_clause_id} does not exist in the ingested policy index.",
                    "source_clause": None, "sourceClauseId": source_clause_id,
                })
                continue

            similarity = policy_index.similarity(claim["text"], source_doc.text)
            status = _score_to_status(similarity)

            claim_results.append({
                "claimId": claim["id"], "slideId": slide["id"], "claim_text": claim["text"],
                "status": status, "confidence_score": round(similarity * 100),
                "reason": (
                    "Bullet text closely matches the cited policy clause." if status == STATUS_VERIFIED else
                    "Bullet text only partially overlaps the cited clause - recommend advisor spot-check before sending." if status == STATUS_FLAGGED else
                    "Bullet text does not sufficiently match the cited clause - likely paraphrase drift or fabrication risk."
                ),
                "source_clause": source_doc.text,
                "sourceClauseId": source_doc.id,
                "sourceInsurer": source_doc.insurer,
                "sourceDocName": source_doc.doc_name,
                "sourcePage": source_doc.page,
            })

    return _summarize(claim_results)


async def audit_pitch_content_async(pitch_slides: list[dict], policy_index: TfidfIndex) -> dict[str, Any]:
    """Preferred entry point: runs the deterministic TF-IDF audit first (so
    there's always a result), then - if a free Groq key is configured -
    upgrades every "policy_claim" verdict with a strict LLM fact-check
    against its own cited clause, overwriting the TF-IDF verdict only when
    the LLM call succeeds and returns a well-formed response."""
    base_report = audit_pitch_content(pitch_slides, policy_index)
    if not llm.has_llm():
        return base_report

    docs_by_id = {d.id: d for d in policy_index.docs}
    for claim in base_report["claims"]:
        if claim["status"] == STATUS_CONTEXT or not claim.get("sourceClauseId"):
            continue
        source_doc = docs_by_id.get(claim["sourceClauseId"])
        if not source_doc:
            continue
        try:
            verdict = await _llm_verify_claim(claim["claim_text"], source_doc.text)
        except Exception as exc:  # noqa: BLE001
            print(f"[auditor] Groq verification failed for claim {claim['claimId']}: {exc}")
            verdict = None
        if verdict:
            claim["status"] = verdict["status"]
            claim["confidence_score"] = verdict["confidence_score"]
            claim["source_clause"] = verdict["source_clause"]
            claim["reason"] = f"Groq-verified ({llm.DEFAULT_MODEL}): " + {
                STATUS_VERIFIED: "figures/wording confirmed present in the cited clause.",
                STATUS_FLAGGED: "partially supported by the cited clause - advisor should spot-check.",
                STATUS_UNTRACEABLE: "contains a figure or claim not found in the cited clause.",
            }[verdict["status"]]

    return _summarize(base_report["claims"])


def _summarize(claim_results: list[dict[str, Any]]) -> dict[str, Any]:
    auditable = [c for c in claim_results if c["status"] != STATUS_CONTEXT]
    verified_count = sum(1 for c in auditable if c["status"] == STATUS_VERIFIED)
    flagged_count = sum(1 for c in auditable if c["status"] == STATUS_FLAGGED)
    untraceable_count = sum(1 for c in auditable if c["status"] == STATUS_UNTRACEABLE)
    overall_score = round(((verified_count + 0.5 * flagged_count) / len(auditable)) * 100) if auditable else 100

    overall_status = (
        "FAIL \u2014 human review required" if untraceable_count > 0 else
        "PASS WITH FLAGS" if flagged_count > 0 else
        "PASS"
    )

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "overallStatus": overall_status,
        "overallScore": overall_score / 100,  # kept 0-1 for backward compat with pptx builder
        "confidenceScore": overall_score,       # 0-100, for the dashboard donut
        "summary": {
            "total": len(auditable), "pass": verified_count, "flag": flagged_count,
            "fail": untraceable_count, "infoOnly": len(claim_results) - len(auditable),
            "verified": verified_count, "flagged": flagged_count, "untraceable": untraceable_count,
        },
        "claims": claim_results,
        "advisorGuidance": (
            "One or more claims could not be traced to policy text. Remove or manually "
            "correct flagged/untraceable bullets before this deck goes to the client." if untraceable_count > 0 else
            "All claims trace to policy text but some are partial matches. Spot-check "
            "flagged bullets, then approve." if flagged_count > 0 else
            "Every policy claim traces cleanly to source clauses. Safe to approve as-is, "
            "subject to normal sign-off."
        ),
    }
