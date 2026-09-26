from __future__ import annotations

import time
from collections import OrderedDict
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.services import store
from app.services.auditor import audit_pitch_content_async
from app.services.company_data import generate_company_profile
from app.services.pitch_generator import generate_marketing_pitch
from app.services.pptx_builder import build_pptx

router = APIRouter()

# In-memory store of recently generated pitches, mirroring the original
# demo-grade "session-less" approach - swap for a DB/session store (Redis,
# Postgres) in production if multiple advisors will use this concurrently
# or if you run more than one backend instance/worker, since this dict is
# local to a single process and is lost on restart.
_last_results: "OrderedDict[str, dict]" = OrderedDict()
MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15MB per file
MAX_CACHED_RESULTS = 200  # bounds memory growth; oldest results are evicted


def _cache_result(result_id: str, data: dict) -> None:
    _last_results[result_id] = data
    _last_results.move_to_end(result_id)
    while len(_last_results) > MAX_CACHED_RESULTS:
        _last_results.popitem(last=False)


class CompanyProfileRequest(BaseModel):
    companyName: str = Field(..., min_length=1)


class GeneratePitchRequest(BaseModel):
    companyName: str = Field(..., min_length=1)
    profile: Optional[dict] = None
    insurers: list[str] = Field(default_factory=list)


class AuditRequest(BaseModel):
    slides: list[dict]


class ExportRequest(BaseModel):
    resultId: Optional[str] = None
    pitch: Optional[dict] = None
    auditReport: Optional[dict] = None


@router.get("/policies")
async def get_policies():
    try:
        insurers = store.list_available_insurers()
        return {"insurers": insurers}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Failed to load policy documents: {exc}") from exc


@router.post("/upload-policy")
async def upload_policy(file: UploadFile = File(...), insurerLabel: Optional[str] = Form(None)):
    if not file or not file.filename:
        raise HTTPException(status_code=400, detail="No file was uploaded.")
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF policy documents are supported right now.")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="File exceeds the 15MB upload limit.")

    try:
        result = store.add_uploaded_document(data, file.filename, insurerLabel)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Failed to parse uploaded PDF: {exc}") from exc

    if result["chunkCount"] == 0:
        raise HTTPException(
            status_code=422,
            detail="No extractable text was found in this PDF (it may be a scanned image without OCR). "
                   "Try a different file, or a text-layer PDF export.",
        )
    return result


@router.delete("/upload-policy/{doc_id}")
async def delete_upload(doc_id: str):
    removed = store.remove_uploaded_document(doc_id)
    if not removed:
        raise HTTPException(status_code=404, detail="No uploaded document with that id.")
    return {"removed": True}


@router.post("/company-profile")
async def company_profile(body: CompanyProfileRequest):
    name = body.companyName.strip()
    if not name:
        raise HTTPException(status_code=400, detail="companyName is required.")
    try:
        profile = await generate_company_profile(name)
        return {"profile": profile}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Failed to generate company profile: {exc}") from exc


@router.post("/generate-pitch")
async def generate_pitch(body: GeneratePitchRequest):
    name = body.companyName.strip()
    if not name:
        raise HTTPException(status_code=400, detail="companyName is required.")
    if not body.insurers:
        raise HTTPException(status_code=400, detail="Select at least one policy document (built-in or uploaded) to baseline against.")

    available = {i["name"] for i in store.list_available_insurers()}
    unknown = [i for i in body.insurers if i not in available]
    if unknown:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown baseline document(s): {', '.join(unknown)}. Refresh the policy list and try again.",
        )

    try:
        effective_profile = body.profile or await generate_company_profile(name)
        pitch = await generate_marketing_pitch(name, effective_profile, body.insurers)
        audit_report = await audit_pitch_content_async(pitch["slides"], store.get_index())

        result_id = f"pitch_{int(time.time() * 1000)}"
        _cache_result(result_id, {"pitch": pitch, "auditReport": audit_report})

        return {"resultId": result_id, "pitch": pitch, "auditReport": audit_report}
    except HTTPException:
        raise
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Pitch generation failed: {exc}") from exc


@router.post("/audit")
async def audit(body: AuditRequest):
    if not body.slides:
        raise HTTPException(status_code=400, detail="slides array is required.")
    try:
        report = await audit_pitch_content_async(body.slides, store.get_index())
        return {"auditReport": report}
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Audit failed: {exc}") from exc


@router.post("/export-pptx")
async def export_pptx(body: ExportRequest):
    data = {"pitch": body.pitch, "auditReport": body.auditReport}
    if body.resultId and body.resultId in _last_results:
        data = _last_results[body.resultId]

    if not data.get("pitch"):
        raise HTTPException(status_code=400, detail="No pitch data provided or found for resultId.")

    try:
        buffer = build_pptx(data["pitch"], data.get("auditReport"))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"PPTX export failed: {exc}") from exc

    safe_name = "".join(c if c.isalnum() else "_" for c in data["pitch"]["companyName"])
    headers = {"Content-Disposition": f'attachment; filename="Marsh_Pitch_{safe_name}.pptx"'}
    return Response(
        content=buffer,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers=headers,
    )
