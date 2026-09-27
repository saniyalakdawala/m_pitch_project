import React, { useEffect, useState } from "react";

const STEPS = [
  "Analyzing client profile",
  "Extracting risk signals",
  "Comparing policy clauses",
  "Running clause audit",
  "Building executive recommendations",
];

export default function LoadingScreen({ companyName }) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStepIndex((prev) => {
        if (prev < STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  const progressPercent = Math.min(100, Math.round(((activeStepIndex + 1) / STEPS.length) * 100));

  return (
    <div className="mx-auto max-w-3xl px-6 py-24 md:py-36 text-center">
      {/* Label */}
      <span className="text-xs uppercase tracking-widest text-muted block mb-3 font-medium">
        Marsh McLennan Advisory
      </span>

      {/* Main Heading */}
      <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl font-normal text-navy-900 tracking-tight">
        Preparing your executive pitch
      </h2>

      <p className="mt-4 text-sm text-muted max-w-md mx-auto leading-relaxed">
        Synthesizing corporate underwriting data, market benchmarks, and verifiable clause references for {companyName || "the client"}.
      </p>

      {/* Thin Progress Line */}
      <div className="mt-12 max-w-md mx-auto">
        <div className="h-0.5 w-full bg-ivory-300 overflow-hidden rounded-full">
          <div
            className="h-full bg-navy-900 transition-all duration-700 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Subtle Progress Steps */}
      <div className="mt-12 max-w-sm mx-auto text-left space-y-4">
        {STEPS.map((step, idx) => {
          const isDone = idx < activeStepIndex;
          const isCurrent = idx === activeStepIndex;
          const isPending = idx > activeStepIndex;

          return (
            <React.Fragment key={step}>
              <div
                className={`flex items-center gap-3 transition-opacity duration-300 ${
                  isCurrent
                    ? "opacity-100 text-navy-900 font-semibold"
                    : isDone
                    ? "opacity-80 text-navy-700"
                    : "opacity-35 text-muted"
                }`}
              >
                <span className="text-xs font-mono w-4">
                  {isDone ? "✓" : isCurrent ? "→" : "·"}
                </span>
                <span className="text-sm font-sans">{step}</span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className="pl-2 text-ivory-300 text-xs leading-none">↓</div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
