import React, { useState } from "react";
import DonutChart from "./DonutChart.jsx";

const STATUS_STYLES = {
  Verified: { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", color: "#059669" },
  Flagged: { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500", color: "#d97706" },
  Untraceable: { text: "text-red-700", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500", color: "#dc2626" },
};

function StatGroup({ title, status, claims }) {
  const [expanded, setExpanded] = useState(status !== "Verified");
  const style = STATUS_STYLES[status];
  if (claims.length === 0) return null;

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg}`}>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between px-4 py-3"
      >
        <span className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
          <span className={`text-sm font-semibold ${style.text}`}>{status}</span>
          <span className="text-xs text-slate-500">({claims.length})</span>
        </span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="border-t border-slate-200/70 bg-white">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-400">
                <th className="px-4 py-2 font-medium">Claim</th>
                <th className="px-4 py-2 font-medium">Source clause</th>
                <th className="px-4 py-2 font-medium text-right">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.claimId} className="border-t border-slate-100 align-top">
                  <td className="max-w-xs px-4 py-2.5 text-slate-700">{c.claim_text}</td>
                  <td className="max-w-sm px-4 py-2.5 text-slate-500">
                    {c.source_clause ? (
                      <>
                        <span className="italic">&ldquo;{c.source_clause.slice(0, 160)}
                        {c.source_clause.length > 160 ? "\u2026" : ""}&rdquo;</span>
                        {c.sourceInsurer && (
                          <div className="mt-1 text-xs text-navy-600">
                            {c.sourceInsurer}
                            {c.sourcePage ? `, p.${c.sourcePage}` : ""}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400">No clause on record</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-slate-700">
                    {c.confidence_score !== null && c.confidence_score !== undefined ? `${c.confidence_score}%` : "\u2014"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AuditDashboard({ auditReport }) {
  if (!auditReport) return null;
  const { summary, confidenceScore, overallStatus, advisorGuidance, claims } = auditReport;

  const grouped = {
    Verified: claims.filter((c) => c.status === "Verified"),
    Flagged: claims.filter((c) => c.status === "Flagged"),
    Untraceable: claims.filter((c) => c.status === "Untraceable"),
  };

  const statusBadge = overallStatus.startsWith("FAIL")
    ? { text: "text-red-700", bg: "bg-red-100" }
    : overallStatus.startsWith("PASS WITH")
    ? { text: "text-amber-700", bg: "bg-amber-100" }
    : { text: "text-emerald-700", bg: "bg-emerald-100" };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-panel">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-navy-900">Audit &amp; Compliance Dashboard</h2>
          <p className="text-sm text-slate-500">Every claim independently re-checked against its source clause.</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadge.bg} ${statusBadge.text}`}>
          {overallStatus}
        </span>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="flex flex-col items-center justify-center rounded-lg border border-slate-100 bg-slate-25 p-4 sm:col-span-1">
          <DonutChart
            centerValue={`${confidenceScore}%`}
            centerLabel="Confidence"
            segments={[
              { value: summary.verified, color: STATUS_STYLES.Verified.color },
              { value: summary.flagged, color: STATUS_STYLES.Flagged.color },
              { value: summary.untraceable, color: STATUS_STYLES.Untraceable.color },
            ]}
          />
          <div className="mt-4 flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Verified
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" /> Flagged
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-red-500" /> Untraceable
            </span>
          </div>
        </div>

        <div className="sm:col-span-2">
          <p className="mb-3 text-sm font-medium text-navy-900">Advisor guidance</p>
          <p className="text-sm leading-relaxed text-slate-600">{advisorGuidance}</p>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-100 bg-slate-25 p-3 text-center">
              <div className="text-xl font-bold text-emerald-600">{summary.verified}</div>
              <div className="text-xs text-slate-500">Verified</div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-25 p-3 text-center">
              <div className="text-xl font-bold text-amber-600">{summary.flagged}</div>
              <div className="text-xs text-slate-500">Flagged</div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-25 p-3 text-center">
              <div className="text-xl font-bold text-red-600">{summary.untraceable}</div>
              <div className="text-xs text-slate-500">Untraceable</div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <StatGroup title="Untraceable" status="Untraceable" claims={grouped.Untraceable} />
        <StatGroup title="Flagged" status="Flagged" claims={grouped.Flagged} />
        <StatGroup title="Verified" status="Verified" claims={grouped.Verified} />
      </div>
    </div>
  );
}
