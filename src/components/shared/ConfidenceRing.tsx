"use client";

import { useEffect, useState } from "react";
import { confidenceTier, CONFIDENCE_COLORS, confidenceLabel } from "@/lib/confidence";

interface ConfidenceRingProps {
  score: number;
  size?: number;
  animated?: boolean;
}

// Previously had its own thresholds here (>=90 High, >=70 Moderate, else
// Low) — different from ConfidenceBadge's (>=75/>=45/else), meaning the
// same score could show two different labels in two different places at
// once. Now reads from the single shared model in lib/confidence.ts.
// Real, deliberate behavior change: a score of 70-89 now shows "High"
// here, where it previously showed "Moderate" — this component's
// thresholds were the ones that moved, not ConfidenceBadge's.
function scoreColor(score: number) {
  const tier = confidenceTier(score);
  return { ...CONFIDENCE_COLORS[tier], label: confidenceLabel(score) };
}

export function ConfidenceRing({ score, size = 160, animated = true }: ConfidenceRingProps) {
  const [displayed, setDisplayed] = useState(animated ? 0 : score);
  const r    = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const cx   = size / 2;
  const { stroke, glow, label, badgeClass } = scoreColor(score);
  const fill = circ * (displayed / 100);

  useEffect(() => {
    if (!animated) return;
    let frame: number;
    const start = performance.now();
    const duration = 900;
    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(ease * score));
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score, animated]);

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth={10} />
        <circle
          cx={cx} cy={cx} r={r} fill="none" stroke={stroke} strokeWidth={10}
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${glow})`, transition: "stroke-dasharray 0.05s linear" }}
        />
        <text
          x={cx} y={cx - 8} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.24} fontWeight="700" fill={stroke}
          style={{ transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cx}px`, fontFamily: "Space Grotesk, sans-serif" }}
        >
          {displayed}%
        </text>
        <text
          x={cx} y={cx + size * 0.16} textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.075} fill="#64748B"
          style={{ transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cx}px`, fontFamily: "IBM Plex Mono, monospace", letterSpacing: "2px" }}
        >
          SCORE
        </text>
      </svg>
      <span className={`font-mono text-[10px] tracking-[2px] uppercase font-bold px-3 py-1.5 rounded-full border ${badgeClass}`}>
        {label}
      </span>
    </div>
  );
}
