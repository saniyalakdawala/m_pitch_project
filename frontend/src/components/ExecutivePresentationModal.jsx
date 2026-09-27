import React, { useEffect, useState } from "react";

export default function ExecutivePresentationModal({ pitch, auditReport, onClose, initialIndex = 0 }) {
  const [index, setIndex] = useState(initialIndex);
  const slides = pitch?.slides || [];
  const slide = slides[index];

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "ArrowRight" || e.key === "Space") {
        setIndex((i) => Math.min(slides.length - 1, i + 1));
      } else if (e.key === "ArrowLeft") {
        setIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [slides.length, onClose]);

  if (!pitch || !slide) return null;

  const recommendedInsurer = pitch.recommended || slide.comparatorTable?.ranking?.[0]?.insurer;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-marsh-dark/95 backdrop-blur-2xl animate-in fade-in select-none">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-marsh-azure/20 bg-marsh-midnight/90">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-marsh-azure animate-pulse" />
            <span className="font-bold text-sm tracking-widest text-white font-display">
              MARSH MCLENNAN
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <span className="text-xs uppercase tracking-wider text-slate-300 font-medium">
            Executive Placement Deck &bull; <span className="text-marsh-sky">{pitch.companyName}</span>
          </span>
        </div>

        <div className="flex items-center gap-6">
          <span className="text-xs font-mono text-marsh-azure border border-marsh-azure/30 rounded-full px-3.5 py-1 bg-marsh-azure/10">
            Slide {index + 1} of {slides.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-marsh-midnight px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            <span>Exit Theater</span>
            <kbd className="text-[10px] text-slate-400 ml-1">ESC</kbd>
          </button>
        </div>
      </div>

      {/* Main 3D Slide Canvas */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 overflow-y-auto perspective-container">
        <div className="w-full max-w-5xl rounded-3xl border border-marsh-azure/30 bg-gradient-to-br from-marsh-navy via-marsh-midnight to-marsh-dark p-8 md:p-12 shadow-2xl shadow-black relative overflow-hidden min-h-[520px] flex flex-col justify-between transform-gpu">
          {/* Ambient Lighting */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-marsh-azure/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-marsh-cobalt/20 blur-3xl pointer-events-none" />

          {/* Slide Header */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-marsh-azure flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-marsh-azure/20 border border-marsh-azure/40 text-marsh-sky text-xs font-mono">
                  0{index + 1}
                </span>
                Marsh Strategic Advisory
              </span>
              <span className="gold-certified-badge rounded-full px-3 py-0.5 text-xs font-semibold">
                Gold Audit Certified
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight leading-snug">
              {slide.title}
            </h2>
          </div>

          {/* Slide Content Body */}
          <div className="my-8 flex-1 flex flex-col justify-center">
            {slide.comparatorTable ? (
              <div className="space-y-5">
                <div className="overflow-x-auto rounded-2xl border border-marsh-azure/25 bg-marsh-dark/80 shadow-inner">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-marsh-azure/20 bg-marsh-navy">
                        <th className="px-5 py-3.5 font-semibold text-marsh-azure text-xs uppercase tracking-wider">
                          Policy Criterion
                        </th>
                        {slide.comparatorTable.ranking.map((r) => {
                          const isRec = r.insurer === recommendedInsurer;
                          return (
                            <th
                              key={r.insurer}
                              className={`px-5 py-3.5 text-center text-xs uppercase tracking-wider font-bold ${
                                isRec
                                  ? "bg-marsh-azure/25 text-white border-x border-marsh-azure/40"
                                  : "text-slate-300"
                              }`}
                            >
                              <div className="flex items-center justify-center gap-1.5">
                                {isRec && <span className="text-gold-400 font-bold">&#9733;</span>}
                                <span>{r.insurer}</span>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {slide.comparatorTable.rows.map((row, idx) => (
                        <tr
                          key={row.key}
                          className={idx % 2 === 0 ? "bg-marsh-midnight/40" : "bg-marsh-dark/60"}
                        >
                          <td className="px-5 py-3.5 font-medium text-slate-200 text-xs md:text-sm">
                            {row.criterion}
                          </td>
                          {slide.comparatorTable.ranking.map((r) => {
                            const isRec = r.insurer === recommendedInsurer;
                            const cell = row.byInsurer[r.insurer];
                            const found = cell && cell.score > 0.03;
                            return (
                              <td
                                key={r.insurer}
                                className={`px-5 py-3.5 text-center text-xs md:text-sm ${
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

                {recommendedInsurer && (
                  <div className="rounded-2xl border border-marsh-azure/30 bg-gradient-to-r from-marsh-navy via-marsh-cobalt/40 to-marsh-navy p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-marsh-azure/20 text-gold-400 font-bold">
                        &#9733;
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-marsh-azure block">
                          Primary Underwriting Recommendation
                        </span>
                        <span className="text-sm font-semibold text-white">
                          {recommendedInsurer}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 hidden sm:block">
                      Data-driven placement based on client loss profile
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {slide.claims.map((claim, idx) => (
                  <div
                    key={claim.id || idx}
                    className="flex items-start gap-4 rounded-2xl border border-slate-800 bg-marsh-dark/70 p-4 transition hover:border-marsh-azure/40 hover:bg-marsh-navy/40"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-marsh-azure/15 border border-marsh-azure/30 text-marsh-azure text-xs font-bold font-mono">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm md:text-base text-slate-200 leading-relaxed">
                        {claim.text}
                      </p>
                      {claim.sourceInsurer && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-marsh-azure font-mono">
                          <span className="rounded bg-marsh-azure/10 px-2 py-0.5 border border-marsh-azure/20">
                            {claim.sourceInsurer} {claim.sourcePage ? `p.${claim.sourcePage}` : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Slide Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Marsh McLennan Corporate Advisory</span>
            <span>Confidential &bull; Prepared exclusively for {pitch.companyName}</span>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between px-8 py-4 border-t border-marsh-azure/20 bg-marsh-midnight/90">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-marsh-midnight px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-marsh-azure/40 transition disabled:opacity-30 disabled:pointer-events-none"
        >
          <span>&larr; Previous Slide</span>
        </button>

        {/* Indicators */}
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-2.5 rounded-full transition-all ${
                i === index
                  ? "w-8 bg-marsh-azure shadow-[0_0_10px_#00a3e0]"
                  : "w-2.5 bg-slate-700 hover:bg-slate-500"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
          disabled={index === slides.length - 1}
          className="marsh-btn-primary flex items-center gap-2 rounded-xl px-5 py-2 text-xs font-semibold text-white transition disabled:opacity-30 disabled:pointer-events-none"
        >
          <span>Next Slide &rarr;</span>
        </button>
      </div>
    </div>
  );
}
