"""
Minimal, transparent TF-IDF + cosine similarity index.

We deliberately do NOT use opaque neural embeddings here: the audit layer's
whole job is to explain *why* a claim passed or failed, and a classic TF-IDF
vector is trivially inspectable (every dimension is a literal word). This
keeps the grounding/audit pipeline fully offline, free, and explainable -
no external API or paid embedding service required for it to work.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Callable, Optional

STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are",
    "be", "this", "that", "with", "as", "by", "at", "it", "from", "will",
    "shall", "may", "not", "any", "such", "other", "under", "per", "your",
    "you", "we", "our", "has", "have", "had", "if", "upto", "up", "i.e",
    "e.g", "etc",
}

_TOKEN_RE = re.compile(r"[^a-z0-9%\u20b9\s]")


def tokenize(text: str) -> list[str]:
    if not text:
        return []
    lowered = text.lower()
    cleaned = _TOKEN_RE.sub(" ", lowered)
    return [t for t in cleaned.split() if len(t) > 2 and t not in STOPWORDS]


def _term_freq(tokens: list[str]) -> dict[str, float]:
    tf: dict[str, int] = {}
    for t in tokens:
        tf[t] = tf.get(t, 0) + 1
    if not tf:
        return {}
    max_f = max(tf.values())
    return {k: v / max_f for k, v in tf.items()}


@dataclass
class Chunk:
    id: str
    insurer: str
    doc_name: str
    page: int
    text: str
    tokens: list[str] = field(default_factory=list)


class TfidfIndex:
    """Same math as the original tfidf.js: TF * IDF, cosine similarity."""

    def __init__(self, documents: list[dict]):
        self.docs: list[Chunk] = [
            Chunk(
                id=d["id"],
                insurer=d["insurer"],
                doc_name=d.get("docName", d.get("doc_name", "")),
                page=d.get("page", 0),
                text=d["text"],
                tokens=tokenize(d["text"]),
            )
            for d in documents
        ]
        self.idf: dict[str, float] = {}
        self._build_idf()
        self.vectors: list[dict[str, float]] = [self._vectorize(d.tokens) for d in self.docs]

    def _build_idf(self):
        df: dict[str, int] = {}
        n = max(1, len(self.docs))
        for d in self.docs:
            for t in set(d.tokens):
                df[t] = df.get(t, 0) + 1
        for t, count in df.items():
            self.idf[t] = math.log(1 + n / count)

    def _vectorize(self, tokens: list[str]) -> dict[str, float]:
        tf = _term_freq(tokens)
        return {t: f * self.idf.get(t, 0.0) for t, f in tf.items()}

    @staticmethod
    def cosine(a: dict[str, float], b: dict[str, float]) -> float:
        dot = sum(v * b.get(k, 0.0) for k, v in a.items())
        na = math.sqrt(sum(v * v for v in a.values()))
        nb = math.sqrt(sum(v * v for v in b.values()))
        if na == 0 or nb == 0:
            return 0.0
        return dot / (na * nb)

    def search(
        self,
        query_text: str,
        top_n: int = 5,
        filter_fn: Optional[Callable[[Chunk], bool]] = None,
    ) -> list[dict]:
        q_vec = self._vectorize(tokenize(query_text))
        scored = [
            {"doc": self.docs[i], "score": self.cosine(q_vec, self.vectors[i])}
            for i in range(len(self.docs))
        ]
        if filter_fn:
            scored = [s for s in scored if filter_fn(s["doc"])]
        scored.sort(key=lambda s: s["score"], reverse=True)
        return scored[:top_n]

    def similarity(self, text_a: str, text_b: str) -> float:
        return self.cosine(self._vectorize(tokenize(text_a)), self._vectorize(tokenize(text_b)))
