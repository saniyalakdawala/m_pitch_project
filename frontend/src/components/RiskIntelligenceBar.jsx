import React from "react";
import Card3D from "./Card3D.jsx";

export default function RiskIntelligenceBar({ companyName, activeStep = 1 }) {
  const steps = [
    { num: 1, label: "Client Intake", detail: "Live Wikipedia & Risk Data" },
    { num: 2, label: "Policy Ingestion", detail: "Multi-Brochure Clause Vectors" },
    { num: 3, label: "Gold Audit", detail: "TF-IDF & Groq Fact-Checking" },
    { num: 4, label: "Board Pitch", detail: "Audited Deck & PowerPoint" },
  ];

  return (
    <div className="space-y-4">
      {/* 3D Workflow Stepper */}
      <Card3D className="p-4 md:p-5 border-marsh-azure/20">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-marsh-azure/20 border border-marsh-azure/40 text-marsh-azure">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-marsh-azure">
                Marsh Placement Architecture
              </span>
              <h3 className="text-sm font-bold text-white">
                Independent Audit &amp; Policy Synthesis Pipeline
              </h3>
            </div>
          </div>

          {/* Stepper nodes */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {steps.map((st) => {
              const isCurrent = activeStep === st.num;
              const isDone = activeStep > st.num;
              return (
                <div
                  key={st.num}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 border transition ${
                    isCurrent
                      ? "border-marsh-azure bg-marsh-azure/15 shadow-[0_0_15px_rgba(0,145,218,0.25)]"
                      : isDone
                      ? "border-emerald-500/40 bg-emerald-950/20 text-emerald-400"
                      : "border-slate-800 bg-marsh-deep/50 text-slate-400"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold font-mono ${
                      isCurrent
                        ? "bg-marsh-azure text-marsh-dark"
                        : isDone
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {isDone ? "\u2713" : st.num}
                  </span>
                  <div className="truncate">
                    <span className={`block text-xs font-semibold ${isCurrent ? "text-white" : ""}`}>
                      {st.label}
                    </span>
                    <span className="block text-[9px] text-slate-400 truncate">{st.detail}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card3D>

      {/* Corporate Risk Intelligence Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-marsh-azure/20 bg-marsh-deep/60 p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>Hospitalization Inflation</span>
            <span className="text-amber-400 font-mono font-bold">+14.2%</span>
          </div>
          <div className="text-lg font-bold font-mono text-white">₹10 Lakh - ₹25 Lakh</div>
          <span className="text-[10px] text-slate-400">Benchmark Sum Insured / Family</span>
        </div>

        <div className="rounded-xl border border-marsh-azure/20 bg-marsh-deep/60 p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>Room Rent Sub-limits</span>
            <span className="text-emerald-400 font-mono font-bold">Priority #1</span>
          </div>
          <div className="text-lg font-bold text-white">0% Deductions</div>
          <span className="text-[10px] text-slate-400">Target: Single Private AC Room</span>
        </div>

        <div className="rounded-xl border border-marsh-azure/20 bg-marsh-deep/60 p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span>Cashless Network Target</span>
            <span className="text-marsh-azure font-mono font-bold">Tier 1 &bull; 2 &bull; 3</span>
          </div>
          <div className="text-lg font-bold font-mono text-white">12,000+ Hospitals</div>
          <span className="text-[10px] text-slate-400">Green Channel pre-auth speed</span>
        </div>

        <div className="rounded-xl border border-gold-500/25 bg-marsh-deep/60 p-3.5 backdrop-blur-md">
          <div className="flex items-center justify-between text-[11px] text-gold-400 mb-1">
            <span>Gold Audit Standard</span>
            <span className="text-gold-300 font-mono font-bold">100% Traced</span>
          </div>
          <div className="text-lg font-bold font-mono gold-foil-text">Zero Untraced</div>
          <span className="text-[10px] text-slate-400">Verbatim clause citations</span>
        </div>
      </div>
    </div>
  );
}
