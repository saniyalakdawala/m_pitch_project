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

      {/* Light Blue Editorial Advisory Section (#C8E9FA) */}
      <div className="my-12 md:my-16 w-full rounded-2xl border border-[#B5E0F7] bg-[#C8E9FA] py-14 sm:py-16 md:py-20 px-8 sm:px-12 md:px-16 relative overflow-hidden shadow-[0_2px_12px_rgba(7,26,73,0.03)]">
        {/* Subtle abstract / organic background vector treatment */}
        <div className="pointer-events-none absolute inset-0 z-0 opacity-40">
          <svg
            className="w-full h-full object-cover"
            viewBox="0 0 1000 400"
            fill="none"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Soft organic contour waves */}
            <path
              d="M-50 220 C 150 120, 320 280, 520 180 C 720 80, 850 260, 1050 140"
              stroke="#071A49"
              strokeWidth="1.5"
              strokeOpacity="0.14"
              fill="none"
            />
            <path
              d="M-50 260 C 180 160, 350 320, 550 220 C 750 120, 880 300, 1050 180"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeOpacity="0.65"
              fill="none"
            />
            <path
              d="M-50 180 C 120 80, 290 240, 490 140 C 690 40, 820 220, 1050 100"
              stroke="#071A49"
              strokeWidth="1"
              strokeOpacity="0.1"
              fill="none"
            />
            <path
              d="M-50 300 C 200 200, 380 360, 580 260 C 780 160, 910 340, 1050 220"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeOpacity="0.5"
              fill="none"
            />
            {/* Delicate organic topographic ripples */}
            <circle cx="820" cy="200" r="160" stroke="#071A49" strokeWidth="1" strokeOpacity="0.08" />
            <circle cx="820" cy="200" r="110" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.4" />
            <circle cx="820" cy="200" r="60" stroke="#071A49" strokeWidth="1" strokeOpacity="0.08" />
          </svg>
        </div>

        {/* Content with plenty of whitespace and clean navy typography */}
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-navy-800/80">
            <span className="w-1.5 h-1.5 rounded-full bg-navy-900 inline-block"></span>
            <span>Advisory Architecture · Policy Clause Verification</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-normal text-navy-900 leading-[1.2] tracking-tight">
            Bridging corporate exposure with verified underwriter reality.
          </h2>

          <p className="text-sm sm:text-base text-navy-900/80 font-normal leading-relaxed max-w-2xl">
            Every numerical benefit limit, proportionate rent deduction, and waiting period waiver is algorithmically benchmarked against prevailing group terms. Providing corporate advisors with an auditable factual foundation prior to placement negotiations.
          </p>

          <div className="pt-4 border-t border-[#A8DEF7]/60 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs text-navy-900">
            <div>
              <span className="font-bold block text-navy-900 font-sans text-sm">100% Traceable</span>
              <span className="text-navy-800/75 mt-0.5 block leading-normal">
                Verifiable citations cited to source document and page number.
              </span>
            </div>
            <div>
              <span className="font-bold block text-navy-900 font-sans text-sm">Algorithmic Match</span>
              <span className="text-navy-800/75 mt-0.5 block leading-normal">
                TF-IDF vector matching against top underwriter schedules.
              </span>
            </div>
            <div>
              <span className="font-bold block text-navy-900 font-sans text-sm">Zero Fabrication</span>
              <span className="text-navy-800/75 mt-0.5 block leading-normal">
                Deterministic exposure modeling without arbitrary estimates.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Input Section */}
      <div className="pt-6 md:pt-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
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
              className="w-full rounded border border-ivory-300 bg-white px-4 py-3.5 text-sm text-navy-900 placeholder:text-muted/60 focus:border-navy-900 focus:ring-2 focus:ring-[#C8E9FA]/60 focus:outline-none transition shadow-subtle"
            />

            {/* Suggested Companies as Simple Outlined Pills with connected subtle blue accents */}
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
                          ? "border-navy-900 bg-navy-900 text-white ring-2 ring-[#C8E9FA]"
                          : "border-ivory-300 bg-white text-muted-dark hover:border-[#A8DEF7] hover:bg-[#F0F9FD] hover:text-navy-900"
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
                className="flex w-full items-center justify-between rounded border border-ivory-300 bg-white px-4 py-3.5 text-left text-sm text-navy-900 shadow-subtle hover:border-[#A8DEF7] hover:bg-[#F2F9FD]/50 transition"
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
                          <label className="flex items-center gap-3 p-2 rounded hover:bg-[#F0F9FD] cursor-pointer text-xs text-navy-900 transition">
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
              dragOver ? "border-navy-900 bg-[#F0F9FD]" : "border-ivory-300 hover:border-[#A8DEF7]"
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
                  className="rounded border border-ivory-300 bg-white px-4 py-2 text-xs font-semibold text-navy-900 hover:border-[#A8DEF7] hover:bg-[#F0F9FD] transition disabled:opacity-50"
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
                    className="flex items-center justify-between text-xs text-navy-900 bg-[#F2F9FD] p-2 rounded border border-[#C8E9FA]"
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
          className="rounded-md border border-navy-900 bg-navy-900 px-8 py-3.5 text-sm font-medium text-white hover:bg-navy-800 hover:shadow-[0_2px_12px_rgba(200,233,250,0.6)] transition flex items-center gap-2 shadow-subtle"
        >
          <span>Generate Executive Pitch</span>
          <span>&rarr;</span>
        </button>
      </div>
    </div>
  );
}
