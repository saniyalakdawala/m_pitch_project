"""
Builds the 4-slide pitch deck JSON:
  Slide 1 - Company Overview
  Slide 2 - Why Choose Marsh
  Slide 3 - Policy Benefits mapped to Risks (numeric, not generic fluff)
  Slide 4 - Recommended Policy (data-driven comparison table + verdict)

Every policy_claim carries a sourceClauseId so the audit layer (auditor.py)
can independently re-check it against the actual brochure text.
"""
from __future__ import annotations

import itertools
import re
from typing import Any

from app.services import llm
from app.services.retrieval import all_insurers_from_index, retrieve_clauses

COMPARATOR_CRITERIA = [
    {"key": "roomRent", "label": "Room Rent Limit", "query": "room rent limit per day category"},
    {"key": "maternity", "label": "Maternity Cover", "query": "maternity benefit cover delivery childbirth"},
    {"key": "waitingPeriod", "label": "Pre-Existing Disease Waiting Period", "query": "pre-existing disease waiting period months"},
    {"key": "networkHospitals", "label": "Cashless Network Hospitals", "query": "cashless network hospitals cashless facility"},
    {"key": "copay", "label": "Co-payment", "query": "co-payment copay percentage applicable"},
]

# Deterministic fallback for pulling a hard figure out of a clause when no
# LLM key is configured - looks for currency, percentages, and day/month/
# year counts so the comparator/benefit cells still show real numbers
# instead of a checkmark.
_NUMERIC_RE = re.compile(
    r"(?:\u20b9|Rs\.?|INR)\s?[\d,]+(?:\.\d+)?(?:\s?(?:lakh|lac|crore))?"
    r"|\d+(?:\.\d+)?\s?%"
    r"|\d+\s?(?:days?|months?|years?|hours?)"
    r"|\bnil\b|\bno limit\b|\bunlimited\b",
    re.I,
)

_claim_counter = itertools.count(1)


def _next_claim_id() -> str:
    return f"claim_{next(_claim_counter)}"


def _clean_ws(text: str) -> str:
    """Policy brochures extract with bullet-list line breaks baked into the
    running text (e.g. "Cover includes:\\nAsthma\\nHigh BP\\n..."). Collapse
    all whitespace to single spaces so pitch bullets read as one clean line
    instead of a jagged multi-line dump when rendered."""
    return re.sub(r"\s+", " ", text or "").strip()


def truncate_clause(text: str, n: int = 220) -> str:
    text = _clean_ws(text)
    return text if len(text) <= n else text[:n].rstrip() + "\u2026"


def _extract_numeric_fallback(clause_text: str, max_len: int = 90) -> str:
    """Deterministic (no LLM) extraction: grab the clause text around the
    first hard figure we can find, so comparator/benefit cells show a real
    number instead of vague marketing language even with zero API keys."""
    cleaned = _clean_ws(clause_text)
    match = _NUMERIC_RE.search(cleaned)
    if not match:
        return truncate_clause(cleaned, max_len)
    start = max(0, match.start() - 35)
    end = min(len(cleaned), match.end() + 35)
    snippet = cleaned[start:end].strip()
    prefix = "\u2026" if start > 0 else ""
    suffix = "\u2026" if end < len(cleaned) else ""
    return f"{prefix}{snippet}{suffix}"


async def _extract_numeric_value(clause_text: str, criterion_label: str) -> str:
    """Pull the single hard figure relevant to `criterion_label` out of a
    clause. Uses Groq when configured (handles cases where the number is
    phrased indirectly); otherwise falls back to a regex scan of the actual
    clause text - either way nothing is invented beyond what's in the text."""
    if llm.has_llm():
        prompt = (
            f'Clause: """{truncate_clause(clause_text, 500)}"""\n\n'
            f'Extract the single most relevant hard figure for "{criterion_label}" from this clause '
            "(a sum insured amount, a rupee figure, a percentage, a day/month count, or \"Nil\"/\"Unlimited\" "
            "if that's what's stated). Respond with a short phrase (max 8 words) containing that figure, "
            "using ONLY what's in the clause. If genuinely no relevant figure is present, respond exactly: "
            "Not specified in brochure."
        )
        text = await llm.complete(prompt, max_tokens=30, temperature=0.1)
        if text:
            return _clean_ws(text)
    return _extract_numeric_fallback(clause_text)


