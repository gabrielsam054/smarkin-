/**
 * Mission-Control-specific skeleton, more accurate than the generic
 * app/loading.tsx fallback (Feature 1) — matches this page's actual
 * hero + 4-tile grid + list shape rather than a generic placeholder.
 */
export function MissionControlSkeleton() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6" role="status" aria-label="Loading Mission Control">
      <div className="h-40 rounded-2xl bg-surface-2 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-surface-2 animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-surface-2 animate-pulse" />
    </div>
  );
}
