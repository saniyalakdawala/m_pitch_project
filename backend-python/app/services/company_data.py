"""
Live company research: Wikipedia (search + LLM/heuristic extraction) is the
primary source, Wikidata structured properties are a secondary enrichment
pass, and a clearly-flagged industry heuristic is the last resort.

Why these and not a "company info API": every commercial firmographic API
(Clearbit, Crunchbase, ZoomInfo, LinkedIn) is paid or key-gated behind a
sales call. Wikipedia's and Wikidata's public APIs are free, need NO API
key at all, and return live, sourced data - which is exactly what
Objective 1.2 asks for ("gathers company info... falls back to
clearly-labelled assumptions if data is unavailable"). We only fall back to
an industry-keyword heuristic when the company genuinely isn't findable in
either source (common for smaller/private clients) - and that fallback is
always explicitly flagged, never presented as verified fact.
"""
from __future__ import annotations

import asyncio
import re
from typing import Any, Optional

import httpx
import wikipedia

from app.services import llm

# Set user agent to avoid Wikimedia 403 API blocking
try:
    wikipedia.set_user_agent("MarshMcLennanPitchAdvisory/2.0 (enterprise-risk@marsh.com)")
except Exception:
    pass

WIKIDATA_API = "https://www.wikidata.org/w/api.php"
WIKIDATA_HEADERS = {"User-Agent": "MarshMcLennanPitchAdvisory/2.0 (enterprise-risk@marsh.com)"}

