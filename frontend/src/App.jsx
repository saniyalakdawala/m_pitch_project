import React, { useEffect, useState } from "react";
import InputPanel from "./components/InputPanel.jsx";
import AuditDashboard from "./components/AuditDashboard.jsx";
import PitchPreview from "./components/PitchPreview.jsx";
import { PitchSkeleton } from "./components/Skeletons.jsx";
import { fetchPolicies, uploadPolicy, generatePitch, exportPptx } from "./api.js";

export default function App() {
  const [insurers, setInsurers] = useState([]);
  const [loadError, setLoadError] = useState(null);

  const [companyName, setCompanyName] = useState("");
  const [selected, setSelected] = useState([]);

  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [result, setResult] = useState(null);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  function loadPolicies() {
    fetchPolicies()
      .then((data) => {
        setInsurers(data.insurers);
        setLoadError(null);
        setSelected((prev) => (prev.length ? prev : data.insurers.map((i) => i.name)));
      })
      .catch((err) => setLoadError(err.message));
  }

  useEffect(() => {
    loadPolicies();
  }, []);

  const toggleInsurer = (name) =>
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));

  const selectAll = () => setSelected(insurers.map((i) => i.name));
  const clearSelection = () => setSelected([]);

  async function handleUploadFiles(files) {
    setUploading(true);
    setGenError(null);
    try {
      for (const file of files) {
        const res = await uploadPolicy(file);
        setUploadedFiles((prev) => [...prev, { name: file.name, chunkCount: res.chunkCount }]);
        setSelected((prev) => [...prev, res.insurerName]);
      }
      loadPolicies();
    } catch (err) {
      setGenError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerate() {
    if (!companyName.trim()) {
      setGenError("Enter a company name to generate a pitch.");
      return;
    }
    if (selected.length === 0) {
      setGenError("Select at least one baseline policy document.");
      return;
    }
    setGenerating(true);
    setGenError(null);
    setResult(null);
    try {
      const data = await generatePitch({ companyName: companyName.trim(), insurers: selected });
      setResult(data);
    } catch (err) {
      setGenError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleExport() {
    if (!result) return;
    setExporting(true);
    setExportError(null);
    try {
      const blob = await exportPptx(result);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Marsh_Pitch_${result.pitch.companyName.replace(/[^a-z0-9]/gi, "_")}.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-25 font-sans text-slate-800">
      <header className="border-b border-slate-200 bg-navy-900">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-5">
          <span className="rounded bg-navy-600 px-3 py-1.5 text-sm font-bold tracking-wide text-white">MARSH</span>
          <div>
            <h1 className="text-lg font-semibold text-white">AI Pitch Generator &amp; Audit Layer</h1>
            <p className="text-xs text-navy-100/70">Internal advisor tool for client-specific policy pitches</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        {loadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Could not load policy documents from the backend: {loadError}. Is the backend running on port 8000?
          </div>
        )}

        <InputPanel
          companyName={companyName}
          onCompanyNameChange={setCompanyName}
          insurers={insurers}
          selected={selected}
          onToggleInsurer={toggleInsurer}
          onSelectAll={selectAll}
          onClearSelection={clearSelection}
          onUploadFiles={handleUploadFiles}
          uploading={uploading}
          uploadedFiles={uploadedFiles}
          onGenerate={handleGenerate}
          generating={generating}
          errorMsg={genError}
        />

        {generating && <PitchSkeleton />}

        {!generating && result && (
          <>
            <AuditDashboard auditReport={result.auditReport} />
            {exportError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {exportError}
              </div>
            )}
            <PitchPreview
              pitch={result.pitch}
              auditReport={result.auditReport}
              onExport={handleExport}
              exporting={exporting}
            />
          </>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-center text-xs text-slate-400">
        Internal advisor tool &mdash; AI-generated content, always subject to audit review before client use.
      </footer>
    </div>
  );
}
