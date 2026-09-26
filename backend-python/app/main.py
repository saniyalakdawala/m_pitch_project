from __future__ import annotations

import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.routers.pitch import router as pitch_router
from app.services import store

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("marsh-pitch-backend")

app = FastAPI(title="Marsh AI Pitch Generator & Audit Layer", version="2.0.0")

# Origins come from an env var so the same image can be deployed anywhere
# without a code change, and so we never ship a wildcard "*" (which browsers
# refuse to combine with credentials anyway) to production.
_allowed_origins = [
    o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.on_event("startup")
async def on_startup():
    n = store.warm_start()
    logger.info(f"Policy index ready: {n} clauses ingested from built-in brochures.")


@app.get("/api/health")
async def health():
    return {"ok": True}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error")
    return JSONResponse(status_code=500, content={"error": "Internal server error."})


app.include_router(pitch_router, prefix="/api")
