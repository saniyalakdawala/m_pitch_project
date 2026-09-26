import React from "react";

// segments: [{ value, color, label }]
export default function DonutChart({ segments, centerLabel, centerValue, size = 160, thickness = 22 }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs = segments
    .filter((seg) => seg.value > 0)
    .map((seg, i) => {
      const fraction = seg.value / total;
      const dash = fraction * circumference;
      const arc = (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={seg.color}
          strokeWidth={thickness}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeDashoffset={-offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          strokeLinecap="butt"
        />
      );
      offset += dash;
      return arc;
    });

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={thickness} />
        {arcs}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-navy-900">{centerValue}</span>
        {centerLabel && <span className="text-[10px] uppercase tracking-wide text-slate-500">{centerLabel}</span>}
      </div>
    </div>
  );
}
