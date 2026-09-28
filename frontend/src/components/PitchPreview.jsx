import React, { useState } from "react";
import Card3D from "./Card3D.jsx";
import ExecutivePresentationModal from "./ExecutivePresentationModal.jsx";

const STATUS_DOT = {
  Verified: "bg-emerald-400 shadow-[0_0_8px_#34d399]",
  Flagged: "bg-amber-400 shadow-[0_0_8px_#fbbf24]",
  Untraceable: "bg-red-400 shadow-[0_0_8px_#f87171]",
  Context: "bg-marsh-azure shadow-[0_0_8px_#00a3e0]",
};

function ClaimRow({ claim, audit, onInspect }) {
  const status = audit?.status || (claim.type === "policy_claim" ? "Verified" : "Context");
  const confidence = audit?.confidence_score ?? claim.confidence_score;

  return (
    <li
      onClick={() => onInspect && onInspect(claim, audit)}
      className="group flex items-start gap-4 rounded-xl p-3.5 transition hover:bg-marsh-azure/10 cursor-pointer border border-transparent hover:border-marsh-azure/30"
    >
      <span className={`mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${STATUS_DOT[status]}`} />
      <div className="flex-1 text-xs md:text-sm text-slate-200">
        <span className="leading-relaxed group-hover:text-white transition">
          {claim.text}
        </span>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          {claim.sourceInsurer && (
            <span className="rounded bg-marsh-azure/10 px-2 py-0.5 font-mono text-[11px] text-marsh-azure border border-marsh-azure/20">
              {claim.sourceInsurer}
              {claim.sourcePage ? `, p.${claim.sourcePage}` : ""}
            </span>
          )}
          {confidence != null && (
            <span className="rounded bg-marsh-dark px-2 py-0.5 font-mono text-[10px] text-slate-300 border border-slate-700">
              Confidence: {confidence}%
            </span>
          )}
          <span className="text-[10px] text-marsh-azure group-hover:text-marsh-sky transition opacity-0 group-hover:opacity-100 font-medium">
            Inspect source clause &rarr;
          </span>
        </div>
      </div>
    </li>
  );
}

