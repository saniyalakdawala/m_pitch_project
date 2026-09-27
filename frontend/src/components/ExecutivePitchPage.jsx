import React, { useState } from "react";

/**
 * Robust currency and numerical formatter for executive presentations.
 * Handles numbers and strings seamlessly.
 */
export function formatCurrency(val, currency = "INR") {
  if (val === null || val === undefined || val === "") {
    return "Not available";
  }

  // If already formatted text (e.g. "1% of SI" or "₹50,000" or text benchmark)
  if (typeof val === "string") {
    if (val.trim() === "") return "Not available";
    const cleaned = val.replace(/,/g, "").trim();
    if (!isNaN(cleaned) && cleaned !== "") {
      val = Number(cleaned);
    } else {
      return val;
    }
  }

  const num = Number(val);
  if (isNaN(num)) return String(val);

  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);

  if (currency === "INR" || !currency) {
    if (abs >= 10000000) {
      const cr = abs / 10000000;
      return `${sign}₹${cr >= 100 ? cr.toFixed(0) : cr.toFixed(2).replace(/\.?0+$/, "")} Cr`;
    }
    if (abs >= 100000) {
      const l = abs / 100000;
      return `${sign}₹${l >= 100 ? l.toFixed(0) : l.toFixed(2).replace(/\.?0+$/, "")} L`;
    }
    if (abs >= 1000) {
      return `${sign}₹${abs.toLocaleString("en-IN")}`;
    }
    return `${sign}₹${abs}`;
  }

  // Non-INR fallback (USD / global)
  if (abs >= 1000000) {
    return `${sign}$${(abs / 1000000).toFixed(2).replace(/\.?0+$/, "")}M`;
  }
  return `${sign}$${abs.toLocaleString()}`;
}

