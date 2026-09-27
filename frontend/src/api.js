// In dev, Vite proxies "/api" to the local backend (see vite.config.js).
// In production, set VITE_API_BASE at build time if the frontend and
// backend are deployed on different hosts (e.g. static site + separate
// API server). Leave it unset when a reverse proxy (nginx, etc.) serves
// both under the same origin, so "/api" just works.
const BASE = `${import.meta.env.VITE_API_BASE || ""}/api`;

async function handle(res) {
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) msg = body.error;
      if (body.detail) msg = body.detail;
    } catch (_) {}
    throw new Error(msg);
  }
  return res.json();
}

export async function fetchPolicies() {
  const res = await fetch(`${BASE}/policies`);
  return handle(res);
}

export async function uploadPolicy(file, insurerLabel) {
  const form = new FormData();
  form.append("file", file);
  if (insurerLabel) form.append("insurerLabel", insurerLabel);
  const res = await fetch(`${BASE}/upload-policy`, { method: "POST", body: form });
  return handle(res);
}

export async function fetchCompanyProfile(companyName) {
  const res = await fetch(`${BASE}/company-profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyName }),
  });
  return handle(res);
}

export async function generatePitch({ companyName, profile, insurers }) {
  const res = await fetch(`${BASE}/generate-pitch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ companyName, profile, insurers }),
  });
  return handle(res);
}

export async function fetchAnalysis(analysisId) {
  const res = await fetch(`${BASE}/analysis/${encodeURIComponent(analysisId)}`);
  return handle(res);
}

export async function fetchSampleAnalysis() {
  const res = await fetch(`${BASE}/sample-analysis`);
  return handle(res);
}

export async function exportPptx(analysisData) {
  const res = await fetch(`${BASE}/export-pptx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resultId: analysisData.resultId || analysisData.analysis_id,
      pitch: analysisData.pitch,
      auditReport: analysisData.auditReport,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || body.error || "Export failed");
  }
  return res.blob();
}

