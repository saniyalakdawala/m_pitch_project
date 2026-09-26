from __future__ import annotations

from app.services.store import get_index


def retrieve_clauses(query: str, top_n: int = 4, insurers: list[str] | None = None) -> list[dict]:
    """Top matching clauses for a query, optionally restricted to certain
    insurers/baseline documents. Returns [{doc: Chunk, score: float}, ...]."""
    index = get_index()
    filter_fn = (lambda d: d.insurer in insurers) if insurers else None
    results = index.search(query, top_n=top_n, filter_fn=filter_fn)
    return [r for r in results if r["score"] > 0.03]


def all_insurers_from_index() -> list[str]:
    index = get_index()
    seen = []
    for d in index.docs:
        if d.insurer not in seen:
            seen.append(d.insurer)
    return seen