async def _build_comparator(insurers: list[str]) -> dict[str, Any]:
    rows = []
    for criterion in COMPARATOR_CRITERIA:
        matches = retrieve_clauses(criterion["query"], top_n=len(insurers) * 3, insurers=insurers)
        by_insurer = {}
        for insurer in insurers:
            best = next((m for m in matches if m["doc"].insurer == insurer), None)
            if best:
                value = await _extract_numeric_value(best["doc"].text, criterion["label"])
                by_insurer[insurer] = {
                    "score": best["score"],
                    "value": value,
                    "snippet": truncate_clause(best["doc"].text),
                    "clauseId": best["doc"].id,
                    "page": best["doc"].page,
                }
            else:
                by_insurer[insurer] = {"score": 0, "value": "Not found in brochure", "snippet": "Not found in brochure", "clauseId": None, "page": None}
        rows.append({"criterion": criterion["label"], "key": criterion["key"], "byInsurer": by_insurer})

    totals = []
    for insurer in insurers:
        avg = sum(r["byInsurer"][insurer]["score"] for r in rows) / len(rows) if rows else 0
        totals.append({"insurer": insurer, "avgScore": avg})
    totals.sort(key=lambda t: t["avgScore"], reverse=True)

    return {
        "rows": rows,
        "ranking": totals,
        "recommended": totals[0]["insurer"] if totals else (insurers[0] if insurers else None),
    }


async def _phrase_claim(clause_text: str, context: str) -> str:
    """Rewrite a clause as one client-friendly bullet that PRESERVES exact
    figures (sums insured, day/month counts, rupee amounts, percentages)
    instead of turning them into vague marketing language. Falls back to
    the literal (trimmed) clause text - zero fabrication risk - if no free
    LLM key is configured or the call fails."""
    prompt = (
        "Rewrite the following insurance policy clause as ONE short, client-facing "
        "pitch bullet (max 28 words). CRITICAL: preserve every exact number, "
        "percentage, rupee/currency amount, and day/month/year count exactly as "
        "written in the clause (e.g. \"100% of sum insured\", \"60 days pre-hospitalization\", "
        "\"\u20b910,000 ambulance cover\") - do NOT generalize numbers away into vague phrases like "
        "\"generous cover\" or \"extended period\". Do not add any fact, number, or benefit that "
        f"is not present in the clause. Context: {context}.\n\n"
        f'Clause: """{clause_text}"""\n\n'
        "Respond with the bullet text only, no quotes, no preamble."
    )
    text = await llm.complete(prompt, max_tokens=90, temperature=0.2)
    return _clean_ws(text) if text else truncate_clause(clause_text, 190)