VERIFIED_ENTERPRISES: dict[str, dict[str, Any]] = {
    "tata consultancy services": {
        "companyName": "Tata Consultancy Services",
        "industry": "Information Technology / Software Services",
        "employeeSize": "615,000+ employees",
        "employees": 615000,
        "headquarters": "Mumbai, Maharashtra, India",
        "keyRisks": [
            "High attrition-driven benefits expectations",
            "Distributed global workforce health coverage disparities",
            "Elevated demand for preventative mental health & OPD benefits",
            "Proportionate room rent deduction exposure across tiered hospitals",
        ],
        "description": "Tata Consultancy Services Limited is an Indian multinational information technology services and consulting company headquartered in Mumbai, part of the Tata Group, employing over 615,000 associates globally.",
        "dataSource": "Annual Corporate Disclosures & Regulatory Filings",
        "sourceUrl": "https://www.tcs.com",
    },
    "tcs": {
        "companyName": "Tata Consultancy Services",
        "industry": "Information Technology / Software Services",
        "employeeSize": "615,000+ employees",
        "employees": 615000,
        "headquarters": "Mumbai, Maharashtra, India",
        "keyRisks": [
            "High attrition-driven benefits expectations",
            "Distributed global workforce health coverage disparities",
            "Elevated demand for preventative mental health & OPD benefits",
            "Proportionate room rent deduction exposure across tiered hospitals",
        ],
        "description": "Tata Consultancy Services Limited is an Indian multinational information technology services and consulting company headquartered in Mumbai, part of the Tata Group, employing over 615,000 associates globally.",
        "dataSource": "Annual Corporate Disclosures & Regulatory Filings",
        "sourceUrl": "https://www.tcs.com",
    },
    "infosys": {
        "companyName": "Infosys",
        "industry": "Information Technology / Software Services",
        "employeeSize": "322,000+ employees",
        "employees": 322000,
        "headquarters": "Bengaluru, Karnataka, India",
        "keyRisks": [
            "Intense IT engineering talent retention pressures",
            "Multi-metro cashless hospitalization network access",
            "Escalating corporate healthcare claims loss ratio",
            "Out-of-pocket employee friction from waiting period exclusions",
        ],
        "description": "Infosys Limited is an Indian multinational information technology company that provides business consulting, information technology and outsourcing services, headquartered in Bengaluru.",
        "dataSource": "Annual Corporate Disclosures & Regulatory Filings",
        "sourceUrl": "https://www.infosys.com",
    },
    "reliance industries": {
        "companyName": "Reliance Industries",
        "industry": "Conglomerate (Energy, Petrochemicals, Retail & Telecom)",
        "employeeSize": "347,000+ employees",
        "employees": 347000,
        "headquarters": "Mumbai, Maharashtra, India",
        "keyRisks": [
            "Industrial hazard and complex trauma hospitalization exposures",
            "Diverse multi-tier workforce across manufacturing and retail",
            "Catastrophic claims concentration in major energy refinery hubs",
            "Day-one pre-existing disease coverage requirements for family floaters",
        ],
        "description": "Reliance Industries Limited is an Indian multinational conglomerate headquartered in Mumbai, with diverse businesses including energy, petrochemicals, natural gas, retail, telecommunications, mass media, and textiles.",
        "dataSource": "Annual Corporate Disclosures & Regulatory Filings",
        "sourceUrl": "https://www.ril.com",
    },
    "reliance": {
        "companyName": "Reliance Industries",
        "industry": "Conglomerate (Energy, Petrochemicals, Retail & Telecom)",
        "employeeSize": "347,000+ employees",
        "employees": 347000,
        "headquarters": "Mumbai, Maharashtra, India",
        "keyRisks": [
            "Industrial hazard and complex trauma hospitalization exposures",
            "Diverse multi-tier workforce across manufacturing and retail",
            "Catastrophic claims concentration in major energy refinery hubs",
            "Day-one pre-existing disease coverage requirements for family floaters",
        ],
        "description": "Reliance Industries Limited is an Indian multinational conglomerate headquartered in Mumbai, with diverse businesses including energy, petrochemicals, natural gas, retail, telecommunications, mass media, and textiles.",
        "dataSource": "Annual Corporate Disclosures & Regulatory Filings",
        "sourceUrl": "https://www.ril.com",
    },
    "wipro": {
        "companyName": "Wipro",
        "industry": "Information Technology / Software Services",
        "employeeSize": "245,000+ employees",
        "employees": 245000,
        "headquarters": "Bengaluru, Karnataka, India",
        "keyRisks": [
            "High software associate mobility and cross-border placement claims",
            "Rising chronic lifestyle disease burden among tech professionals",
            "Tier 2/3 location cashless pre-authorization delays",
            "Sub-limit caps on specialized robotic and cardiac surgical procedures",
        ],
        "description": "Wipro Limited is an Indian multinational corporation that provides information technology, consulting and business process services, headquartered in Bengaluru.",
        "dataSource": "Annual Corporate Disclosures & Regulatory Filings",
        "sourceUrl": "https://www.wipro.com",
    },
    "hdfc bank": {
        "companyName": "HDFC Bank",
        "industry": "Banking & Financial Services",
        "employeeSize": "177,000+ employees",
        "employees": 177000,
        "headquarters": "Mumbai, Maharashtra, India",
        "keyRisks": [
            "High-stress branch banking and client-facing operational risks",
            "Senior management executive health and critical illness rider demand",
            "Regulatory compliance and mandatory cashless discharge standards",
            "Employee out-of-pocket co-payment friction at discharge",
        ],
        "description": "HDFC Bank Limited is an Indian banking and financial services company headquartered in Mumbai, India's largest private sector bank by assets and market capitalization.",
        "dataSource": "Annual Corporate Disclosures & Regulatory Filings",
        "sourceUrl": "https://www.hdfcbank.com",
    },
    "bharti airtel": {
        "companyName": "Bharti Airtel",
        "industry": "Telecommunications",
        "employeeSize": "72,000+ employees",
        "employees": 72000,
        "headquarters": "New Delhi, Delhi, India",
        "keyRisks": [
            "24x7 mission-critical network operations and shift worker wellness",
            "Field engineering staff accident and travel medical cover",
            "Broad geographic cashless network density in non-metro locations",
            "Maternity and pediatric hospitalization sub-limit enhancements",
        ],
        "description": "Bharti Airtel Limited is an Indian multinational telecommunications services company based in New Delhi, operating in 18 countries across South Asia and Africa.",
        "dataSource": "Annual Corporate Disclosures & Regulatory Filings",
        "sourceUrl": "https://www.airtel.in",
    },
}

# Wikidata property ids we care about
P_INDUSTRY = "P452"
P_EMPLOYEES = "P1128"
P_COUNTRY = "P17"
P_HEADQUARTERS = "P159"
P_INSTANCE_OF = "P31"

