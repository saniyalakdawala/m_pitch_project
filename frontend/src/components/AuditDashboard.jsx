import React, { useState } from "react";
import DonutChart from "./DonutChart.jsx";
import Card3D from "./Card3D.jsx";

const STATUS_CONFIG = {
  Verified: {
    text: "text-emerald-400",
    bg: "bg-emerald-950/40",
    border: "border-emerald-500/40",
    dot: "bg-emerald-400 shadow-[0_0_8px_#34d399]",
    color: "#10b981",
    label: "Gold Verified",
  },
  Flagged: {
    text: "text-amber-400",
    bg: "bg-amber-950/40",
    border: "border-amber-500/40",
    dot: "bg-amber-400 shadow-[0_0_8px_#fbbf24]",
    color: "#f59e0b",
    label: "Advisory Review",
  },
  Untraceable: {
    text: "text-red-400",
    bg: "bg-red-950/40",
    border: "border-red-500/40",
    dot: "bg-red-400 shadow-[0_0_8px_#f87171]",
    color: "#ef4444",
    label: "Untraceable",
  },
};

export default function AuditDashboard({ auditReport, onSelectClaim }) {
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  if (!auditReport) return null;
  const { summary, confidenceScore, overallStatus, advisorGuidance, claims = [] } = auditReport;

  const statusBadge = overallStatus.startsWith("FAIL")
    ? { text: "text-red-400 border-red-500/50 bg-red-950/60", dot: "bg-red-500 shadow-[0_0_8px_#ef4444]" }
    : overallStatus.includes("REVIEW") || overallStatus.includes("FLAGGED")
    ? { text: "text-amber-300 border-amber-500/50 bg-amber-950/60", dot: "bg-amber-400 shadow-[0_0_8px_#f59e0b]" }
    : { text: "text-gold-300 border-gold-500/50 bg-gold-950/40", dot: "bg-gold-400 shadow-[0_0_8px_#d4af37]" };

  const filteredClaims = claims.filter((c) => {
    const matchesTab = activeTab === "All" || c.status === activeTab;
    const matchesQuery =
      !searchQuery ||
      c.claim_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.sourceInsurer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.source_clause?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesQuery;
  });

  return (
    <Card3D className="p-6 md:p-8 space-y-6 border-marsh-azure/25">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-marsh-azure/15">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-marsh-azure/20 border border-marsh-azure/40 text-marsh-azure">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h2 className="text-lg md:text-xl font-display font-bold text-white tracking-wide">
              Marsh Compliance &amp; Clause Verification Dashboard
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Algorithmic proof layer: Every quantified promise in the client deck is cross-referenced against the insurer's legal brochure.
          </p>
        </div>

        {/* Status Badge */}
        <div className={`inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider ${statusBadge.text}`}>
          <span className={`h-2 w-2 rounded-full ${statusBadge.dot}`} />
          <span>{overallStatus}</span>
        </div>
      </div>

      {/* 3D Gauge & Intelligence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* 3D Donut Chart Card */}
        <div className="md:col-span-4 flex flex-col items-center justify-center rounded-2xl border border-marsh-azure/20 bg-marsh-midnight/90 p-5 shadow-inner">
          <DonutChart
            centerValue={`${confidenceScore}%`}
            centerLabel="Confidence"
            segments={[
              { value: summary.verified, color: STATUS_CONFIG.Verified.color },
              { value: summary.flagged, color: STATUS_CONFIG.Flagged.color },
              { value: summary.untraceable, color: STATUS_CONFIG.Untraceable.color },
            ]}
          />
          <div className="mt-4 flex items-center justify-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1.5 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              {summary.verified} Verified
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]" />
              {summary.flagged} Flagged
            </span>
            {summary.untraceable > 0 && (
              <span className="flex items-center gap-1.5 text-red-400">
                <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_6px_#f87171]" />
                {summary.untraceable} Untraceable
              </span>
            )}
          </div>
        </div>

        {/* Advisor Guidance & Metrics */}
        <div className="md:col-span-8 space-y-4">
          <div className="rounded-2xl border border-marsh-azure/20 bg-marsh-midnight/80 p-5 shadow-inner">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-marsh-azure">
                Lead Advisor Guidance &bull; Placement Brief
              </span>
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                Marsh Global Standard 4.2
              </span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-sans">
              {advisorGuidance}
            </p>
          </div>

          {/* Metric Counter Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 text-center">
              <div className="text-2xl font-display font-extrabold text-emerald-400 font-mono">
                {summary.verified}
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">
                Verified Claims
              </div>
            </div>

            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-center">
              <div className="text-2xl font-display font-extrabold text-amber-400 font-mono">
                {summary.flagged}
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">
                Advisory Review
              </div>
            </div>

            <div className="rounded-xl border border-marsh-azure/30 bg-marsh-midnight/80 p-3.5 text-center">
              <div className="text-2xl font-display font-extrabold text-marsh-azure font-mono">
                {confidenceScore}%
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">
                Match Index
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-marsh-azure/15">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-marsh-midnight/90 border border-marsh-azure/20 w-full sm:w-auto">
          {["All", "Verified", "Flagged", "Untraceable"].map((tab) => {
            const count =
              tab === "All"
                ? claims.length
                : tab === "Verified"
                ? summary.verified
                : tab === "Flagged"
                ? summary.flagged
                : summary.untraceable;
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-marsh-azure text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab} <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Live Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search audited clauses or insurers..."
            className="w-full rounded-xl border border-marsh-azure/20 bg-marsh-midnight/90 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-marsh-azure focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-white"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Claims Audit Table */}
      <div className="overflow-hidden rounded-xl border border-marsh-azure/20 bg-marsh-midnight/80 shadow-inner">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-marsh-azure/15 bg-marsh-navy/80 text-[11px] uppercase tracking-wider text-marsh-azure">
              <th className="px-4 py-3 font-semibold">Audit Status</th>
              <th className="px-4 py-3 font-semibold">Pitch Claim Statement</th>
              <th className="px-4 py-3 font-semibold">Source Clause Quote</th>
              <th className="px-4 py-3 font-semibold text-right">Confidence</th>
              <th className="px-4 py-3 font-semibold text-right">Trace</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {filteredClaims.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-xs text-slate-400">
                  No claims found matching this category.
                </td>
              </tr>
            ) : (
              filteredClaims.map((c) => {
                const conf = STATUS_CONFIG[c.status] || STATUS_CONFIG.Verified;
                return (
                  <tr
                    key={c.claimId}
                    onClick={() => onSelectClaim && onSelectClaim(c)}
                    className="cursor-pointer transition hover:bg-marsh-azure/10 group"
                  >
                    <td className="px-4 py-3.5 align-top whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${conf.bg} ${conf.text} border ${conf.border}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
                        {c.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 align-top max-w-xs text-xs md:text-sm text-slate-200 group-hover:text-white transition">
                      {c.claim_text}
                    </td>

                    <td className="px-4 py-3.5 align-top max-w-sm text-xs text-slate-400">
                      {c.source_clause ? (
                        <>
                          <span className="italic block line-clamp-2 text-slate-300">
                            &ldquo;{c.source_clause}&rdquo;
                          </span>
                          {c.sourceInsurer && (
                            <div className="mt-1 flex items-center gap-2 text-[10px] text-marsh-azure font-mono">
                              <span>{c.sourceInsurer}</span>
                              {c.sourcePage && <span>&bull; Page {c.sourcePage}</span>}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-500 italic">No clause indexed</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 align-top text-right font-mono text-xs font-bold text-white">
                      {c.confidence_score != null ? `${c.confidence_score}%` : "&mdash;"}
                    </td>

                    <td className="px-4 py-3.5 align-top text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-marsh-azure group-hover:text-marsh-sky transition">
                        <span>Inspect</span>
                        <span>&rarr;</span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card3D>
  );
}
