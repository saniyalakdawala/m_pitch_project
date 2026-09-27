import React, { useRef, useState } from "react";
import { SUGGESTED_COMPANIES } from "../mockData.js";

export default function GeneratePage({
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
  errorMsg,
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const isAllSelected = selected.length === insurers.length && insurers.length > 0;
  const dropdownLabel =
    selected.length === 0
      ? "Select baseline policy documents..."
      : isAllSelected
      ? `All ${insurers.length} Approved Policies Active`
      : `${selected.length} of ${insurers.length} Approved Policies Active`;

  function handleFiles(fileList) {
    const files = Array.from(fileList || []).filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );
    if (files.length) onUploadFiles(files);
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 md:py-20 md:px-12">
      {/* Editorial Hero */}
      <div className="max-w-3xl pb-16 md:pb-20 border-b border-ivory-300">
        <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-normal leading-[1.12] text-navy-900 tracking-tight">
          Your risk story,<br />
          from every angle.
        </h1>
        <p className="mt-6 text-base sm:text-lg text-muted font-normal leading-relaxed max-w-2xl">
          Generate a client-specific corporate risk pitch, policy comparison and independently auditable clause analysis.
        </p>
      </div>

      {/* Main Two-Column Input Section */}
      <div className="pt-12 md:pt-16 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
        {/* Left Side: Client Configuration */}
        <div className="lg:col-span-7 space-y-8">
          <div>
            <h2 className="font-serif text-2xl font-normal text-navy-900">
              Build your executive pitch
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Tell us who you are preparing for and we’ll synthesize the relevant risk, policy and underwriting context.
            </p>
          </div>

          {/* Target client company */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold uppercase tracking-wider text-navy-900">
              Target client company
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => onCompanyNameChange(e.target.value)}
              placeholder="e.g. Tata Consultancy Services, Infosys, Reliance Industries…"
              className="w-full rounded border border-ivory-300 bg-white px-4 py-3.5 text-sm text-navy-900 placeholder:text-muted/60 focus:border-navy-900 focus:outline-none transition shadow-subtle"
            />

            {/* Suggested Companies as Simple Outlined Pills */}
            <div className="pt-1">
              <span className="text-xs text-muted block mb-2">Suggested companies:</span>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_COMPANIES.map((name) => {
                  const active = companyName.toLowerCase() === name.toLowerCase();
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => onCompanyNameChange(name)}
                      className={`rounded-full border px-3 py-1 text-xs font-normal transition ${
                        active
                          ? "border-navy-900 bg-navy-900 text-white"
                          : "border-ivory-300 bg-white text-muted-dark hover:border-navy-900 hover:text-navy-900"
                      }`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Baseline policy documents */}
          <div className="space-y-2 pt-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-navy-900">
              Baseline policy documents
            </label>

            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen((o) => !o)}
                className="flex w-full items-center justify-between rounded border border-ivory-300 bg-white px-4 py-3.5 text-left text-sm text-navy-900 shadow-subtle hover:border-navy-900 transition"
              >
                <span className="truncate">{dropdownLabel}</span>
                <span className="text-xs text-muted ml-2">{dropdownOpen ? "▲" : "▼"}</span>
              </button>

              {dropdownOpen && (
                <div className="absolute z-20 mt-1 w-full rounded border border-ivory-300 bg-white p-3 shadow-card">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-ivory-200">
                    <span className="text-xs font-semibold text-navy-900">Underwriting Wordings</span>
                    <div className="flex gap-3 text-xs">
                      <button
                        type="button"
                        onClick={onSelectAll}
                        className="text-navy-600 hover:underline"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={onClearSelection}
                        className="text-muted hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <ul className="max-h-60 overflow-y-auto space-y-1">
                    {insurers.map((ins) => {
                      const checked = selected.includes(ins.name);
                      return (
                        <li key={ins.name}>
                          <label className="flex items-center gap-3 p-2 rounded hover:bg-ivory-100 cursor-pointer text-xs text-navy-900">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => onToggleInsurer(ins.name)}
                              className="rounded border-ivory-300 text-navy-900 focus:ring-0"
                            />
                            <span className="flex-1 font-medium">{ins.name}</span>
                            <span className="text-[10px] text-muted uppercase">
                              {ins.source === "uploaded" ? "Uploaded" : "Brochure"}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Selected policy wording will populate the comparator matrix and clause verification index.
            </p>
          </div>
        </div>

        {/* Right Side: Client Policy Brochure Upload */}
        <div className="lg:col-span-5 space-y-6">
          <div>
            <h2 className="font-serif text-2xl font-normal text-navy-900">
              Client policy brochure
            </h2>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Upload custom policy PDF to compare directly against standard market wordings.
            </p>
          </div>

          {/* Clean Bordered Rectangular Upload Area */}
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
            className={`border rounded p-8 text-center transition bg-white ${
              dragOver ? "border-navy-900 bg-ivory-50" : "border-ivory-300 hover:border-navy-900/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />

            <div className="py-6 space-y-3">
              <p className="text-sm font-semibold text-navy-900">
                Upload client policy PDF
              </p>
              <p className="text-xs text-muted max-w-xs mx-auto leading-relaxed">
                Automatically extract policy clauses for audit.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded border border-ivory-300 bg-white px-4 py-2 text-xs font-semibold text-navy-900 hover:border-navy-900 transition disabled:opacity-50"
                >
                  {uploading ? "Extracting clauses..." : "Choose PDF"}
                </button>
              </div>

              <span className="text-[11px] text-muted block pt-1">
                or drag and drop PDF files here
              </span>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-4 pt-4 border-t border-ivory-200 text-left space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block">
                  Uploaded documents
                </span>
                {uploadedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs text-navy-900 bg-ivory-50 p-2 rounded border border-ivory-200"
                  >
                    <span className="truncate max-w-[200px]">{file.name}</span>
                    <span className="text-muted text-[11px] font-mono">
                      {file.chunkCount} clauses
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {errorMsg && (
        <div className="mt-8 rounded border border-red-300 bg-red-50 p-4 text-xs text-red-800">
          {errorMsg}
        </div>
      )}

      {/* Generate Action CTA */}
      <div className="mt-16 pt-8 border-t border-ivory-300 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-muted">
          All marketing and underwriting claims will be independently cross-checked against source text.
        </p>

        <button
          type="button"
          onClick={onGenerate}
          className="rounded-md border border-navy-900 bg-navy-900 px-8 py-3.5 text-sm font-medium text-white hover:bg-navy-800 transition flex items-center gap-2 shadow-subtle"
        >
          <span>Generate Executive Pitch</span>
          <span>&rarr;</span>
        </button>
      </div>
    </div>
  );
}
