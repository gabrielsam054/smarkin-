/**
 * Next.js App Router convention file — automatically shown during
 * server-rendered navigation. Uses the shared Skeleton primitive
 * (per UX Spec Phase 3: "every loading state uses the shared Skeleton
 * primitive, not a bespoke spinner").
 */
export default function GlobalLoading() {
  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto flex flex-col gap-6" role="status" aria-label="Loading">
      <div className="h-8 w-48 rounded-md bg-surface-2 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-surface-2 animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-surface-2 animate-pulse" />
    </div>
  );
}