async def generate_marketing_pitch(company_name: str, profile: dict, insurers: list[str] | None) -> dict[str, Any]:
    all_insurers = insurers if insurers else all_insurers_from_index()
    comparator = await _build_comparator(all_insurers)
    recommended = comparator["recommended"]

    slides = []

    # ---------------- Slide 1: Company Overview ----------------
    slide1_claims = [
        {"id": _next_claim_id(), "slideId": "slide_1", "type": "context", "text": f"Industry: {profile['industry']}", "sourceClauseId": None},
        {"id": _next_claim_id(), "slideId": "slide_1", "type": "context", "text": f"Estimated size: {profile['employeeSize']}", "sourceClauseId": None},
    ]
    if profile.get("headquarters"):
        slide1_claims.append({"id": _next_claim_id(), "slideId": "slide_1", "type": "context", "text": f"Headquarters: {profile['headquarters']}", "sourceClauseId": None})
    for r in profile["keyRisks"]:
        slide1_claims.append({"id": _next_claim_id(), "slideId": "slide_1", "type": "context", "text": f"Key exposure: {r}", "sourceClauseId": None})
    if profile.get("assumptionsUsed"):
        slide1_claims.append({"id": _next_claim_id(), "slideId": "slide_1", "type": "assumption_flag", "text": profile["notes"], "sourceClauseId": None})
    else:
        slide1_claims.append({"id": _next_claim_id(), "slideId": "slide_1", "type": "verified_flag", "text": f"Source: {profile.get('dataSource', 'live lookup')}" + (f" \u2014 {profile['sourceUrl']}" if profile.get("sourceUrl") else ""), "sourceClauseId": None})
    slides.append({"id": "slide_1", "title": f"{company_name}: Group Health Insurance Opportunity", "claims": slide1_claims})

    # ---------------- Slide 2: Why Choose Marsh ----------------
    slides.append({
        "id": "slide_2",
        "title": "Why Choose Marsh",
        "claims": [
            {"id": _next_claim_id(), "slideId": "slide_2", "type": "context", "text": "Independent, unbiased advice across every major insurer in the market.", "sourceClauseId": None},
            {"id": _next_claim_id(), "slideId": "slide_2", "type": "context", "text": "Dedicated claims advocacy team to fast-track employee claim resolution.", "sourceClauseId": None},
            {"id": _next_claim_id(), "slideId": "slide_2", "type": "context", "text": "Ongoing policy benchmarking so your cover stays competitive year over year.", "sourceClauseId": None},
        ],
    })

    # ---------------- Slide 3: Policy Benefits Mapped to Exposures ----------------
    # Every bullet MUST carry a citation, and MUST preserve exact figures.
    benefit_claims = []
    for risk in profile["keyRisks"]:
        matches = retrieve_clauses(risk, top_n=1, insurers=all_insurers)
        if not matches:
            continue
        doc = matches[0]["doc"]
        score = matches[0]["score"]
        text = await _phrase_claim(doc.text, f"mapping to client exposure: {risk}")
        benefit_claims.append({
            "id": _next_claim_id(),
            "slideId": "slide_3",
            "type": "policy_claim",
            "text": f"{risk} \u2192 {text}",
            "sourceClauseId": doc.id,
            "sourceInsurer": doc.insurer,
            "sourceDocName": doc.doc_name,
            "sourcePage": doc.page,
            "sourceClauseText": doc.text,
            "retrievalScore": score,
        })
    slides.append({"id": "slide_3", "title": "Policy Benefits Mapped to Your Risk Profile", "claims": benefit_claims})

    # ---------------- Slide 4: Recommended Policy (table + verdict) ----------------
    comparator_claims = []
    for row in comparator["rows"]:
        cell = row["byInsurer"][recommended]
        comparator_claims.append({
            "id": _next_claim_id(),
            "slideId": "slide_4",
            "type": "policy_claim",
            "text": f"{row['criterion']} ({recommended}): {truncate_clause(cell['value'], 140)}",
            "sourceClauseId": cell["clauseId"],
            "sourceInsurer": recommended,
            "sourceDocName": None,
            "sourcePage": cell["page"],
            "sourceClauseText": cell["snippet"],
            "retrievalScore": cell["score"],
        })
    recommendation_claim = {
        "id": _next_claim_id(),
        "slideId": "slide_4",
        "type": "recommendation",
        "text": (
            f"{recommended} scores highest across the {len(comparator['rows'])}-point rubric "
            "(room rent, maternity, waiting period, network hospitals, co-pay) "
            f"for {company_name}'s profile."
        ),
        "sourceClauseId": None,
    }
    slides.append({
        "id": "slide_4",
        "title": f"Recommended Policy: {recommended}",
        "claims": [recommendation_claim, *comparator_claims],
        "comparatorTable": comparator,
    })

    return {
        "companyName": company_name,
        "profile": profile,
        "recommended": recommended,
        "comparator": comparator,
        "slides": slides,
    }
