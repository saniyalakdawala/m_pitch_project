# Deployment & scalability notes

## What was wrong before
1. **A live Groq API key was committed in `backend-python/.env`.** Rotate it
   now at https://console.groq.com/keys and revoke the old one — anyone with
   this zip could have used it under your name. Secrets now load from `.env`
   (git-ignored) with `.env.example` as the template; on a real host, set
   `GROQ_API_KEY` via your platform's secret manager instead of a file.
2. **`node_modules/` and `venv/` were inside the zip** — multiple hundred MB
   of platform-specific, regenerable files that don't belong in source
   control or a deployment artifact. Removed; `npm install` / `pip install`
   regenerate them in seconds.
3. **CORS allowed `allow_origins=["*"]` with `allow_credentials=True`.**
   Browsers reject that combination anyway, and a wildcard is not something
   you want in production regardless. Now reads `ALLOWED_ORIGINS` from env.
4. **The frontend's API calls were hardcoded to the Vite dev proxy**, so a
   production build had no way to reach a backend on another host. `api.js`
   now reads an optional `VITE_API_BASE` build-time env var.
5. **`_last_results` grew forever** (one entry per generated pitch, never
   evicted) — a slow memory leak on a long-lived server. It's now a bounded
   LRU cache (200 entries).

## What's now included
- `backend-python/Dockerfile`, `frontend/Dockerfile` + `nginx.conf`, and a
  root `docker-compose.yml` that builds both and wires the frontend's nginx
  to reverse-proxy `/api` to the backend on the same origin — no CORS
  headaches, one `docker compose up --build` to run it, one persistent
  volume for uploaded policy PDFs.
- `.gitignore` / `.dockerignore` so secrets and build artifacts never get
  committed or shipped again.

## The one real architectural limit — read before you scale horizontally
`backend-python/app/services/store.py` keeps parsed policy clauses and
uploaded PDFs **in the Python process's memory**, and `pitch.py` caches
generated pitches the same way. That's fine — and fast — for **one backend
process**. It breaks if you run more than one (multiple `--workers`, or
multiple container replicas behind a load balancer): each process gets its
own copy, so a document uploaded to instance A is invisible to instance B,
and a pitch generated on A can't be exported from B.

So, practically:
- **Vertical scaling (bigger CPU/RAM on one instance) works today, unchanged.**
  For an internal advisor tool this is usually enough.
- **Horizontal scaling (multiple instances/replicas) needs the store moved
  to something shared** — Redis for the pitch-result cache, and
  Postgres/S3 (or even just a shared volume + SQLite) for uploaded policies
  and the TF-IDF index. That's a real but contained change, isolated to
  `store.py` and the two spots in `pitch.py` that read/write `_last_results`
  — everything else (retrieval, audit, PPTX export) is already stateless
  and doesn't need to change. Happy to build that out if/when you need more
  than one instance.

## Running it
```bash
cp backend-python/.env.example backend-python/.env   # fill in GROQ_API_KEY if you have one
docker compose up --build
# open http://localhost:8080
```
