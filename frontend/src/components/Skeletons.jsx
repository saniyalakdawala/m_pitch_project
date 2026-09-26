import React from "react";

export function SkeletonLine({ width = "100%", height = "0.85rem", className = "" }) {
  return (
    <div
      className={`animate-pulse rounded bg-slate-200 ${className}`}
      style={{ width, height }}
    />
  );
}

export function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;
}

export function PitchSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-card">
        <SkeletonLine width="40%" height="1.1rem" className="mb-4" />
        <div className="space-y-3">
          <SkeletonLine />
          <SkeletonLine width="90%" />
          <SkeletonLine width="75%" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <SkeletonBlock key={i} className="h-24" />
        ))}
      </div>
      <SkeletonBlock className="h-64" />
    </div>
  );
}
