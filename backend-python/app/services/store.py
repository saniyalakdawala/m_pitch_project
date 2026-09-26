"""
Central, process-wide store of policy clauses (built-in + advisor-uploaded)
and the TF-IDF index built over them.

Deliberately a simple in-memory store (same trade-off the original Node
prototype made): fine for a single-advisor demo/local deployment, and easy
to swap for Redis/a DB later without touching the retrieval/audit logic.
"""
from __future__ import annotations

import threading
import uuid
from typing import Optional

from app.services.pdf_ingest import ingest_builtin_policies, ingest_uploaded_document, list_builtin_insurers
from app.utils.tfidf import TfidfIndex

_lock = threading.Lock()
_builtin_chunks: list[dict] = []
_uploaded_docs: dict[str, dict] = {}  # docId -> {insurerName, docName, chunks}
_index_cache: Optional[TfidfIndex] = None


def warm_start():
    """Parse the built-in brochures once at server boot."""
    global _builtin_chunks
    with _lock:
        _builtin_chunks = ingest_builtin_policies()
    return len(_builtin_chunks)


def _next_id_offset() -> int:
    base = len(_builtin_chunks)
    for d in _uploaded_docs.values():
        base += len(d["chunks"])
    return base + 1000  # generous gap so ids never collide


def add_uploaded_document(file_bytes: bytes, original_filename: str, insurer_label: str | None = None) -> dict:
    """Ingest an advisor-uploaded baseline policy PDF and add it to the working index."""
    global _index_cache
    with _lock:
        doc_id = uuid.uuid4().hex[:10]
        offset = _next_id_offset()
        result = ingest_uploaded_document(file_bytes, original_filename, insurer_label, offset)
        _uploaded_docs[doc_id] = result
        _index_cache = None  # invalidate cache
        return {"docId": doc_id, **{k: v for k, v in result.items() if k != "chunks"}}


def remove_uploaded_document(doc_id: str) -> bool:
    global _index_cache
    with _lock:
        if doc_id in _uploaded_docs:
            del _uploaded_docs[doc_id]
            _index_cache = None
            return True
        return False


def all_chunks() -> list[dict]:
    chunks = list(_builtin_chunks)
    for d in _uploaded_docs.values():
        chunks.extend(d["chunks"])
    return chunks


def get_index() -> TfidfIndex:
    global _index_cache
    with _lock:
        if _index_cache is None:
            _index_cache = TfidfIndex(all_chunks())
        return _index_cache


def list_available_insurers() -> list[dict]:
    """Every selectable baseline document: built-in brochures + anything
    the advisor has uploaded this session, each flagged with its origin."""
    items = [{"name": name, "source": "builtin", "docId": None} for name in list_builtin_insurers()]
    for doc_id, d in _uploaded_docs.items():
        items.append({"name": d["insurerName"], "source": "uploaded", "docId": doc_id, "docName": d["docName"]})
    return items