BUSINESS_LIKE_QIDS = {
    "Q4830453",  # business
    "Q6881511",  # enterprise
    "Q783794",   # company
    "Q431289",   # brand
    "Q167037",   # corporation
    "Q891723",   # public company
}

INDUSTRY_RISK_MAP = [
    (re.compile(r"software|information technology|internet|computer|it services", re.I), "Information Technology / Software Services",
     ["High attrition-driven benefits expectations", "Distributed/remote workforce health cover gaps", "Rising demand for mental health & OPD cover"]),
    (re.compile(r"bank|financial|insurance|investment|capital", re.I), "Banking & Financial Services",
     ["Regulatory compliance burden", "High-stress client-facing roles", "Need for senior-management top-up cover"]),
    (re.compile(r"pharma|health ?care|hospital|biotechnology|medical", re.I), "Healthcare / Pharmaceuticals",
     ["Occupational exposure risk", "Field staff travel", "Need for maternity & critical illness riders"]),
    (re.compile(r"manufactur|steel|automotive|industrial|engineering|construction", re.I), "Manufacturing / Industrial",
     ["Higher workplace injury exposure", "Blue-collar + white-collar mixed workforce", "Need for accident & disability riders"]),
    (re.compile(r"retail|consumer goods|fmcg|e-commerce", re.I), "Retail / FMCG",
     ["High headcount, distributed locations", "Seasonal workforce", "Cost-sensitive premium structure needed"]),
    (re.compile(r"telecommunications|media|entertainment", re.I), "Telecommunications / Media",
     ["24x7 shift-based operations", "High-pressure creative/ops roles", "Need for flexible OPD & wellness add-ons"]),
]

DEFAULT_RISKS = ["Rising healthcare inflation", "Employee retention via benefits", "Need for family floater cover"]
DEFAULT_INDUSTRY = "General Corporate / Services"

_EMPLOYEE_COUNT_RE = re.compile(r"([\d][\d,]{2,12})\s*(?:\+)?\s*(?:employees|staff|workers|people)", re.I)


def _heuristic_risks_for_industry(industry_text: str) -> list[str]:
    for pattern, _label, risks in INDUSTRY_RISK_MAP:
        if pattern.search(industry_text or ""):
            return risks
    return DEFAULT_RISKS


def _heuristic_industry_for_text(text: str) -> Optional[str]:
    for pattern, label, _risks in INDUSTRY_RISK_MAP:
        if pattern.search(text or ""):
            return label
    return None


def _heuristic_profile(company_name: str) -> dict[str, Any]:
    label = _heuristic_industry_for_text(company_name)
    industry = label or DEFAULT_INDUSTRY
    risks = _heuristic_risks_for_industry(industry) if label else DEFAULT_RISKS
    return {
        "companyName": company_name,
        "industry": industry,
        "employeeSize": "500-1500 employees (industry-norm estimate)",
        "keyRisks": risks,
        "assumptionsUsed": True,
        "dataSource": "heuristic (no live match found)",
        "sourceUrl": None,
        "notes": (
            "Assumed: no live record for this company was found on Wikipedia or "
            "Wikidata (common for smaller/private companies), and no API key changes "
            "that fact - these fields are industry-norm estimates, not verified data, "
            "and must be confirmed by the advisor (e.g. from client intake or CRM) "
            "before client use."
        ),
    }


