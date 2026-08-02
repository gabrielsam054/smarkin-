"use client";

import { useEffect, useState } from "react";
import type { ScoreComponent } from "@/lib/strategy";

interface CampaignScoreRingProps {
  score: number;
  components: ScoreComponent[];
}

export function CampaignScoreRing({ score, components }: CampaignScoreRingProps) {
  const [displayed, setDisplayed] = useState(0);
  const size = 160;
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  const fill = circ * (displayed / 100);

  const color = score >= 80 ? "#7C3AED" : score >= 60 ? "#D97706" : "#DC2626";
  const label = score >= 80 ? "Campaign Ready" : score >= 60 ? "Nearly Ready" : "Needs Work";
  const glow  = score >= 80 ? "rgba(124,58,237,0.4)" : score >= 60 ? "rgba(217,119,6,0.4)" : "rgba(220,38,38,0.4)";

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const animate = (now: number) => {
      const t = Math.min((now - start) / 900, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(ease * score));
      if (t < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div className="flex flex-col lg:flex-row items-center gap-8">
      {/* Ring */}
      <div className="flex flex-col items-center gap-3 flex-none">
        <svg width={size} height={size} className="rotate-[-90deg]">
          <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth={10} />
          <circle
            cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={10}
            strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 8px ${glow})`, transition: "stroke-dasharray 0.05s linear" }}
          />
          <text
            x={cx} y={cx - 8} textAnchor="middle" dominantBaseline="middle"
            fontSize={size * 0.24} fontWeight="700" fill={color}
            style={{ transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cx}px`, fontFamily: "Space Grotesk, sans-serif" }}
          >
            {displayed}
          </text>
          <text
            x={cx} y={cx + size * 0.16} textAnchor="middle" dominantBaseline="middle"
            fontSize={size * 0.075} fill="#64748B"
            style={{ transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cx}px`, fontFamily: "IBM Plex Mono, monospace", letterSpacing: "2px" }}
          >
            / 97
          </text>
        </svg>
        <span className="font-mono text-[10px] tracking-[2px] uppercase font-bold px-3 py-1.5 rounded-full border"
          style={{ color, borderColor: color + "50", backgroundColor: color + "15" }}>
          {label}
        </span>
      </div>

      {/* Breakdown bars */}
      <div className="flex-1 w-full space-y-3">
        {components.map((c) => (
          <div key={c.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-text-primary">{c.name}</span>
              <span className="font-mono text-xs font-bold" style={{ color }}>
                {c.score}/{c.maxScore}
              </span>
            </div>
            <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${(c.score / c.maxScore) * 100}%`, background: color }}
              />
            </div>
            <p className="text-[10px] text-text-muted mt-0.5">{c.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
