"use client";

import { useEffect, useState } from "react";

interface ConfidenceRingProps {
  score: number;
  size?: number;
  animated?: boolean;
}

function scoreColor(score: number): { stroke: string; glow: string; label: string; badge: string } {
  if (score >= 90) return { stroke: "#22C55E", glow: "rgba(34,197,94,0.5)",  label: "High Confidence",     badge: "text-primary border-primary/30 bg-primary/10" };
  if (score >= 70) return { stroke: "#F59E0B", glow: "rgba(245,158,11,0.5)", label: "Moderate Confidence", badge: "text-amber border-amber/30 bg-amber/10" };
  return             { stroke: "#EF4444", glow: "rgba(239,68,68,0.5)",   label: "Low Confidence",      badge: "text-destructive border-destructive/30 bg-destructive/10" };
}

export function ConfidenceRing({ score, size = 160, animated = true }: ConfidenceRingProps) {
  const [displayed, setDisplayed] = useState(animated ? 0 : score);
  const r    = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const cx   = size / 2;
  const { stroke, glow, label, badge } = scoreColor(score);
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
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
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
          fontSize={size * 0.075} fill="#94A3B8"
          style={{ transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cx}px`, fontFamily: "IBM Plex Mono, monospace", letterSpacing: "2px" }}
        >
          SCORE
        </text>
      </svg>
      <span className={`font-mono text-[10px] tracking-[2px] uppercase font-bold px-3 py-1.5 rounded-full border ${badge}`}>
        {label}
      </span>
    </div>
  );
}
