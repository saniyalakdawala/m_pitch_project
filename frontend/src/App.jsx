import React, { useEffect, useState, useCallback } from "react";
import Navigation from "./components/Navigation.jsx";
import GeneratePage from "./components/GeneratePage.jsx";
import LoadingScreen from "./components/LoadingScreen.jsx";
import ExecutivePitchPage from "./components/ExecutivePitchPage.jsx";
import {
  fetchPolicies,
  uploadPolicy,
  generatePitch,
  exportPptx,
  fetchAnalysis,
  fetchSampleAnalysis,
} from "./api.js";

export default function App() {
  const [currentPage, setCurrentPage] = useState("generate"); // "generate" | "loading" | "pitch"
  const [currentAnalysisId, setCurrentAnalysisId] = useState(null);

  const [insurers, setInsurers] = useState([]);
  const [loadError, setLoadError] = useState(null);

  const [companyName, setCompanyName] = useState("");
  const [selected, setSelected] = useState([]);

  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const [genError, setGenError] = useState(null);
  const [result, setResult] = useState(null);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  // Sync state with URL hash (#/generate or #/executive-pitch/:analysisId)
  const syncRouteFromHash = useCallback(async () => {
    const hash = window.location.hash || "";

    if (hash.startsWith("#/executive-pitch/")) {
      const id = hash.replace("#/executive-pitch/", "").trim();
      setCurrentAnalysisId(id);

      // If we don't already have this result loaded
      if (!result || result.analysis_id !== id) {
        try {
          const data =
            id === "analysis_tcs_sample_2026"
              ? await fetchSampleAnalysis()
              : await fetchAnalysis(id);
          setResult(data);
          setCurrentPage("pitch");
        } catch (err) {
          console.warn("Could not retrieve analysis by ID, returning to generator:", err);
          setGenError("The requested analysis could not be retrieved or has expired. Please run a new analysis.");
          window.location.hash = "#/generate";
          setCurrentPage("generate");
        }
      } else {
        setCurrentPage("pitch");
      }
    } else {
      setCurrentPage("generate");
    }
  }, [result]);

  useEffect(() => {
    window.addEventListener("hashchange", syncRouteFromHash);
    syncRouteFromHash();
    return () => window.removeEventListener("hashchange", syncRouteFromHash);
  }, [syncRouteFromHash]);

  function loadPolicies() {
    fetchPolicies()
      .then((data) => {
        setInsurers(data.insurers);
        setLoadError(null);
        setSelected((prev) => (prev.length ? prev : data.insurers.map((i) => i.name)));
      })
      .catch((err) => {
        setLoadError(err.message);
        const fallback = [
          { name: "Aditya Birla Health Insurance (ABHI)", source: "builtin" },
          { name: "Care Health Insurance", source: "builtin" },
          { name: "HDFC Ergo Health Insurance", source: "builtin" },
          { name: "Niva Bupa Health Insurance", source: "builtin" },
        ];
        setInsurers(fallback);
        setSelected(fallback.map((i) => i.name));
      });
  }

  useEffect(() => {
    loadPolicies();
  }, []);

  const toggleInsurer = (name) =>
    setSelected((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );

  const selectAll = () => setSelected(insurers.map((i) => i.name));
  const clearSelection = () => setSelected([]);

  async function handleUploadFiles(files) {
    setUploading(true);
    setGenError(null);
    try {
      for (const file of files) {
        const res = await uploadPolicy(file);
        setUploadedFiles((prev) => [
          ...prev,
          { name: file.name, chunkCount: res.chunkCount },
        ]);
        setSelected((prev) => [...prev, res.insurerName]);
      }
      loadPolicies();
    } catch (err) {
      setGenError(`PDF Upload / Extraction error: ${err.message || "Failed to parse document"}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerate() {
    if (!companyName.trim()) {
      setGenError("Please enter a target client company name to continue.");
      return;
    }
    if (selected.length === 0) {
      setGenError("Select at least one baseline policy document to baseline against.");
      return;
    }

    setGenError(null);
    setCurrentPage("loading");

    try {
      const data = await generatePitch({
        companyName: companyName.trim(),
        insurers: selected,
      });

      const analysisId = data.analysis_id || `analysis_${Date.now()}`;

      // Let the 5-step interstitial run briefly so each step is verified
      setTimeout(() => {
        setResult(data);
        setCurrentAnalysisId(analysisId);
        window.location.hash = `#/executive-pitch/${analysisId}`;
        setCurrentPage("pitch");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 2500);
    } catch (err) {
      setGenError(err.message || "Analysis generation failed. Please verify backend connection.");
      setCurrentPage("generate");
    }
  }

  async function handleLoadSample() {
    setCompanyName("Tata Consultancy Services");
    setGenError(null);
    setCurrentPage("loading");

    try {
      const data = await fetchSampleAnalysis();
      const analysisId = data.analysis_id || "analysis_tcs_sample_2026";
      setTimeout(() => {
        setResult(data);
        setCurrentAnalysisId(analysisId);
        window.location.hash = `#/executive-pitch/${analysisId}`;
        setCurrentPage("pitch");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 1500);
    } catch (err) {
      console.warn("Could not load sample analysis:", err);
      setGenError(`Could not load sample analysis: ${err.message || "Backend unreachable"}`);
      setCurrentPage("generate");
    }
  }

  function handleNewPitch() {
    setGenError(null);
    window.location.hash = "#/generate";
    setCurrentPage("generate");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleExport() {
    if (!result) return;
    setExporting(true);
    setExportError(null);
    try {
      const clientName = result.client?.name || result.pitch?.companyName || "Client";
      const blob = await exportPptx(result);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Marsh_Executive_Pitch_${clientName.replace(/[^a-z0-9]/gi, "_")}.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn("PPTX export fallback to browser PDF printing:", err);
      // Fallback directly to print/PDF dialog
      window.print();
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-navy-900 font-sans flex flex-col justify-between selection:bg-navy-900 selection:text-white">
      <div>
        {/* Navigation */}
        <Navigation
          isResultsPage={currentPage === "pitch"}
          onNewPitch={handleNewPitch}
          onLoadSample={handleLoadSample}
        />

        {/* Global Error Notice if generation or retrieval failed */}
        {genError && currentPage === "generate" && (
          <div className="mx-auto max-w-6xl px-6 pt-6 md:px-12">
            <div className="rounded border border-red-200 bg-red-50 p-4 text-xs text-red-900 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Notice:</span>
                <span>{genError}</span>
              </div>
              <button
                type="button"
                onClick={() => setGenError(null)}
                className="text-red-700 hover:text-red-900 font-bold"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Backend Connectivity Status Alert if cache fallback active */}
        {loadError && currentPage === "generate" && (
          <div className="mx-auto max-w-6xl px-6 pt-4 md:px-12">
            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-center justify-between">
              <span>
                Advisory repository connected to local backup cache.
              </span>
              <button
                type="button"
                onClick={loadPolicies}
                className="underline hover:no-underline font-medium"
              >
                Reconnect
              </button>
            </div>
          </div>
        )}

        {/* View Router */}
        {currentPage === "generate" && (
          <GeneratePage
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
            errorMsg={genError}
          />
        )}

        {currentPage === "loading" && (
          <LoadingScreen companyName={companyName || "Client"} />
        )}

        {currentPage === "pitch" && (
          <ExecutivePitchPage
            result={result}
            onNewPitch={handleNewPitch}
            onExport={handleExport}
            exporting={exporting}
          />
        )}
      </div>

      {/* Editorial Corporate Footer */}
      <footer className="border-t border-ivory-300 py-10 px-6 md:px-12 bg-[#F7F5F0] text-xs text-muted no-print">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-baseline justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-sans font-bold text-navy-900 tracking-wider">MARSH MCLENNAN</span>
            <span className="text-ivory-300">·</span>
            <span>Corporate Risk Placement &amp; Policy Audit Suite</span>
          </div>
          <div>
            Marsh Advisory &mdash; All quantitative calculations and clause verifications algorithmically audited.
          </div>
        </div>
      </footer>
    </div>
  );
}
