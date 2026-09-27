import React from "react";

export function SkeletonLine({ width = "100%", height = "0.85rem", className = "" }) {
  return (
    <div
      className={`relative overflow-hidden rounded bg-slate-800/80 ${className}`}
      style={{ width, height }}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-gold-500/15 to-transparent" />
    </div>
  );
}

export function SkeletonBlock({ className = "" }) {
  return (
    <div className={`relative overflow-hidden rounded-xl border border-gold-500/20 bg-navy-950/60 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-gold-500/15 to-transparent" />
    </div>
  );
}

export function PitchSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Audit Banner Skeleton */}
      <div className="gold-glass-card rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-full bg-gold-500/20 border border-gold-500/40" />
            <SkeletonLine width="220px" height="1.25rem" />
          </div>
          <SkeletonLine width="120px" height="1.75rem" className="rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonBlock className="h-44 flex items-center justify-center" />
          <div className="md:col-span-2 space-y-4">
            <SkeletonLine width="45%" height="1rem" />
            <SkeletonLine width="90%" height="0.85rem" />
            <SkeletonLine width="75%" height="0.85rem" />
            <div className="grid grid-cols-3 gap-3 pt-2">
              <SkeletonBlock className="h-20" />
              <SkeletonBlock className="h-20" />
              <SkeletonBlock className="h-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Slide Preview Skeleton */}
      <div className="gold-glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-gold-500/15">
          <SkeletonLine width="200px" height="1.25rem" />
          <SkeletonLine width="160px" height="2rem" className="rounded-xl" />
        </div>
        <SkeletonBlock className="h-64" />
      </div>
    </div>
  );
}

