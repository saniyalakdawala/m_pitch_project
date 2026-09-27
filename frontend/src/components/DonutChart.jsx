import React from "react";

export default function DonutChart({
  segments,
  centerLabel,
  centerValue,
  size = 175,
  thickness = 22,
}) {
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
          strokeLinecap="round"
          className="transition-all duration-700 ease-out hover:opacity-90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
        />
      );
      offset += dash;
      return arc;
    });

  return (
    <div className="relative inline-flex items-center justify-center p-2 perspective-container">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible transform-gpu transition-transform hover:scale-105"
      >
        <defs>
          <filter id="marshGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* 3D Depth Back Shadow Ring */}
        <circle
          cx={cx}
          cy={cy + 3}
          r={radius}
          fill="none"
          stroke="rgba(0, 0, 0, 0.6)"
          strokeWidth={thickness}
        />

        {/* Outer 3D Precision Coordinate Ring */}
        <circle
          cx={cx}
          cy={cy}
          r={radius + thickness / 2 + 3}
          fill="none"
          stroke="rgba(0, 163, 224, 0.2)"
          strokeWidth={1}
          strokeDasharray="4 4"
        />

        {/* Base dark groove track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#001833"
          strokeWidth={thickness}
        />

        {/* Segment Arcs */}
        {arcs}

        {/* Inner Bevel Border */}
        <circle
          cx={cx}
          cy={cy}
          r={radius - thickness / 2 - 2}
          fill="none"
          stroke="rgba(0, 163, 224, 0.25)"
          strokeWidth={1}
        />
      </svg>

      {/* Center 3D Label & Value */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        <span className="text-3xl font-display font-extrabold tracking-tight text-white drop-shadow-[0_2px_12px_rgba(0,163,224,0.4)]">
          {centerValue}
        </span>
        {centerLabel && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-marsh-azure mt-0.5">
            {centerLabel}
          </span>
        )}
      </div>
    </div>
  );
}
