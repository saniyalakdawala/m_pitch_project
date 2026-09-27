"""
LLM layer - Groq's free-tier API via the official `groq` Python package.

Used for three things, all of which have deterministic, non-LLM fallbacks so
the app never hard-depends on this key being present:
  1. Extracting structured company facts (industry/size/risks) from a real
     Wikipedia summary (never inventing facts beyond that text).
  2. Rewriting policy clauses as short pitch bullets that preserve exact
     figures (sums insured, day counts, rupee amounts) instead of vague
     marketing fluff.
  3. Auditing each generated bullet against its cited source clause and
     returning a strict, structured verdict.

Get a free key (no credit card) at https://console.groq.com/keys
"""
from __future__ import annotations

import json
import os
import re

DEFAULT_MODEL = os.environ.get("GROQ_MODEL", "qwen/qwen3.8-27b")
# Groq periodically retires older model ids; if the pinned model 404s we
# retry once against this safe current default rather than failing outright.
FALLBACK_MODEL = "qwen/qwen3.8-27b"

_client = None
_client_init_failed = False


def _get_client():
    global _client, _client_init_failed
    if _client is not None or _client_init_failed:
        return _client
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        _client_init_failed = True
        return None
    try:
        from groq import Groq

        _client = Groq(api_key=api_key)
        return _client
    except Exception as exc:  # noqa: BLE001
        print(f"[llm] Could not initialise Groq client: {exc}")
        _client_init_failed = True
        return None


def has_llm() -> bool:
    return _get_client() is not None


def _chat(messages: list[dict], *, max_tokens: int, temperature: float, json_mode: bool) -> str | None:
    client = _get_client()
    if not client:
        return None

    kwargs = dict(messages=messages, max_tokens=max_tokens, temperature=temperature)
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    for model in (DEFAULT_MODEL, FALLBACK_MODEL):
        try:
            resp = client.chat.completions.create(model=model, **kwargs)
            return resp.choices[0].message.content
        except Exception as exc:  # noqa: BLE001
            print(f"[llm] Groq call with model={model!r} failed: {exc}")
            if model == DEFAULT_MODEL and DEFAULT_MODEL != FALLBACK_MODEL:
                continue  # retry once with the fallback model
            return None
    return None


async def complete(prompt: str, system: str | None = None, max_tokens: int = 220, temperature: float = 0.3) -> str | None:
    """Free-text completion. Returns None (never raises) on any failure."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    text = _chat(messages, max_tokens=max_tokens, temperature=temperature, json_mode=False)
    return text.strip() if text else None


def _strip_code_fence(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


async def complete_json(prompt: str, system: str | None = None, max_tokens: int = 500, temperature: float = 0.2) -> dict | list | None:
    """Structured completion - asks the model for JSON-only output and
    parses it. Returns None on any failure (missing key, bad JSON, etc.)."""
    sys_msg = (system or "") + "\nRespond with valid JSON only. No prose, no markdown code fences."
    messages = [{"role": "system", "content": sys_msg.strip()}, {"role": "user", "content": prompt}]
    text = _chat(messages, max_tokens=max_tokens, temperature=temperature, json_mode=True)
    if not text:
        return None
    try:
        return json.loads(_strip_code_fence(text))
    except (json.JSONDecodeError, TypeError) as exc:
        print(f"[llm] Failed to parse JSON from Groq response: {exc}")
        return None