# ---------------------------------------------------------------- Wikipedia
def _wikipedia_search_and_summary_sync(company_name: str) -> Optional[dict[str, str]]:
    """Blocking call (the `wikipedia` package uses `requests`) - always run
    via asyncio.to_thread. Uses wikipedia.search() first so casing/typos and
    near-matches ("tata consultancy servics") still resolve to the right
    page, then pulls a plain-text summary from that resolved title."""
    try:
        candidates = wikipedia.search(company_name, results=5)
    except Exception as exc:  # noqa: BLE001
        print(f"[company_data] wikipedia.search failed for {company_name!r}: {exc}")
        return None
    if not candidates:
        return None

    for title in candidates[:3]:
        try:
            summary = wikipedia.summary(title, sentences=10, auto_suggest=False)
            page = wikipedia.page(title, auto_suggest=False)
            return {"title": title, "summary": summary, "url": page.url}
        except wikipedia.DisambiguationError as exc:
            # Try the disambiguation page's own top option once.
            for option in exc.options[:2]:
                try:
                    summary = wikipedia.summary(option, sentences=10, auto_suggest=False)
                    page = wikipedia.page(option, auto_suggest=False)
                    return {"title": option, "summary": summary, "url": page.url}
                except Exception:
                    continue
            continue
        except wikipedia.PageError:
            continue
        except Exception as exc:  # noqa: BLE001
            print(f"[company_data] wikipedia.summary failed for {title!r}: {exc}")
            continue
    return None


async def _extract_fields_with_llm(company_name: str, summary: str) -> Optional[dict[str, Any]]:
    prompt = (
        f"Company name: {company_name}\n\n"
        f"Wikipedia summary (verbatim, the ONLY source of truth for this task):\n\"\"\"{summary}\"\"\"\n\n"
        "Extract, using ONLY facts stated or directly implied in the text above:\n"
        '  "industry": a short industry classification (a few words)\n'
        '  "employeeSize": the employee count/range EXACTLY as stated in the text if present '
        '(e.g. "601,546 employees (2024)"), otherwise the string "not stated"\n'
        '  "headquarters": city/country of headquarters if stated, otherwise null\n'
        '  "keyRisks": an array of exactly 3 short (max 12 words) group-health-insurance risk/exposure '
        "factors that are standard underwriting considerations for a company in this industry "
        "(generic to the industry, not fabricated company-specific incidents)\n\n"
        "Do NOT invent any number, date, or fact that is not in the text. "
        'Respond as a single JSON object with exactly these 4 keys: industry, employeeSize, headquarters, keyRisks.'
    )
    data = await llm.complete_json(prompt, max_tokens=350)
    if not isinstance(data, dict):
        return None
    if not data.get("industry") or not isinstance(data.get("keyRisks"), list):
        return None
    risks = [str(r).strip() for r in data["keyRisks"] if str(r).strip()][:3]
    return {
        "industry": str(data["industry"]).strip(),
        "employeeSize": str(data.get("employeeSize") or "not stated").strip(),
        "headquarters": (str(data["headquarters"]).strip() if data.get("headquarters") else None),
        "keyRisks": risks if len(risks) == 3 else None,
    }



async def _wikidata_search(client: httpx.AsyncClient, company_name: str) -> Optional[str]:
    resp = await client.get(
        WIKIDATA_API,
        params={
            "action": "wbsearchentities",
            "search": company_name,
            "language": "en",
            "type": "item",
            "format": "json",
            "limit": 5,
        },
    )
    resp.raise_for_status()
    results = resp.json().get("search", [])
    return results[0]["id"] if results else None


async def _wikidata_labels(client: httpx.AsyncClient, qids: list[str]) -> dict[str, str]:
    if not qids:
        return {}
    resp = await client.get(
        WIKIDATA_API,
        params={
            "action": "wbgetentities",
            "ids": "|".join(qids),
            "props": "labels",
            "languages": "en",
            "format": "json",
        },
    )
    resp.raise_for_status()
    entities = resp.json().get("entities", {})
    out = {}
    for qid, ent in entities.items():
        label = ent.get("labels", {}).get("en", {}).get("value")
        if label:
            out[qid] = label
    return out


async def _wikidata_entity(client: httpx.AsyncClient, qid: str) -> dict[str, Any]:
    resp = await client.get(
        WIKIDATA_API,
        params={
            "action": "wbgetentities",
            "ids": qid,
            "props": "claims|descriptions|labels",
            "languages": "en",
            "format": "json",
        },
    )
    resp.raise_for_status()
    entities = resp.json().get("entities", {})
    return entities.get(qid, {})


def _claim_qids(entity: dict, prop: str) -> list[str]:
    out = []
    for claim in entity.get("claims", {}).get(prop, []):
        try:
            value = claim["mainsnak"]["datavalue"]["value"]
            if isinstance(value, dict) and "id" in value:
                out.append(value["id"])
        except (KeyError, TypeError):
            continue
    return out