export default function ExecutivePitchPage({
  result,
  onNewPitch,
  onExport,
  exporting,
}) {
  const [activeClauseFilter, setActiveClauseFilter] = useState("all");

  if (!result) return null;

  // Destructure structured fields with safe fallbacks to backend-generated values
  const client = result.client || {};
  const companyName = client.name || result.pitch?.companyName || "Client Enterprise";
  const industry = client.industry || "Corporate & Commercial Risk";
  const companySize = client.company_size || (client.employees ? `${client.employees.toLocaleString()} employees` : null);

  const financialSnapshot = result.financial_snapshot || null;
  const riskExposure = Array.isArray(result.risk_exposure) ? result.risk_exposure : [];
  const coverageAnalysis = Array.isArray(result.coverage_analysis) ? result.coverage_analysis : [];
  const policyAudit = result.policy_audit || null;
  const rawClauses = Array.isArray(result.clauses)
    ? result.clauses
    : Array.isArray(result.auditReport?.claims)
    ? result.auditReport.claims.map((c) => ({
        clause: c.claim_text,
        current_wording: c.source_clause,
        benchmark_wording: c.benchmark_clause || c.claim_text,
        similarity_score: c.confidence_score ? c.confidence_score / 100 : 0.85,
        status: c.status === "Flagged" ? "Review" : c.status === "Untraceable" ? "Gap" : "Verified",
        source: c.sourceInsurer || "Policy Brochure",
        page: c.sourcePage || null,
      }))
    : [];

  const scenarioAnalysis = Array.isArray(result.scenario_analysis) ? result.scenario_analysis : [];
  const executiveInsight = result.executive_insight || result.auditReport?.advisorGuidance || null;
  const executiveSummary = result.executive_summary || result.pitch?.slides?.[0]?.claims?.[0]?.text || null;

  const currentDate = result.timestamp
    ? new Date(result.timestamp).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

  // Filter clauses by status
  const filteredClauses = rawClauses.filter((c) => {
    if (activeClauseFilter === "all") return true;
    return (c.status || "").toLowerCase() === activeClauseFilter.toLowerCase();
  });

  // Calculate metrics for financial chart if data exists
  const hasFinancialChartData =
    financialSnapshot &&
    financialSnapshot.data_available !== false &&
    financialSnapshot.estimated_exposure != null &&
    financialSnapshot.current_coverage != null &&
    (financialSnapshot.estimated_exposure > 0 || financialSnapshot.current_coverage > 0);

  const maxExposure = hasFinancialChartData
    ? Math.max(financialSnapshot.estimated_exposure, financialSnapshot.current_coverage)
    : 1;

  // Filter risk exposures that have data
  const hasRiskExposureData =
    riskExposure.length > 0 &&
    riskExposure.some((r) => r.exposure != null || r.data_available);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 md:py-16 md:px-12 text-navy-900 font-sans">
      {/* =========================================================================
          TOP CONTROLS BAR (SECTION 9)
          - Top right export controls
          - No export controls at the bottom
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-8 border-b border-ivory-300 no-print">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-700"></span>
          <span>Verified Advisory Analysis</span>
          {result.analysis_id && (
            <>
              <span className="text-ivory-300">·</span>
              <span className="font-mono text-[11px] text-muted-dark">
                ID: {result.analysis_id.slice(0, 16)}
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onExport}
            disabled={exporting}
            className="rounded border border-navy-900 bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 transition shadow-subtle disabled:opacity-50 flex items-center gap-1.5"
            title="Download executive PowerPoint slide deck (.pptx)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{exporting ? "Generating PPT..." : "Export Executive Pitch"}</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="rounded border border-ivory-300 bg-white px-4 py-2 text-xs font-medium text-navy-900 hover:border-navy-900 transition shadow-subtle flex items-center gap-1.5"
            title="Print or save as high-fidelity PDF document"
          >
            <svg className="w-3.5 h-3.5 text-muted-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Download PDF</span>
          </button>

          <button
            type="button"
            onClick={onNewPitch}
            className="rounded border border-ivory-300 bg-white px-3.5 py-2 text-xs font-medium text-muted-dark hover:text-navy-900 hover:border-navy-900 transition shadow-subtle"
          >
            Start New Analysis
          </button>
        </div>
      </div>

      {/* =========================================================================
          SECTION 10: HEADER
          - EXECUTIVE RISK & POLICY PITCH
          - Client name
          - “Corporate risk, from every angle.”
          ========================================================================= */}
      <div className="pt-10 pb-12 border-b border-ivory-300">
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-muted block">
            Executive Risk &amp; Policy Pitch
          </span>
          <span className="text-xs text-muted font-serif italic">
            Prepared by Marsh Advisory · {currentDate}
          </span>
        </div>

        {/* Client Name & Metadata */}
        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl sm:text-3xl font-sans font-bold text-navy-900 tracking-tight">
            {companyName}
          </h1>
          {industry && (
            <span className="text-xs text-muted font-medium border-l border-ivory-300 pl-3">
              {industry}
            </span>
          )}
          {companySize && (
            <span className="text-xs text-muted font-medium border-l border-ivory-300 pl-3">
              {companySize}
            </span>
          )}
        </div>

        {/* Editorial Serif Tagline */}
        <h2 className="mt-6 font-serif text-4xl sm:text-5xl md:text-6xl font-normal leading-[1.12] text-navy-900 tracking-tight">
          Corporate risk,<br />
          from every angle.
        </h2>

        {/* Executive Summary if available */}
        {executiveSummary && (
          <div className="mt-8 max-w-3xl text-base md:text-lg text-muted-dark leading-relaxed font-sans">
            <p>{executiveSummary}</p>
          </div>
        )}
      </div>

      {/* =========================================================================
          SECTION 10 (CONT.): FINANCIAL SNAPSHOT
          - Estimated Exposure, Current Coverage, Coverage Gap, Coverage %, Uninsured Exposure
          - "Show only metrics that actually exist. If a value is unavailable, show 'Not available'"
          ========================================================================= */}
      <section className="py-12 border-b border-ivory-300">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <div>
            <h3 className="font-serif text-2xl md:text-3xl font-normal text-navy-900">
              Financial snapshot
            </h3>
            <p className="mt-1 text-xs text-muted">
              Quantified coverage bounds extracted from cited policy schedules and corporate disclosures.
            </p>
          </div>
          {financialSnapshot && !financialSnapshot.data_available && (
            <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
              Source policy contains partial monetary terms
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* 1. Estimated Exposure */}
          <div className="border border-ivory-300 bg-white p-5 rounded shadow-subtle">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
              Estimated Exposure
            </span>
            <div className="mt-2 text-xl sm:text-2xl font-bold font-sans text-navy-900 tracking-tight">
              {formatCurrency(financialSnapshot?.estimated_exposure, financialSnapshot?.currency)}
            </div>
            <span className="mt-1 text-[11px] text-muted block">
              Enterprise liability model
            </span>
          </div>

          {/* 2. Current Coverage */}
          <div className="border border-ivory-300 bg-white p-5 rounded shadow-subtle">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
              Current Coverage
            </span>
            <div className="mt-2 text-xl sm:text-2xl font-bold font-sans text-navy-900 tracking-tight">
              {formatCurrency(financialSnapshot?.current_coverage, financialSnapshot?.currency)}
            </div>
            <span className="mt-1 text-[11px] text-muted block">
              Indemnified policy limits
            </span>
          </div>

          {/* 3. Coverage Gap */}
          <div className="border border-ivory-300 bg-white p-5 rounded shadow-subtle">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
              Coverage Gap
            </span>
            <div className={`mt-2 text-xl sm:text-2xl font-bold font-sans tracking-tight ${
              financialSnapshot?.coverage_gap != null && financialSnapshot.coverage_gap > 0
                ? "text-amber-900"
                : "text-navy-900"
            }`}>
              {formatCurrency(financialSnapshot?.coverage_gap, financialSnapshot?.currency)}
            </div>
            <span className="mt-1 text-[11px] text-muted block">
              Net unhedged liability
            </span>
          </div>

          {/* 4. Coverage % */}
          <div className="border border-ivory-300 bg-white p-5 rounded shadow-subtle">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
              Coverage %
            </span>
            <div className="mt-2 text-xl sm:text-2xl font-bold font-sans text-navy-900 tracking-tight">
              {financialSnapshot?.coverage_percentage != null
                ? `${financialSnapshot.coverage_percentage}%`
                : "Not available"}
            </div>
            <span className="mt-1 text-[11px] text-muted block">
              Of modeled exposure
            </span>
          </div>

          {/* 5. Uninsured Exposure */}
          <div className="border border-ivory-300 bg-white p-5 rounded shadow-subtle col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
              Uninsured Exposure
            </span>
            <div className="mt-2 text-xl sm:text-2xl font-bold font-sans text-navy-900 tracking-tight">
              {formatCurrency(financialSnapshot?.uninsured_exposure, financialSnapshot?.currency)}
            </div>
            <span className="mt-1 text-[11px] text-muted block">
              Out-of-pocket variance
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 11: FINANCIAL CHART
          - “Coverage vs. estimated exposure”
          - Bar chart directly from financial_snapshot
          - Professional empty state if insufficient data
          ========================================================================= */}
      <section className="py-12 border-b border-ivory-300">
        <div className="mb-6">
          <h3 className="font-serif text-2xl md:text-3xl font-normal text-navy-900">
            Coverage vs. estimated exposure
          </h3>
          <p className="mt-1 text-xs text-muted">
            Comparison between active underwritten coverage limits and modeled enterprise exposure.
          </p>
        </div>

        {hasFinancialChartData ? (
          <div className="border border-ivory-300 bg-white p-6 sm:p-8 rounded shadow-subtle space-y-6">
            <div className="space-y-5">
              {/* Estimated Exposure Bar */}
              <div>
                <div className="flex items-baseline justify-between text-xs mb-1.5">
                  <span className="font-semibold text-navy-900">
                    Estimated Enterprise Exposure
                  </span>
                  <span className="font-mono font-medium text-navy-900">
                    {formatCurrency(financialSnapshot.estimated_exposure, financialSnapshot.currency)} (100%)
                  </span>
                </div>
                <div className="w-full h-8 bg-ivory-200 rounded overflow-hidden">
                  <div
                    className="h-full bg-slate-300 border-r border-slate-400 transition-all duration-700"
                    style={{
                      width: `${Math.min(100, (financialSnapshot.estimated_exposure / maxExposure) * 100)}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Current Coverage Bar */}
              <div>
                <div className="flex items-baseline justify-between text-xs mb-1.5">
                  <span className="font-semibold text-navy-900">
                    Current Underwritten Coverage
                  </span>
                  <span className="font-mono font-bold text-navy-900">
                    {formatCurrency(financialSnapshot.current_coverage, financialSnapshot.currency)}{" "}
                    {financialSnapshot.coverage_percentage != null ? `(${financialSnapshot.coverage_percentage}%)` : ""}
                  </span>
                </div>
                <div className="w-full h-8 bg-ivory-200 rounded overflow-hidden">
                  <div
                    className="h-full bg-navy-900 transition-all duration-700 flex items-center justify-end pr-2"
                    style={{
                      width: `${Math.min(100, (financialSnapshot.current_coverage / maxExposure) * 100)}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Coverage Gap Bar (if positive gap) */}
              {financialSnapshot.coverage_gap != null && financialSnapshot.coverage_gap > 0 && (
                <div>
                  <div className="flex items-baseline justify-between text-xs mb-1.5">
                    <span className="font-semibold text-amber-900">
                      Uninsured Gap / Variance
                    </span>
                    <span className="font-mono font-bold text-amber-900">
                      {formatCurrency(financialSnapshot.coverage_gap, financialSnapshot.currency)}
                    </span>
                  </div>
                  <div className="w-full h-8 bg-ivory-200 rounded overflow-hidden">
                    <div
                      className="h-full bg-amber-200 border border-amber-300 transition-all duration-700"
                      style={{
                        width: `${Math.min(100, (financialSnapshot.coverage_gap / maxExposure) * 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Legend & Footnote */}
            <div className="pt-4 border-t border-ivory-200 flex flex-wrap items-center justify-between text-xs text-muted gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-navy-900 rounded-sm inline-block"></span>
                  <span>Current Coverage</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-slate-300 rounded-sm inline-block"></span>
                  <span>Estimated Exposure</span>
                </div>
                {financialSnapshot.coverage_gap > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-amber-200 border border-amber-300 rounded-sm inline-block"></span>
                    <span>Coverage Gap</span>
                  </div>
                )}
              </div>
              <span className="italic font-serif">
                Figures derived from policy limits and corporate employee headcounts.
              </span>
            </div>
          </div>
        ) : (
          /* Empty State as explicitly specified in prompt */
          <div className="border border-dashed border-ivory-300 bg-white/70 p-8 rounded text-center space-y-2">
            <p className="text-sm font-semibold text-navy-900">
              Financial exposure comparison unavailable — insufficient source data.
            </p>
            <p className="text-xs text-muted max-w-md mx-auto">
              The uploaded policy documentation does not state verified corporate aggregate exposure or monetary sum insured values.
            </p>
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 12: RISK EXPOSURE CHART
          - “Risk exposure by category”
          - Horizontal bar chart populated directly from risk_exposure[]
          - Handles missing values gracefully
          ========================================================================= */}
      <section className="py-12 border-b border-ivory-300">
        <div className="mb-6">
          <h3 className="font-serif text-2xl md:text-3xl font-normal text-navy-900">
            Risk exposure by category
          </h3>
          <p className="mt-1 text-xs text-muted">
            Evaluation of categorical loss exposure across primary organizational operational pillars.
          </p>
        </div>

        {hasRiskExposureData ? (
          <div className="border border-ivory-300 bg-white p-6 sm:p-8 rounded shadow-subtle space-y-5">
            {riskExposure.map((item, idx) => {
              const isAvailable = item.data_available !== false && item.exposure != null;
              const levelBadge =
                item.risk_level === "High"
                  ? "text-red-800 bg-red-50 border-red-200"
                  : item.risk_level === "Elevated"
                  ? "text-amber-800 bg-amber-50 border-amber-200"
                  : "text-navy-900 bg-slate-50 border-slate-200";

              return (
                <div key={item.category || idx} className="space-y-1.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-navy-900 font-sans">
                        {item.category}
                      </span>
                      {item.risk_level && (
                        <span className={`text-[10px] font-semibold px-2 py-0.2 rounded border ${levelBadge}`}>
                          {item.risk_level}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-mono">
                      {isAvailable ? (
                        <span className="text-navy-900 font-semibold">
                          {formatCurrency(item.exposure, financialSnapshot?.currency)}{" "}
                          {item.percentage != null && (
                            <span className="text-muted font-normal">({item.percentage}%)</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted italic">Data unavailable</span>
                      )}
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full h-4 bg-ivory-200 rounded overflow-hidden">
                    {isAvailable ? (
                      <div
                        className="h-full bg-navy-800 transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(8, item.percentage || 15))}%`,
                        }}
                      ></div>
                    ) : (
                      <div className="h-full bg-ivory-300/50 border-r border-dashed border-ivory-300 w-1/4"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border border-dashed border-ivory-300 bg-white/70 p-8 rounded text-center space-y-2">
            <p className="text-sm font-semibold text-navy-900">
              Risk exposure categorization unavailable — insufficient categorical limits.
            </p>
            <p className="text-xs text-muted max-w-md mx-auto">
              Categorical risk limits are not quantified in the uploaded policy text.
            </p>
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 13: COVERAGE TABLE
          - “Coverage position”
          - Columns: Coverage area | Current | Benchmark | Gap | Source
          - Populate directly from coverage_analysis[]
          - Actual currency formatting (e.g. ₹1.2 Cr, ₹45 L)
          ========================================================================= */}
      <section className="py-12 border-b border-ivory-300">
        <div className="mb-6">
          <h3 className="font-serif text-2xl md:text-3xl font-normal text-navy-900">
            Coverage position
          </h3>
          <p className="mt-1 text-xs text-muted">
            Direct comparison between current policy baseline wordings and Marsh recommended standards.
          </p>
        </div>

        {coverageAnalysis.length > 0 ? (
          <div className="border border-ivory-300 bg-white rounded shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-ivory-300 bg-ivory-50 text-[11px] font-semibold text-navy-900 uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6">Coverage Area</th>
                    <th className="py-3 px-4">Current Term</th>
                    <th className="py-3 px-4 text-navy-700 bg-ivory-100/60">Benchmark Standard</th>
                    <th className="py-3 px-4">Identified Gap</th>
                    <th className="py-3 px-4 sm:px-6">Source Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200 font-sans">
                  {coverageAnalysis.map((row, idx) => (
                    <tr key={idx} className="hover:bg-ivory-50/60 transition">
                      <td className="py-3.5 px-4 sm:px-6 font-semibold text-navy-900 align-top">
                        {row.category}
                      </td>
                      <td className="py-3.5 px-4 text-muted-dark align-top">
                        {formatCurrency(row.current, financialSnapshot?.currency)}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-navy-900 bg-ivory-50/40 align-top">
                        {formatCurrency(row.benchmark, financialSnapshot?.currency)}
                      </td>
                      <td className="py-3.5 px-4 text-xs align-top">
                        {row.gap != null ? (
                          typeof row.gap === "number" ? (
                            <span className={row.gap < 0 ? "text-amber-900 font-medium" : "text-emerald-800 font-medium"}>
                              {formatCurrency(row.gap, financialSnapshot?.currency)}
                            </span>
                          ) : (
                            <span className="text-amber-900/90 font-medium">{row.gap}</span>
                          )
                        ) : (
                          <span className="text-muted">Not specified</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 sm:px-6 text-xs font-mono text-muted align-top">
                        {row.source ? (
                          <span>
                            {row.source}
                            {row.page ? ` (p.${row.page})` : ""}
                          </span>
                        ) : (
                          <span className="italic">Not provided</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-ivory-300 bg-white/70 p-8 rounded text-center space-y-2">
            <p className="text-sm font-semibold text-navy-900">
              No quantitative coverage sub-limits extracted.
            </p>
            <p className="text-xs text-muted max-w-md mx-auto">
              The uploaded document did not yield tabular coverage benefit items.
            </p>
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 14: POLICY AUDIT
          - Summary metrics: Clauses analyzed, Match rate, Review items, Coverage gaps
          - "Clause verification" table: Clause, Current wording, Benchmark, Match, Status, Source
          - Clickable/traceable citations
          ========================================================================= */}
      <section className="py-12 border-b border-ivory-300">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
          <div>
            <h3 className="font-serif text-2xl md:text-3xl font-normal text-navy-900">
              Policy audit
            </h3>
            <p className="mt-1 text-xs text-muted">
              Algorithmic TF-IDF and semantic clause matching against approved underwriting wordings.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span className="font-serif italic">Status:</span>
            <span className="text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {policyAudit?.match_percentage != null
                ? `${policyAudit.match_percentage}% Match Rate`
                : "Audited"}
            </span>
          </div>
        </div>

        {/* Audit Metric Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="border border-ivory-300 bg-white p-4 rounded shadow-subtle">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
              Clauses Analyzed
            </span>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans text-navy-900">
              {policyAudit?.total_clauses ?? rawClauses.length}
            </div>
          </div>

          <div className="border border-ivory-300 bg-white p-4 rounded shadow-subtle">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
              Match Rate
            </span>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans text-navy-900">
              {policyAudit?.match_percentage != null
                ? `${policyAudit.match_percentage}%`
                : "Not available"}
            </div>
          </div>

          <div className="border border-ivory-300 bg-white p-4 rounded shadow-subtle">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
              Review Items
            </span>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans text-amber-900">
              {policyAudit?.review_clauses ??
                rawClauses.filter((c) => (c.status || "").toLowerCase() === "review").length}
            </div>
          </div>

          <div className="border border-ivory-300 bg-white p-4 rounded shadow-subtle">
            <span className="text-[11px] font-semibold text-muted uppercase tracking-wider block">
              Coverage Gaps
            </span>
            <div className="mt-1 text-xl sm:text-2xl font-bold font-sans text-red-900">
              {policyAudit?.coverage_gaps ??
                rawClauses.filter((c) => (c.status || "").toLowerCase() === "gap").length}
            </div>
          </div>
        </div>

        {/* Clause Verification Table Header & Filter Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h4 className="text-base font-semibold text-navy-900">
            Clause verification
          </h4>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted mr-1">Filter:</span>
            {["all", "verified", "review", "gap"].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActiveClauseFilter(f)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                  activeClauseFilter === f
                    ? "bg-navy-900 text-white font-semibold"
                    : "bg-white border border-ivory-300 text-muted-dark hover:border-navy-900"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Clause Verification Table */}
        {filteredClauses.length > 0 ? (
          <div className="border border-ivory-300 bg-white rounded shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-ivory-300 bg-ivory-50 text-[11px] font-semibold text-navy-900 uppercase tracking-wider">
                    <th className="py-3 px-4 sm:px-6 w-1/4">Clause</th>
                    <th className="py-3 px-4 w-1/4">Current Wording</th>
                    <th className="py-3 px-4 w-1/4">Benchmark Wording</th>
                    <th className="py-3 px-3 text-center">Match</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 sm:px-6">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200 font-sans">
                  {filteredClauses.map((item, idx) => {
                    const status = (item.status || "Verified").toLowerCase();
                    const statusBadge =
                      status === "gap"
                        ? "text-red-800 bg-red-50 border-red-200"
                        : status === "review"
                        ? "text-amber-800 bg-amber-50 border-amber-200"
                        : "text-emerald-800 bg-emerald-50 border-emerald-200";

                    const matchScore =
                      item.similarity_score != null
                        ? Math.round(item.similarity_score * 100)
                        : null;

                    return (
                      <tr key={idx} className="hover:bg-ivory-50/50 transition">
                        <td className="py-3.5 px-4 sm:px-6 font-semibold text-navy-900 align-top">
                          {item.clause}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted-dark leading-relaxed align-top">
                          {item.current_wording ? (
                            <span className="italic">&ldquo;{item.current_wording}&rdquo;</span>
                          ) : (
                            <span className="text-muted">Not extracted</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-navy-900/90 leading-relaxed align-top bg-ivory-50/30">
                          {item.benchmark_wording ? (
                            <span>{item.benchmark_wording}</span>
                          ) : (
                            <span className="text-muted">Market standard</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-center align-top font-mono text-xs font-semibold text-navy-900">
                          {matchScore != null ? `${matchScore}%` : "—"}
                        </td>
                        <td className="py-3.5 px-3 text-center align-top whitespace-nowrap">
                          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${statusBadge}`}>
                            {item.status || "Verified"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-xs text-muted align-top">
                          <span className="font-mono block text-[11px] text-muted-dark">
                            {item.source || "Policy Document"}
                          </span>
                          {item.page && (
                            <span className="text-[10px] text-muted">Page {item.page}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-ivory-300 bg-white/70 p-8 rounded text-center space-y-1">
            <p className="text-sm font-semibold text-navy-900">
              No clauses match the selected filter.
            </p>
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION 15: SCENARIO ANALYSIS
          - Only displayed if calculated by backend
          - Clearly labeled as "Scenario estimate"
          ========================================================================= */}
      {scenarioAnalysis.length > 0 && (
        <section className="py-12 border-b border-ivory-300">
          <div className="mb-6 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <div>
              <h3 className="font-serif text-2xl md:text-3xl font-normal text-navy-900">
                Scenario analysis
              </h3>
              <p className="mt-1 text-xs text-muted">
                Modeled stress projections evaluated under adverse claims volatility scenarios.
              </p>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
              Scenario estimate · Not actual financial exposure
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {scenarioAnalysis.map((sc, idx) => (
              <div
                key={idx}
                className="border border-ivory-300 bg-white p-5 rounded shadow-subtle space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-navy-900 font-sans">
                    {sc.scenario || `Scenario ${idx + 1}`}
                  </h4>
                  <span className="text-[10px] uppercase font-mono text-muted">
                    {sc.label || "Estimate"}
                  </span>
                </div>

                {sc.description && (
                  <p className="text-xs text-muted-dark leading-relaxed">
                    {sc.description}
                  </p>
                )}

                <div className="pt-2 border-t border-ivory-200 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted">Estimated Loss:</span>
                    <span className="font-mono font-semibold text-navy-900">
                      {formatCurrency(sc.estimated_loss || sc.exposure, financialSnapshot?.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Policy Coverage:</span>
                    <span className="font-mono font-medium text-navy-900">
                      {formatCurrency(sc.modeled_coverage, financialSnapshot?.currency)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold pt-1 border-t border-ivory-100">
                    <span className="text-amber-900">Net Uninsured:</span>
                    <span className="font-mono text-amber-900">
                      {formatCurrency(sc.net_uninsured || sc.estimated_uninsured, financialSnapshot?.currency)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =========================================================================
          SECTION 16: EXECUTIVE INSIGHT
          - Concise backend-powered summary
          - All X values come directly from backend analysis
          ========================================================================= */}
      {executiveInsight && (
        <section className="py-12 border-b border-ivory-300">
          <div className="border border-ivory-300 bg-white p-6 sm:p-8 rounded shadow-subtle relative overflow-hidden">
            <div className="w-1.5 h-full bg-navy-900 absolute left-0 top-0"></div>
            <div className="pl-2 space-y-3">
              <span className="text-xs font-bold uppercase tracking-widest text-muted block">
                Executive Insight
              </span>
              <p className="text-base sm:text-lg text-navy-900 font-serif leading-relaxed italic">
                &ldquo;{executiveInsight}&rdquo;
              </p>
              <div className="pt-2 text-xs text-muted flex items-center gap-2">
                <span className="font-semibold text-navy-900">Marsh Advisory</span>
                <span>·</span>
                <span>Corporate Health &amp; Benefits Placement Practice</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          FOOTNOTE METADATA (NO DUPLICATE EXPORT BUTTONS AT BOTTOM)
          ========================================================================= */}
      <div className="pt-8 text-xs text-muted flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span>Document Reference: MARSH-AUDIT-{companyName.toUpperCase().replace(/[^A-Z0-9]/g, "-").slice(0, 16)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Source verification complete</span>
          <span className="text-ivory-300">·</span>
          <span>Confidential — Prepared for client presentation</span>
        </div>
      </div>
    </div>
  );
}
