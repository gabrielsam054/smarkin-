"use client";

export type ReportType = "research" | "audience" | "decision";
export type DateRangeFilter = "all" | "7d" | "30d" | "90d";

export interface FilterState {
  types: Set<ReportType>;
  dateRange: DateRangeFilter;
}

const TYPE_LABELS: Record<ReportType, string> = {
  research: "Customer Research",
  audience: "Audience Research",
  decision: "Decisions",
};

const DATE_LABELS: Record<DateRangeFilter, string> = {
  all: "All time", "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days",
};

/**
 * Per UX Spec Phase 3: { types, dateRange, onChange }. Client-side only —
 * per the spec's own Phase 9 decision ("client-side filter first, no
 * backend change needed for v1"), this filters the already-fetched list
 * rather than triggering new queries. A real backend-filtered version is
 * only worth building once list length in practice justifies it.
 */
export function FilterBar({ filters, onChange }: { filters: FilterState; onChange: (f: FilterState) => void }) {
  function toggleType(t: ReportType) {
    const next = new Set(filters.types);
    if (next.has(t)) next.delete(t); else next.add(t);
    onChange({ ...filters, types: next });
  }

  const allSelected = filters.types.size === 0;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <button
        type="button"
        onClick={() => onChange({ ...filters, types: new Set() })}
        aria-pressed={allSelected}
        className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
          allSelected ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-text-secondary hover:text-text-primary"
        }`}
      >
        All
      </button>
      {(Object.keys(TYPE_LABELS) as ReportType[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => toggleType(t)}
          aria-pressed={filters.types.has(t)}
          className={`text-xs font-medium rounded-full px-3 py-1.5 border transition-colors ${
            filters.types.has(t) ? "bg-primary/10 border-primary/30 text-primary" : "border-border text-text-secondary hover:text-text-primary"
          }`}
        >
          {TYPE_LABELS[t]}
        </button>
      ))}

      <div className="flex-1" />

      <label className="sr-only" htmlFor="date-range-filter">Filter by date range</label>
      <select
        id="date-range-filter"
        value={filters.dateRange}
        onChange={(e) => onChange({ ...filters, dateRange: e.target.value as DateRangeFilter })}
        className="text-xs font-medium text-text-secondary bg-surface border border-border rounded-lg px-2.5 py-1.5 hover:border-border-strong transition-colors"
      >
        {(Object.keys(DATE_LABELS) as DateRangeFilter[]).map((d) => (
          <option key={d} value={d}>{DATE_LABELS[d]}</option>
        ))}
      </select>
    </div>
  );
}
