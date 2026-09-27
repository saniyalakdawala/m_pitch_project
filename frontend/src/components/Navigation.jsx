import React from "react";

export default function Navigation({
  isResultsPage = false,
  onNewPitch,
  onLoadSample,
}) {
  return (
    <header className="border-b border-ivory-300 bg-[#F7F5F0]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-12">
        {/* Brand / Logo */}
        <div
          onClick={onNewPitch}
          className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 cursor-pointer group"
          title="Return to analysis generator"
        >
          <div className="flex items-center gap-2">
            <span className="font-sans text-sm font-extrabold tracking-widest text-navy-900 uppercase group-hover:text-navy-600 transition">
              MARSH
            </span>
            <span className="text-ivory-300 font-light">|</span>
            <span className="font-sans text-xs font-semibold tracking-wider text-muted-dark uppercase">
              ADVISORY
            </span>
          </div>
          <span className="text-xs text-muted font-normal hidden sm:inline">
            Executive AI Pitch Suite &amp; Clause Audit
          </span>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {!isResultsPage ? (
            <>
              {/* Status */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                <span className="font-sans">Vector Matcher Active</span>
              </div>

              {/* Sample Deck CTA */}
              {onLoadSample && (
                <button
                  type="button"
                  onClick={onLoadSample}
                  className="rounded border border-ivory-300 bg-white px-3.5 py-1.5 text-xs font-medium text-navy-900 hover:border-navy-900 transition shadow-subtle"
                >
                  Load Sample Deck
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              <span className="font-sans hidden sm:inline">Analysis Synced</span>
              <button
                type="button"
                onClick={onNewPitch}
                className="text-xs font-medium text-navy-900 hover:text-navy-600 underline ml-2"
              >
                &larr; New Analysis
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