function ComparatorTable({ comparatorTable, recommended }) {
  const insurers = comparatorTable.ranking.map((r) => r.insurer);
  const recInsurer = recommended || comparatorTable.ranking[0]?.insurer;

  return (
    <div className="overflow-x-auto rounded-xl border border-marsh-azure/25 bg-marsh-midnight/80 shadow-inner">
      <table className="w-full min-w-[620px] text-left text-sm">
        <thead>
          <tr className="border-b border-marsh-azure/20 bg-marsh-navy">
            <th className="px-4 py-3.5 font-semibold text-marsh-azure text-xs uppercase tracking-wider">
              Underwriting Term
            </th>
            {insurers.map((ins) => {
              const isRec = ins === recInsurer;
              return (
                <th
                  key={ins}
                  className={`px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wider ${
                    isRec
                      ? "bg-marsh-azure/20 text-white border-x border-marsh-azure/40"
                      : "text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    {isRec && <span className="text-gold-400 font-bold">&#9733;</span>}
                    <span>{ins}</span>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-sans">
          {comparatorTable.rows.map((row, i) => (
            <tr
              key={row.key}
              className={i % 2 === 0 ? "bg-marsh-midnight/40" : "bg-marsh-dark/60"}
            >
              <td className="px-4 py-3.5 font-medium text-slate-200 text-xs md:text-sm">
                {row.criterion}
              </td>
              {insurers.map((ins) => {
                const cell = row.byInsurer[ins];
                const found = cell && cell.score > 0.03;
                const isRec = ins === recInsurer;
                return (
                  <td
                    key={ins}
                    className={`px-4 py-3.5 text-center text-xs md:text-sm ${
                      isRec
                        ? "bg-marsh-azure/10 font-semibold text-white border-x border-marsh-azure/20"
                        : found
                        ? "text-slate-300"
                        : "text-slate-500"
                    }`}
                  >
                    {found ? cell.value || "Covered" : "Not specified"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PitchPreview({
  pitch,
  auditReport,
  onExport,
  exporting,
  onSelectClaim,
}) {
  const [index, setIndex] = useState(0);
  const [showPresentation, setShowPresentation] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!pitch || !pitch.slides || pitch.slides.length === 0) return null;

  const slides = pitch.slides;
  const slide = slides[index];

  const auditByClaim = {};
  (auditReport?.claims || []).forEach((c) => {
    auditByClaim[c.claimId] = c;
  });

  const handleCopySummary = () => {
    const text = slides
      .map(
        (s, i) =>
          `Slide ${i + 1}: ${s.title}\n` +
          (s.claims?.map((c) => `  - ${c.text}`).join("\n") || "  - [Comparator Matrix]")
      )
      .join("\n\n");
    navigator.clipboard.writeText(`MARSH EXECUTIVE PITCH: ${pitch.companyName}\n\n${text}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Card3D className="p-6 md:p-8 space-y-6 border-marsh-azure/25">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-marsh-azure/15">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-marsh-azure/20 border border-marsh-azure/40 text-marsh-azure">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
              <h2 className="text-lg md:text-xl font-display font-bold text-white tracking-wide">
                Executive Boardroom Pitch Deck
              </h2>
              <span className="rounded-full bg-marsh-navy px-3 py-0.5 text-xs font-semibold text-marsh-azure border border-marsh-azure/30">
                {pitch.companyName}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Boardroom-grade presentation synthesized with audited data points and policy comparator.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* 3D Presentation Mode */}
            <button
              type="button"
              onClick={() => setShowPresentation(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-marsh-azure/40 bg-marsh-azure/15 px-3.5 py-2 text-xs font-semibold text-white hover:bg-marsh-azure/25 hover:border-marsh-azure transition shadow-sm"
            >
              <svg className="w-4 h-4 text-marsh-azure" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <span>3D Boardroom Mode</span>
            </button>

            {/* Copy Summary */}
            <button
              type="button"
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-marsh-midnight/80 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-600 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{copied ? "Copied!" : "Copy Deck Text"}</span>
            </button>

            {/* Export PPTX */}
            <button
              type="button"
              onClick={onExport}
              disabled={exporting}
              className="marsh-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs uppercase tracking-wider transition disabled:opacity-50"
            >
              {exporting ? (
                <>
                  <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span>Generating .pptx...</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  <span>Export PowerPoint</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Slide Carousel Tabs */}
        <div className="flex flex-wrap items-center gap-2 pb-2">
          {slides.map((s, i) => (
            <button
              key={s.id || i}
              type="button"
              onClick={() => setIndex(i)}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                index === i
                  ? "bg-marsh-azure text-white shadow-md shadow-marsh-azure/20"
                  : "bg-marsh-midnight/80 text-slate-300 border border-slate-800 hover:border-marsh-azure/40 hover:text-white"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-mono ${
                  index === i ? "bg-white text-marsh-dark font-bold" : "bg-slate-800 text-slate-400"
                }`}
              >
                {i + 1}
              </span>
              <span className="truncate max-w-[150px] md:max-w-none">{s.title.split(":")[0]}</span>
            </button>
          ))}
        </div>

        {/* Slide Display Surface */}
        <div className="min-h-[22rem] rounded-2xl border border-marsh-azure/20 bg-gradient-to-br from-marsh-midnight via-marsh-dark to-marsh-midnight p-6 md:p-8 shadow-inner relative">
          {/* Slide Heading */}
          <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-2 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-marsh-azure/20 border border-marsh-azure/40 text-xs font-bold font-mono text-marsh-azure">
                0{index + 1}
              </span>
              <div>
                <span className="text-[10px] uppercase tracking-widest text-marsh-azure font-bold block">
                  Slide {index + 1} of {slides.length}
                </span>
                <h3 className="text-base md:text-lg font-display font-bold text-white">
                  {slide.title}
                </h3>
              </div>
            </div>

            <span className="text-[11px] text-slate-400 font-mono self-start md:self-auto">
              Marsh McLennan Executive Format
            </span>
          </div>

          {/* Slide Content */}
          {slide.comparatorTable ? (
            <div className="space-y-4">
              <ComparatorTable
                comparatorTable={slide.comparatorTable}
                recommended={pitch.recommended}
              />
              {pitch.recommended && (
                <div className="rounded-xl border border-marsh-azure/30 bg-gradient-to-r from-marsh-navy via-marsh-cobalt/40 to-marsh-navy p-4 text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-gold-400 font-bold text-base">&#9733;</span>
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-marsh-azure font-bold block">
                          Recommended Placement
                        </span>
                        <span className="text-sm font-semibold text-white">
                          {pitch.recommended}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-mono hidden sm:block">
                      Optimized Benchmark Match
                    </span>
                  </div>
                  {pitch.recommendationReason && (
                    <p className="text-xs text-slate-300 border-t border-slate-700/60 pt-2 leading-relaxed">
                      {pitch.recommendationReason}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-slate-800/60">
              {slide.claims.map((claim) => (
                <ClaimRow
                  key={claim.id}
                  claim={claim}
                  audit={auditByClaim[claim.id]}
                  onInspect={(c, a) => onSelectClaim && onSelectClaim(a || c)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Carousel Navigation */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="rounded-xl border border-slate-700 bg-marsh-midnight px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-marsh-azure/40 transition disabled:opacity-30 disabled:pointer-events-none"
          >
            &larr; Previous Slide
          </button>

          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`h-2 rounded-full transition-all ${
                  i === index
                    ? "w-6 bg-marsh-azure shadow-[0_0_8px_#00a3e0]"
                    : "w-2 bg-slate-700 hover:bg-slate-500"
                }`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
            disabled={index === slides.length - 1}
            className="rounded-xl border border-marsh-azure/30 bg-marsh-azure/15 px-3.5 py-2 text-xs font-semibold text-white hover:bg-marsh-azure/25 transition disabled:opacity-30 disabled:pointer-events-none"
          >
            Next Slide &rarr;
          </button>
        </div>
      </Card3D>

      {/* 3D Boardroom Presentation Theater Modal */}
      {showPresentation && (
        <ExecutivePresentationModal
          pitch={pitch}
          auditReport={auditReport}
          initialIndex={index}
          onClose={() => setShowPresentation(false)}
        />
      )}
    </>
  );
}
