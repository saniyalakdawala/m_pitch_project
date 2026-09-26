"""
Ingest policy brochure PDFs into clause-sized, citable text chunks.

Two sources feed the index:
  1. The built-in brochures shipped in data/policies/ (parsed once, cached
     to disk so startup is instant on subsequent runs).
  2. Ad-hoc documents an advisor selects/uploads at request time via the
     "select/upload policy document(s) as baseline" UI feature (Objective
     1.1). These are parsed on the fly and merged into the working index
     for that request/session - they are never silently dropped.
"""
from __future__ import annotations

import io
import json
import os
import re
import time
from pathlib import Path
from typing import BinaryIO

import pdfplumber

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend-python/
POLICIES_DIR = BASE_DIR / "data" / "policies"
UPLOADS_DIR = BASE_DIR / "data" / "uploads"
CACHE_PATH = BASE_DIR / "data" / "chunks_cache.json"

UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

INSURER_NAME_MAP = {
    "abhi product brochure.pdf": "Aditya Birla Health Insurance (ABHI)",
    "care health product brochure.pdf": "Care Health Insurance",
    "hdfc product brochure.pdf": "HDFC Ergo Health Insurance",
    "niva bupa product brochure.pdf": "Niva Bupa Health Insurance",
}

_HEADING_SPLIT_RE = re.compile(
    r"\n\s*\n|(?=\n\s*(?:[0-9]{1,2}\.[0-9]*\s|[A-Z][A-Za-z /&-]{3,40}:\s*\n))"
)


def insurer_from_filename(filename: str) -> str:
    return INSURER_NAME_MAP.get(filename.lower(), re.sub(r"\.pdf$", "", filename, flags=re.I))


_SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9])")


def _hard_split_long_paragraph(para: str, target: int = 380) -> list[str]:
    """Marketing-brochure PDFs often extract as one giant run-on paragraph
    with no blank lines. If a paragraph is much larger than a normal clause,
    split it on sentence boundaries into ~target-char pieces so citations
    stay precise instead of pointing at a wall of text."""
    if len(para) <= target * 1.6:
        return [para]
    sentences = _SENTENCE_SPLIT_RE.split(para)
    pieces: list[str] = []
    buf = ""
    for sent in sentences:
        candidate = f"{buf} {sent}".strip()
        if len(candidate) < target:
            buf = candidate
        else:
            if buf:
                pieces.append(buf)
            buf = sent
    if buf:
        pieces.append(buf)
    return pieces or [para]


def split_into_clauses(page_text: str) -> list[str]:
    """Split a page of text into clause-sized chunks on headings / numbered
    sections / paragraph breaks (not a fixed token window), so each chunk
    stays a coherent, citable "clause" - mirrors pdfIngest.js, with an added
    hard-split pass for oversized runs so citations stay tight and precise."""
    normalized = page_text.replace("\r", "")
    raw_paras = [p.strip() for p in _HEADING_SPLIT_RE.split(normalized) if p.strip()]

    chunks: list[str] = []
    buffer = ""
    for para in raw_paras:
        candidate = f"{buffer} {para}".strip()
        if len(candidate) < 400:
            buffer = candidate
        else:
            if buffer:
                chunks.append(buffer)
            buffer = para
    if buffer:
        chunks.append(buffer)

    fine_grained: list[str] = []
    for c in chunks:
        fine_grained.extend(_hard_split_long_paragraph(c))

    return [c for c in fine_grained if len(c.split()) >= 6]


def _parse_pdf_bytes(data: bytes, insurer: str, doc_name: str, start_id: int) -> list[dict]:
    chunks = []
    chunk_id = start_id
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page_idx, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            for clause_text in split_into_clauses(text):
                chunks.append(
                    {
                        "id": f"c{chunk_id}",
                        "insurer": insurer,
                        "docName": doc_name,
                        "page": page_idx + 1,
                        "text": clause_text,
                    }
                )
                chunk_id += 1
    return chunks


def ingest_builtin_policies(force_refresh: bool = False) -> list[dict]:
    """Parse (or load from cache) the 4 built-in brochures shipped with the app."""
    if not force_refresh and CACHE_PATH.exists():
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))

    all_chunks: list[dict] = []
    chunk_id = 0
    if POLICIES_DIR.exists():
        for file in sorted(os.listdir(POLICIES_DIR)):
            if not file.lower().endswith(".pdf"):
                continue
            file_path = POLICIES_DIR / file
            insurer = insurer_from_filename(file)
            file_chunks = _parse_pdf_bytes(file_path.read_bytes(), insurer, file, chunk_id)
            all_chunks.extend(file_chunks)
            chunk_id += len(file_chunks)

    CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
    CACHE_PATH.write_text(json.dumps(all_chunks, indent=2), encoding="utf-8")
    return all_chunks


def ingest_uploaded_document(file_bytes: bytes, original_filename: str, insurer_label: str | None, id_offset: int) -> dict:
    """Parse a single advisor-uploaded PDF used as an additional/custom baseline
    policy document. Returns {insurerName, docName, chunks, chunkCount}."""
    insurer = insurer_label or f"Uploaded: {original_filename}"
    chunks = _parse_pdf_bytes(file_bytes, insurer, original_filename, id_offset)
    return {
        "insurerName": insurer,
        "docName": original_filename,
        "chunks": chunks,
        "chunkCount": len(chunks),
    }


def list_builtin_insurers() -> list[str]:
    return list(dict.fromkeys(INSURER_NAME_MAP.values()))
