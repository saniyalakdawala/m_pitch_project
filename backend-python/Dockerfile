FROM python:3.11-slim

WORKDIR /app

# System deps for pdfplumber's PDF parsing backend
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Uploaded PDFs and the parsed-chunk cache live here; mount a volume at
# this path in production so they survive container restarts.
RUN mkdir -p /app/data/uploads

EXPOSE 8000

# NOTE on scaling: the in-memory document store in app/services/store.py
# is per-process. Running multiple `--workers` or multiple container
# replicas gives each one its own copy of uploaded policies, so uploads
# via one worker won't be visible to requests handled by another. Keep
# this at 1 worker/replica until that store is backed by Redis/Postgres.
# A single worker on a reasonably sized instance comfortably handles an
# internal advisor tool's traffic; scale the container's CPU/RAM (vertical
# scaling) before adding replicas (horizontal scaling).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
