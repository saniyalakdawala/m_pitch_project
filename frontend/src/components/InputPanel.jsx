import React, { useEffect, useRef, useState } from "react";
import Card3D from "./Card3D.jsx";
import { POPULAR_COMPANIES } from "../mockData.js";

function MultiSelectDropdown({ insurers, selected, onToggle, onSelectAll, onClear }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const isAll = selected.length === insurers.length && insurers.length > 0;
  const label =
    selected.length === 0
      ? "Select baseline policy brochures..."
      : isAll
      ? `All ${insurers.length} Approved Policies Active`
      : `${selected.length} of ${insurers.length} Policies Selected`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-marsh-azure/25 bg-marsh-midnight/90 px-4 py-3 text-left text-sm text-slate-100 shadow-inner transition hover:border-marsh-azure/60 focus:outline-none focus:ring-2 focus:ring-marsh-azure/30"
      >
        <div className="flex items-center gap-2.5 truncate">
          <span className="flex h-2 w-2 rounded-full bg-marsh-azure shadow-[0_0_8px_#00a3e0]" />
          <span className={selected.length ? "font-medium text-white" : "text-slate-400"}>
            {label}
          </span>
        </div>
        <svg
          className={`h-4 w-4 text-marsh-azure transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-marsh-azure/30 bg-marsh-midnight/95 backdrop-blur-xl p-2.5 shadow-2xl shadow-black animate-in fade-in">
          <div className="flex items-center justify-between border-b border-marsh-azure/15 px-3 py-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-marsh-azure">
              Verified Policy Archive
            </span>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onSelectAll}
                className="text-xs font-semibold text-marsh-azure hover:text-white transition"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={onClear}
                className="text-xs text-slate-400 hover:text-slate-200 transition"
              >
                Clear
              </button>
            </div>
          </div>

          <ul className="max-h-64 overflow-y-auto py-1 divide-y divide-slate-800/40">
            {insurers.length === 0 && (
              <li className="px-4 py-3 text-xs text-slate-400">Loading policy archive...</li>
            )}
            {insurers.map((ins) => {
              const checked = selected.includes(ins.name);
              return (
                <li key={ins.name}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2 text-xs transition hover:bg-marsh-azure/10">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(ins.name)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-marsh-dark text-marsh-azure focus:ring-marsh-azure/40 focus:ring-offset-0"
                    />
                    <div className="flex-1">
                      <span className={`block font-medium ${checked ? "text-white" : "text-slate-400"}`}>
                        {ins.name}
                      </span>
                      <span
                        className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                          ins.source === "uploaded"
                            ? "bg-gold-500/15 text-gold-300 border border-gold-500/30"
                            : "bg-marsh-azure/10 text-marsh-azure border border-marsh-azure/20"
                        }`}
                      >
                        {ins.source === "uploaded" ? "Custom Ingested PDF" : "Marsh Standard Brochure"}
                      </span>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function DropZone({ onFiles, uploading, uploadedFiles }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  function handleFiles(fileList) {
    const files = Array.from(fileList || []).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (files.length) onFiles(files);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition ${
          dragOver
            ? "border-marsh-azure bg-marsh-azure/15 shadow-[0_0_20px_rgba(0,145,218,0.25)]"
            : "border-marsh-azure/25 bg-marsh-midnight/50 hover:border-marsh-azure/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-marsh-azure/15 border border-marsh-azure/30 text-marsh-azure">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m0-9l-3 3m3-3l3 3"
            />
          </svg>
        </div>

        <p className="text-xs font-semibold text-white">
          {uploading ? "Ingesting & indexing clauses..." : "Upload Client Policy PDF"}
        </p>
        <p className="mb-2.5 mt-0.5 text-[11px] text-slate-400">
          Automatically parsed into semantic clause vectors for audit
        </p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-marsh-azure/40 bg-marsh-navy px-3 py-1.5 text-xs font-medium text-marsh-azure hover:text-white hover:border-marsh-azure transition disabled:opacity-50"
        >
          {uploading && (
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          {uploading ? "Parsing clauses..." : "Browse Local File"}
        </button>
      </div>

      {uploadedFiles.length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {uploadedFiles.map((f, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg border border-marsh-azure/20 bg-marsh-midnight/80 px-2.5 py-1.5 text-xs text-slate-300"
            >
              <div className="flex items-center gap-2 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                <span className="truncate">{f.name}</span>
              </div>
              <span className="text-[10px] text-marsh-azure font-mono font-medium">
                {f.chunkCount} clauses parsed
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function InputPanel({
  companyName,
  onCompanyNameChange,
  insurers,
  selected,
  onToggleInsurer,
  onSelectAll,
  onClearSelection,
  onUploadFiles,
  uploading,
  uploadedFiles,
  onGenerate,
  generating,
  errorMsg,
  onLoadDemo,
}) {
  return (
    <Card3D className="p-6 md:p-8 border-marsh-azure/25">
      {/* Decorative Marsh Blue Ambient Highlight */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-marsh-azure/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-marsh-azure/15">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-marsh-cobalt text-white border border-marsh-azure/40 font-bold text-xs">
              M
            </div>
            <h2 className="text-lg md:text-xl font-display font-bold text-white tracking-wide">
              Corporate Risk &amp; Policy Placement Generator
            </h2>
            <span className="gold-certified-badge rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              Gold Audit Standard
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Synthesizes client-specific risk matrices and comparator decks with independent algorithmic clause auditing.
          </p>
        </div>

        {/* Demo Button */}
        {onLoadDemo && (
          <button
            type="button"
            onClick={onLoadDemo}
            className="self-start md:self-auto inline-flex items-center gap-2 rounded-xl border border-gold-500/40 bg-gold-500/10 px-3.5 py-2 text-xs font-semibold text-gold-200 hover:bg-gold-500/20 transition shadow-sm"
          >
            <span className="text-gold-400">&#9733;</span>
            <span>Load Enterprise Placement (TCS)</span>
          </button>
        )}
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* Company Input with Corporate Presets */}
        <div className="md:col-span-2 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-marsh-azure">
              Target Client Company
            </label>
            <span className="text-[11px] text-slate-400">
              Live Wikipedia, Wikidata &amp; Underwriting Risk Extraction
            </span>
          </div>

          <div className="relative">
            <input
              type="text"
              value={companyName}
              onChange={(e) => onCompanyNameChange(e.target.value)}
              placeholder="e.g. Tata Consultancy Services, Infosys, Reliance Industries..."
              className="w-full rounded-xl border border-marsh-azure/25 bg-marsh-midnight/90 px-4 py-3.5 text-sm text-white placeholder:text-slate-500 shadow-inner focus:border-marsh-azure focus:outline-none focus:ring-2 focus:ring-marsh-azure/30 transition"
            />
            {companyName && (
              <button
                type="button"
                onClick={() => onCompanyNameChange("")}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
              >
                &times;
              </button>
            )}
          </div>

          {/* Quick Select Presets Bar */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-400 mr-1">Select Enterprise:</span>
            {POPULAR_COMPANIES.map((comp) => {
              const active = companyName.toLowerCase() === comp.name.toLowerCase();
              return (
                <button
                  key={comp.name}
                  type="button"
                  onClick={() => onCompanyNameChange(comp.name)}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition border ${
                    active
                      ? "border-marsh-azure bg-marsh-azure/20 text-white font-semibold shadow-[0_0_12px_rgba(0,145,218,0.3)]"
                      : "border-slate-800 bg-marsh-midnight/60 text-slate-300 hover:border-marsh-azure/40 hover:text-white"
                  }`}
                >
                  <span>{comp.name}</span>
                  <span className="text-[10px] text-marsh-azure font-mono opacity-80">
                    {comp.employees}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Baseline Policy Selector */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-marsh-azure">
            Baseline Policy Documents (GHI)
          </label>
          <MultiSelectDropdown
            insurers={insurers}
            selected={selected}
            onToggle={onToggleInsurer}
            onSelectAll={onSelectAll}
            onClear={onClearSelection}
          />
          <p className="mt-1.5 text-[11px] text-slate-400">
            Selected wordings populate the Slide 4 comparator matrix and clause verification index.
          </p>
        </div>

        {/* Upload Policy PDF */}
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-marsh-azure">
            Custom Policy Brochure PDF
          </label>
          <DropZone onFiles={onUploadFiles} uploading={uploading} uploadedFiles={uploadedFiles} />
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="mt-5 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-xs text-red-300 flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Action Footer */}
      <div className="mt-6 pt-5 border-t border-marsh-azure/15 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-xs text-slate-400">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          <span>Groq LLM Fact-Checking &amp; TF-IDF Clause Match Active</span>
        </div>

        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="marsh-btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2.5 rounded-xl px-7 py-3 text-xs uppercase tracking-wider transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span>Synthesizing Pitch &amp; Audit...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Synthesize Executive Pitch &amp; Audit</span>
            </>
          )}
        </button>
      </div>
    </Card3D>
  );
}
