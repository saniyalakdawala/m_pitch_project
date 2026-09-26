import React, { useEffect, useRef, useState } from "react";

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

  const label =
    selected.length === 0
      ? "Select baseline policies..."
      : selected.length === insurers.length
      ? `All ${insurers.length} policies selected`
      : `${selected.length} of ${insurers.length} selected`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-left text-sm text-slate-700 shadow-sm transition hover:border-navy-400 focus:outline-none focus:ring-2 focus:ring-navy-600/30"
      >
        <span className={selected.length ? "text-slate-800" : "text-slate-400"}>{label}</span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-lg border border-slate-200 bg-white shadow-panel">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Baseline documents
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={onSelectAll} className="text-xs font-medium text-navy-600 hover:underline">
                Select all
              </button>
              <button type="button" onClick={onClear} className="text-xs font-medium text-slate-400 hover:underline">
                Clear
              </button>
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {insurers.length === 0 && (
              <li className="px-4 py-3 text-sm text-slate-400">No policy documents available yet.</li>
            )}
            {insurers.map((ins) => {
              const checked = selected.includes(ins.name);
              return (
                <li key={ins.name}>
                  <label className="flex cursor-pointer items-start gap-3 px-4 py-2 text-sm hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(ins.name)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-navy-600 focus:ring-navy-600/40"
                    />
                    <span className="flex-1">
                      <span className="block text-slate-800">{ins.name}</span>
                      <span
                        className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                          ins.source === "uploaded" ? "bg-navy-50 text-navy-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {ins.source === "uploaded" ? "Uploaded" : "Built-in"}
                      </span>
                    </span>
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
    const files = Array.from(fileList || []).filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
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
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition ${
          dragOver ? "border-navy-600 bg-navy-50" : "border-slate-300 bg-slate-25"
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
        <svg className="mb-2 h-7 w-7 text-navy-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 12v9m0-9l-3 3m3-3l3 3"
          />
        </svg>
        <p className="text-sm font-medium text-slate-700">
          {uploading ? "Uploading & parsing..." : "Drag & drop a policy PDF here"}
        </p>
        <p className="mb-3 mt-1 text-xs text-slate-400">
          Used as an additional baseline document alongside the built-in brochures
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 rounded-lg bg-navy-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          {uploading ? "Uploading..." : "Upload Policy"}
        </button>
      </div>
      {uploadedFiles.length > 0 && (
        <ul className="mt-3 w-full space-y-1 text-left">
          {uploadedFiles.map((f, i) => (
            <li key={i} className="flex items-center gap-2 rounded bg-white px-2 py-1 text-xs text-slate-600 shadow-sm border border-slate-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {f.name} <span className="text-slate-400">({f.chunkCount} clauses parsed)</span>
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
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-panel">
      <h2 className="mb-1 text-base font-semibold text-navy-900">Generate a client pitch</h2>
      <p className="mb-5 text-sm text-slate-500">
        Enter a company name, choose baseline policy documents, and optionally upload your own.
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Company name
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => onCompanyNameChange(e.target.value)}
            placeholder="e.g. Tata Consultancy Services"
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-navy-600 focus:outline-none focus:ring-2 focus:ring-navy-600/20"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Baseline policy documents
          </label>
          <MultiSelectDropdown
            insurers={insurers}
            selected={selected}
            onToggle={onToggleInsurer}
            onSelectAll={onSelectAll}
            onClear={onClearSelection}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
            Upload additional policy PDF
          </label>
          <DropZone onFiles={onUploadFiles} uploading={uploading} uploadedFiles={uploadedFiles} />
        </div>
      </div>

      {errorMsg && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-lg bg-navy-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {generating && (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          )}
          {generating ? "Generating pitch..." : "Generate pitch"}
        </button>
      </div>
    </div>
  );
}
