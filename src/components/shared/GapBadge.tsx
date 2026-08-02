import { AlertTriangle } from "lucide-react";

/**
 * Renders one real gap string. Never collapsed by default, never hidden —
 * matching the "log the gap, don't fabricate" discipline every backend
 * engine this session was built on. There is no "hide gaps" prop; that
 * would be a UI-level way to fabricate completeness.
 */
export function GapBadge({ gap }: { gap: string }) {
  return (
    <div className="flex items-start gap-2 text-xs text-text-secondary border-l-2 border-amber/40 pl-2.5 py-0.5">
      <AlertTriangle size={12} className="text-amber flex-none mt-0.5" aria-hidden="true" />
      <span>{gap}</span>
    </div>
  );
}

export function GapList({ gaps }: { gaps: string[] }) {
  if (gaps.length === 0) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
        Gaps — nothing here was invented
      </p>
      {gaps.map((g, i) => <GapBadge key={i} gap={g} />)}
    </div>
  );
}
