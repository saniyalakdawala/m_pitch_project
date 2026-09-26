# Marsh AI Pitch Generator & Audit Layer (v2 - Python backend)

Generates a client-specific Marsh insurance marketing pitch (4-slide deck +
downloadable PPTX) from a company name and a set of baseline policy
brochures, then independently audits every claim in the deck against the
source policy text before it reaches a client.

## What changed in this version
- **Backend rewritten in Python (FastAPI)** - see `backend-python/`.
- **Live company data**: `wikipedia.search()` (handles typos/casing) finds
  the right company page, then either Groq or a keyword heuristic extracts
  industry/size/risks from the real fetched text. Wikidata is a secondary
  enrichment source. A clearly-flagged heuristic is the last resort for
  companies with no public record - **nothing is silently assumed**.
- **Groq (free tier) LLM**, via the official `groq` Python package
  (`llama3-70b-8192`, auto-falls-back to `llama-3.3-70b-versatile` if that
  model id is ever retired). Used to phrase pitch bullets (preserving every
  exact number/₹ amount/day count) and to fact-check claims. **The app
  works with zero API keys** - it just uses simpler deterministic fallbacks.
- **Upload your own baseline policy PDF(s)** from the UI, in addition to
  the 4 built-in brochures - they're parsed and added to the working index
  immediately.
- **Structured audit report**: every claim gets `{claim_text, status:
  Verified|Flagged|Untraceable, source_clause, confidence_score}`.
- **New frontend**: professional navy/slate theme, a unified input panel
  (company name + multi-select policy picker + drag-and-drop/"Upload
  Policy" button), a compliance-style audit dashboard with a donut
  confidence-score chart and grouped Verified/Flagged/Untraceable tables,
  and a paginated on-screen preview of the 4 generated slides before you
  export the PPTX.

## Quick start

### 1. Backend
```bash
cd backend-python
python3 -m venv venv && source venv/bin/activate   # optional but recommended
pip install -r requirements.txt --break-system-packages   # or drop the flag inside a venv
cp .env.example .env        # optional - see below
uvicorn app.main:app --reload --port 8000
```
The backend works immediately with **no keys at all** - on first boot it
parses the 4 built-in brochures in `data/policies/` (cached to
`data/chunks_cache.json` so subsequent boots are instant).

### 2. Frontend
```bash
cd frontend
npm install
npm run dev      # http://localhost:5173, proxies /api to localhost:8000
```

### 3. (Optional) Add a free Groq key for better phrasing + LLM fact-checking
Get a free key (no credit card) at https://console.groq.com/keys, then in
`backend-python/.env`:
```
GROQ_API_KEY=gsk_...
GROQ_MODEL=llama3-70b-8192
```
Restart the backend. Everything upgrades automatically:
- Company risk bullets are phrased by the model instead of a keyword map.
- Pitch bullets on Slide 3 are rewritten more naturally while an explicit
  instruction forces the model to preserve every exact figure.
- The audit layer additionally asks Groq to strictly fact-check each claim
  against its cited clause (on top of the always-on TF-IDF check).

No other key is required or used anywhere in this app - Wikipedia and
Wikidata's public APIs are free and keyless.

## How it satisfies the brief

| Objective | Where |
|---|---|
| 1.1 UI: company name, select/upload baseline docs, generate button | `frontend/src/components/InputPanel.jsx` |
| 1.2 `generateCompanyProfile` with flagged fallback | `backend-python/app/services/company_data.py` |
| 1.3 3-5 slide deck (Overview / Why Marsh / Benefits / Recommended Policy) | `backend-python/app/services/pitch_generator.py` |
| 1.4 Validation & error handling | `backend-python/app/routers/pitch.py` |
| 2.1 Audit layer, traces claims to clauses, confidence/pass-fail | `backend-python/app/services/auditor.py` |
| 2.2 `auditPitchContent(pitch_slides, policy_docs)` | `auditor.audit_pitch_content` / `audit_pitch_content_async` |
| PPTX export | `backend-python/app/services/pptx_builder.py` |

## Project layout
```
backend-python/
  app/
    main.py                  FastAPI app entrypoint
    routers/pitch.py         /api/* endpoints
    services/
      pdf_ingest.py           PDF -> clause chunks (pdfplumber)
      store.py                in-memory doc store + shared TF-IDF index
      retrieval.py            top-k clause retrieval
      company_data.py         live company research (Wikipedia/Wikidata/heuristic)
      pitch_generator.py      builds the 4-slide pitch JSON
      auditor.py              independent claim-by-claim audit
      pptx_builder.py         branded, chart-enhanced .pptx export
      llm.py                  Groq wrapper (optional, free tier)
    utils/tfidf.py             transparent TF-IDF + cosine similarity
  data/policies/               the 4 built-in brochures
frontend/
  src/
    App.jsx
    api.js
    components/
      InputPanel.jsx           company name + multi-select + upload
      AuditDashboard.jsx       donut chart + Verified/Flagged/Untraceable tables
      PitchPreview.jsx         paginated slide viewer + PPTX export button
      DonutChart.jsx           hand-rolled SVG donut (no chart library dependency)
      Skeletons.jsx            loading states
```

## Notes & limitations
- The in-memory document store (built-in + uploaded brochures) is
  process-wide, matching the original prototype's scope: fine for one
  advisor / one local deployment; swap for a DB if multiple advisors need
  isolated sessions.
- Wikidata/Wikipedia won't have a record for many private/smaller
  companies - that's expected, and the profile is then clearly labelled as
  an industry-norm assumption rather than presented as verified fact.
- Every AI-assisted pitch and audit is a **draft** - the deck's cover slide
  and every content slide carry an explicit "AI-assisted draft, subject to
  advisor review" notice, and the audit dashboard's guidance text tells the
  advisor exactly what to check before sending it to a client.