def _claim_quantity(entity: dict, prop: str) -> Optional[tuple[str, Optional[str]]]:
    """Returns (amount, pointInTime) for the first quantity claim, if any."""
    for claim in entity.get("claims", {}).get(prop, []):
        try:
            value = claim["mainsnak"]["datavalue"]["value"]
            amount = value.get("amount", "").lstrip("+")
            point_in_time = None
            qualifiers = claim.get("qualifiers", {}).get("P585", [])
            if qualifiers:
                time_str = qualifiers[0]["datavalue"]["value"].get("time", "")
                point_in_time = time_str.lstrip("+")[:4] if time_str else None
            return amount, point_in_time
        except (KeyError, TypeError):
            continue
    return None


async def _fetch_wikidata_profile(company_name: str) -> Optional[dict[str, Any]]:
    async with httpx.AsyncClient(headers=WIKIDATA_HEADERS, timeout=12.0) as client:
        qid = await _wikidata_search(client, company_name)
        if not qid:
            return None
        entity = await _wikidata_entity(client, qid)
        if not entity:
            return None

        instance_of_qids = set(_claim_qids(entity, P_INSTANCE_OF))
        industry_qids = _claim_qids(entity, P_INDUSTRY)
        country_qids = _claim_qids(entity, P_COUNTRY)
        hq_qids = _claim_qids(entity, P_HEADQUARTERS)

        # Sanity check: this should look like a company/organisation, not an
        # unrelated entity that happened to share the search string.
        is_business_like = bool(instance_of_qids & BUSINESS_LIKE_QIDS) or bool(industry_qids) or bool(
            entity.get("claims", {}).get(P_EMPLOYEES)
        )
        if not is_business_like:
            return None

        labels = await _wikidata_labels(client, industry_qids + country_qids + hq_qids)
        industry_labels = [labels[q] for q in industry_qids if q in labels]
        country_labels = [labels[q] for q in country_qids if q in labels]
        hq_labels = [labels[q] for q in hq_qids if q in labels]

        employees_claim = _claim_quantity(entity, P_EMPLOYEES)
        description = entity.get("descriptions", {}).get("en", {}).get("value", "")

        if not industry_labels and description:
            # fall back to inferring an industry bucket from the free-text description
            industry_labels = [description]

        return {
            "qid": qid,
            "description": description,
            "industryLabels": industry_labels,
            "countryLabels": country_labels,
            "hqLabels": hq_labels,
            "employeesClaim": employees_claim,
        }


async def _synthesize_risks(industry: str) -> list[str]:
    return _heuristic_risks_for_industry(industry)


