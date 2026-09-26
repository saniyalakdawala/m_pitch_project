import React, { useState } from "react";

const STATUS_DOT = {
  Verified: "bg-emerald-500",
  Flagged: "bg-amber-500",
  Untraceable: "bg-red-500",
  Context: "bg-slate-300",
};

function ClaimRow({ claim, audit }) {
  const status = audit?.status || "Context";
  return (
    <li className="flex items-start gap-3 py-2">
      <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${STATUS_DOT[status]}`} />
      <div className="text-sm text-slate-700">
        <span>{claim.text}</span>
        {claim.sourceInsurer && (
          <span className="ml-2 text-xs italic text-navy-600">
            [{claim.sourceInsurer}
            {claim.sourcePage ? `, p.${claim.sourcePage}` : ""}]
          </span>
        )}
        {claim.type === "policy_claim" && audit?.confidence_score != null && (
          <span className="ml-2 text-xs font-medium text-slate-400">{audit.confidence_score}%</span>
        )}
      </div>
    </li>
  );
}

function ComparatorTable({ comparatorTable }) {
  const insurers = comparatorTable.ranking.map((r) => r.insurer);
  const recommended = comparatorTable.ranking[0]?.insurer;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="bg-navy-900 text-white">
            <th className="px-4 py-2.5 font-medium">Criterion</th>
            {insurers.map((ins) => (
              <th
                key={ins}
                className={`px-4 py-2.5 text-center font-medium ${ins === recommended ? "bg-navy-600" : ""}`}
              >
                {ins}
                {ins === recommended && <span className="ml-1">{"\u2605"}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparatorTable.rows.map((row, i) => (
            <tr key={row.key} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              <td className="px-4 py-2.5 font-medium text-slate-700">{row.criterion}</td>
              {insurers.map((ins) => {
                const cell = row.byInsurer[ins];
                const found = cell.score > 0.03;
                return (
                  <td
                    key={ins}
                    className={`px-4 py-2.5 text-center ${ins === recommended ? "bg-navy-50" : ""} ${
                      found ? "text-slate-700" : "text-slate-400"
                    }`}
                  >
                    {found ? cell.value || "Covered" : "Not found"}
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

export default function PitchPreview({ pitch, auditReport, onExport, exporting }) {
  const [index, setIndex] = useState(0);
  const slides = pitch.slides;
  const slide = slides[index];

  const auditByClaim = {};
  (auditReport?.claims || []).forEach((c) => {
    auditByClaim[c.claimId] = c;
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-panel">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-navy-900">Pitch preview</h2>
          <p className="text-sm text-slate-500">
            {pitch.companyName} &middot; Slide {index + 1} of {slides.length}
          </p>
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-lg border border-navy-600 px-4 py-2 text-sm font-semibold text-navy-600 transition hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exporting ? "Exporting..." : "Download PowerPoint"}
        </button>
      </div>

      <div className="min-h-[22rem] rounded-lg border border-slate-200 bg-slate-25 p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-600 text-xs font-bold text-white">
            {index + 1}
          </span>
          <h3 className="text-lg font-semibold text-navy-900">{slide.title}</h3>
        </div>

        {slide.comparatorTable ? (
          <div className="space-y-4">
            <ComparatorTable comparatorTable={slide.comparatorTable} />
            {pitch.recommended && (
              <div className="rounded-lg bg-navy-900 px-5 py-3 text-white">
                <span className="font-semibold">Recommended: {pitch.recommended}</span>
              </div>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {slide.claims.map((claim) => (
              <ClaimRow key={claim.id} claim={claim} audit={auditByClaim[claim.id]} />
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30"
        >
          &larr; Previous
        </button>
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-2 w-2 rounded-full transition ${i === index ? "bg-navy-600" : "bg-slate-300"}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
          disabled={index === slides.length - 1}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30"
        >
          Next &rarr;
        </button>
      </div>
    </div>
  );
}
