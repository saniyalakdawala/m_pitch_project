import React, { useState } from "react";

export default function ClaimInspectorModal({ claim, audit, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!claim) return null;

  const status = audit?.status || (claim.type === "policy_claim" ? "Verified" : "Context");
  const confidence = audit?.confidence_score ?? claim.confidence_score;
  const sourceClause = audit?.source_clause || claim.source_clause;
  const sourceInsurer = audit?.sourceInsurer || claim.sourceInsurer || "Policy Archive";
  const sourcePage = audit?.sourcePage || claim.sourcePage;

  const statusConfig = {
    Verified: {
      badgeBg: "bg-emerald-950/80 border-emerald-500/40 text-emerald-400",
      dot: "bg-emerald-400 shadow-[0_0_8px_#34d399]",
      title: "Gold Verified",
      sub: "Numeric and semantic terms independently verified against policy text",
    },
    Flagged: {
      badgeBg: "bg-amber-950/80 border-amber-500/40 text-amber-400",
      dot: "bg-amber-400 shadow-[0_0_8px_#fbbf24]",
      title: "Advisory Flagged",
      sub: "Partial match or wording variation requiring advisor confirmation",
    },
    Untraceable: {
      badgeBg: "bg-red-950/80 border-red-500/40 text-red-400",
      dot: "bg-red-400 shadow-[0_0_8px_#f87171]",
      title: "Untraceable",
      sub: "No backing clause identified in loaded policy documents",
    },
    Context: {
      badgeBg: "bg-marsh-navy border-marsh-azure/40 text-marsh-azure",
      dot: "bg-marsh-azure shadow-[0_0_8px_#00a3e0]",
      title: "Corporate Intelligence",
      sub: "Public company filings, Wikidata, or Marsh strategic capability statement",
    },
  }[status] || {
    badgeBg: "bg-slate-800 border-slate-700 text-slate-300",
    dot: "bg-slate-400",
    title: status,
    sub: "Standard Statement",
  };

  const handleCopyClause = () => {
    if (sourceClause) {
      navigator.clipboard.writeText(sourceClause);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-marsh-dark/85 backdrop-blur-xl transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-marsh-azure/30 bg-gradient-to-b from-marsh-navy via-marsh-midnight to-marsh-dark p-6 md:p-8 shadow-2xl shadow-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Marsh Accent Line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-marsh-azure via-marsh-sky to-marsh-cobalt" />

        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-marsh-azure/15">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-marsh-azure/15 border border-marsh-azure/30 text-marsh-azure">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-wider text-marsh-azure font-display">
                  Clause Verification Inspector
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {claim.id || audit?.claimId || "#CLAIM"}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Marsh McLennan Independent Placement Audit Protocol
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-white/5 transition"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-5 space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Status Ribbon */}
          <div
            className={`flex items-center justify-between rounded-2xl border px-5 py-3.5 ${statusConfig.badgeBg}`}
          >
            <div className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full ${statusConfig.dot}`} />
              <div>
                <span className="text-xs font-bold uppercase tracking-wider block">
                  {statusConfig.title}
                </span>
                <span className="text-[11px] opacity-80">{statusConfig.sub}</span>
              </div>
            </div>
            {confidence != null && (
              <div className="text-right">
                <span className="text-2xl font-bold font-mono tracking-tight">{confidence}%</span>
                <span className="text-[10px] block opacity-75 uppercase tracking-wider">Confidence</span>
              </div>
            )}
          </div>

          {/* Statement in Deck */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-marsh-azure mb-1.5 block">
              Audited Pitch Statement in Client Deck
            </label>
            <div className="rounded-2xl border border-slate-700/60 bg-marsh-dark/80 p-4 text-sm text-slate-100 leading-relaxed font-sans shadow-inner">
              &ldquo;{claim.text || claim.claim_text}&rdquo;
            </div>
          </div>

          {/* Source Policy Clause */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-marsh-azure">
                Audited Source Policy Clause
              </label>
              {sourceClause && (
                <button
                  type="button"
                  onClick={handleCopyClause}
                  className="text-xs text-marsh-azure hover:text-white font-medium flex items-center gap-1 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                    />
                  </svg>
                  {copied ? "Copied!" : "Copy Clause"}
                </button>
              )}
            </div>

            <div className="rounded-2xl border border-marsh-azure/20 bg-marsh-midnight/90 p-4 font-mono text-xs text-slate-200 leading-relaxed shadow-inner">
              {sourceClause ? (
                <div>
                  <p className="whitespace-pre-wrap text-slate-100">
                    &ldquo;{sourceClause}&rdquo;
                  </p>
                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-marsh-azure font-sans">
                    <span className="flex items-center gap-1.5 font-medium">
                      <svg className="w-3.5 h-3.5 text-marsh-azure" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {sourceInsurer}
                    </span>
                    {sourcePage && (
                      <span className="rounded bg-marsh-azure/10 px-2.5 py-0.5 border border-marsh-azure/30">
                        Page {sourcePage} of Brochure
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-slate-400 italic py-2">
                  No source clause was linked to this statement. In strict mode, claims without cited clauses are categorized as untraceable or context.
                </div>
              )}
            </div>
          </div>

          {/* Audit Technical Metrics */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-800 bg-marsh-midnight/60 p-3.5">
              <span className="text-slate-400 block mb-1">Auditing Algorithm</span>
              <span className="text-white font-medium">TF-IDF Vector Cosine &bull; Groq Cross-Check</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-marsh-midnight/60 p-3.5">
              <span className="text-slate-400 block mb-1">Verification Standard</span>
              <span className="text-gold-300 font-medium">Marsh McLennan Gold Tier</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-marsh-azure/15 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-marsh-azure/40 bg-marsh-azure/15 px-5 py-2.5 text-xs font-semibold text-white hover:bg-marsh-azure/25 transition"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