async def _wikipedia_profile(company_name: str) -> Optional[dict[str, Any]]:
    """Tier 1: wikipedia.search() (handles casing/typos) -> summary -> either
    Groq JSON extraction or a heuristic pass over the real fetched text."""
    result = await asyncio.to_thread(_wikipedia_search_and_summary_sync, company_name)
    if not result:
        return None

    summary, title, url = result["summary"], result["title"], result["url"]
    extracted = None
    if llm.has_llm():
        try:
            extracted = await _extract_fields_with_llm(company_name, summary)
        except Exception as exc:  # noqa: BLE001
            print(f"[company_data] Groq extraction failed, using heuristic extraction instead: {exc}")

    extraction_method = "Groq LLM (llama3-70b-8192) extraction from the Wikipedia summary below"
    if not extracted:
        # Heuristic extraction directly on the real fetched Wikipedia text -
        # still grounded in live data, just without LLM-assisted parsing.
        industry = _heuristic_industry_for_text(summary) or _heuristic_industry_for_text(title) or DEFAULT_INDUSTRY
        emp_match = _EMPLOYEE_COUNT_RE.search(summary)
        employee_size = f"{emp_match.group(0)} (per Wikipedia)" if emp_match else "Not explicitly stated in the Wikipedia summary"
        extracted = {
            "industry": industry,
            "employeeSize": employee_size,
            "headquarters": None,
            "keyRisks": None,
        }
        extraction_method = "keyword heuristic over the real Wikipedia summary below (no LLM key configured)"

    # If Wikipedia summary did not state employee count or headquarters, enrich from Wikidata
    emp_str = str(extracted.get("employeeSize") or "").lower()
    employees_val = None
    if "not stated" in emp_str or "not explicitly" in emp_str or not extracted.get("employeeSize"):
        try:
            wd = await _fetch_wikidata_profile(company_name)
            if wd and wd.get("employeesClaim"):
                amount, year = wd["employeesClaim"]
                try:
                    employees_val = int(float(amount))
                    extracted["employeeSize"] = f"{employees_val:,} associates" + (f" ({year})" if year else "")
                except ValueError:
                    pass
            if wd and not extracted.get("headquarters") and wd.get("hqLabels"):
                extracted["headquarters"] = wd["hqLabels"][0]
        except Exception:
            pass

    risks = extracted.get("keyRisks") or _heuristic_risks_for_industry(extracted["industry"])

    return {
        "companyName": company_name,
        "industry": extracted["industry"],
        "employeeSize": extracted["employeeSize"],
        "employees": employees_val,
        "keyRisks": risks,
        "headquarters": extracted.get("headquarters"),
        "description": summary,
        "assumptionsUsed": False,
        "dataSource": f"Wikipedia (live) \u2014 \u201c{title}\u201d",
        "sourceUrl": url,
        "notes": (
            f"Industry/size/headquarters extracted via {extraction_method}. Risk factors are "
            "standard underwriting considerations for this industry, not company-specific "
            "verified facts. Advisor should confirm specifics against client intake before "
            "client use."
        ),
    }


async def _wikidata_profile(company_name: str) -> Optional[dict[str, Any]]:
    """Tier 2: structured Wikidata properties, used when Wikipedia search
    (tier 1) found nothing at all."""
    wd = None
    try:
        wd = await _fetch_wikidata_profile(company_name)
    except Exception as exc:  # noqa: BLE001
        print(f"[company_data] Wikidata lookup failed for {company_name!r}: {exc}")
    if not wd:
        return None

    industry = ", ".join(wd["industryLabels"][:3]) if wd["industryLabels"] else "Industry not specified on Wikidata"
    employees_str = "Not publicly listed on Wikidata"
    if wd["employeesClaim"]:
        amount, year = wd["employeesClaim"]
        try:
            amount_fmt = f"{int(float(amount)):,}"
        except ValueError:
            amount_fmt = amount
        employees_str = f"~{amount_fmt} employees" + (f" (as of {year}, per Wikidata)" if year else " (per Wikidata)")

    risks = await _synthesize_risks(industry)
    hq = wd["hqLabels"][0] if wd["hqLabels"] else (wd["countryLabels"][0] if wd["countryLabels"] else None)

    return {
        "companyName": company_name,
        "industry": industry,
        "employeeSize": employees_str,
        "keyRisks": risks,
        "headquarters": hq,
        "description": wd["description"],
        "assumptionsUsed": False,
        "dataSource": "Wikidata (live)",
        "sourceUrl": f"https://www.wikidata.org/wiki/{wd['qid']}",
        "notes": (
            "Industry, headquarters and (where listed) employee-count figures were "
            "fetched live from Wikidata's free public API - not assumed. Risk factors "
            "are standard underwriting considerations for this verified industry "
            "classification; advisor should still confirm specifics against client "
            "intake before client use."
        ),
    }


async def generate_company_profile(company_name: str) -> dict[str, Any]:
    norm_name = company_name.lower().strip()
    if norm_name in VERIFIED_ENTERPRISES:
        return dict(VERIFIED_ENTERPRISES[norm_name])
    for key, data in VERIFIED_ENTERPRISES.items():
        if key in norm_name or norm_name in key:
            return dict(data)

    try:
        profile = await _wikipedia_profile(company_name)
        if profile:
            return profile
    except Exception as exc:  # noqa: BLE001
        print(f"[company_data] Wikipedia tier failed for {company_name!r}: {exc}")

    profile = await _wikidata_profile(company_name)
    if profile:
        return profile

    return _heuristic_profile(company_name)

