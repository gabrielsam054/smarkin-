/**
 * Urgency rendered as a discrete tick-bar rather than a generic progress
 * ring — five segments, filled by real score/20, echoing lab-instrument
 * readouts rather than a marketing-dashboard gauge. Extracted from
 * research/[id]/page.tsx, generic enough for any 0-100 score, not just
 * pain-point urgency specifically.
 */
export function UrgencyBar({ score }: { score: number }) {
  const filled = Math.round(score / 20);
  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className={`w-3 h-1.5 rounded-sm ${i < filled ? "bg-primary" : "bg-surface-2"}`} />
      ))}
      <span className="text-[10px] font-mono text-text-muted ml-1">{score}</span>
    </div>
  );
}
