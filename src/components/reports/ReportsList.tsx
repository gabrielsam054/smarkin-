"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Zap, Plus } from "lucide-react";
import { FilterBar, FilterState, ReportType, DateRangeFilter } from "./FilterBar";

export interface ReportEntry {
  key: string;
  href: string;
  title: string;
  typeLabel: string;
  typeColor: string;
  type: ReportType;
  icon: string;
  createdAt: string;
  status: string;
  confidence: number | null;
}

type SortBy = "date" | "confidence";

const RANGE_DAYS: Record<Exclude<DateRangeFilter, "all">, number> = { "7d": 7, "30d": 30, "90d": 90 };

function withinRange(createdAt: string, range: DateRangeFilter): boolean {
  if (range === "all") return true;
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  return days <= RANGE_DAYS[range];
}

function formatRelative(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (diff === 0) return "Today, " + new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  if (diff === 1) return "Yesterday";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Receives the already-fetched, already-archived-filtered entries from
 * the server component (page.tsx) and owns ONLY user-togglable state:
 * type filter, date range, sort. Per UX Spec Phase 9's "client-side
 * filter first" decision — no new query fires when a filter changes.
 */
export function ReportsList({ entries }: { entries: ReportEntry[] }) {
  const [filters, setFilters] = useState<FilterState>({ types: new Set(), dateRange: "all" });
  const [sortBy, setSortBy] = useState<SortBy>("date");

  const visible = useMemo(() => {
    let list = entries;
    if (filters.types.size > 0) list = list.filter((e) => filters.types.has(e.type));
    list = list.filter((e) => withinRange(e.createdAt, filters.dateRange));

    const sorted = [...list];
    if (sortBy === "confidence") {
      sorted.sort((a, b) => (b.confidence ?? -1) - (a.confidence ?? -1));
    } else {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [entries, filters, sortBy]);

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-1">
        <FilterBar filters={filters} onChange={setFilters} />
      </div>
      <div className="flex items-center justify-end gap-2 mb-3">
        <span className="text-[11px] text-text-muted">Sort by</span>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          {(["date", "confidence"] as SortBy[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSortBy(s)}
              aria-pressed={sortBy === s}
              className={`text-[11px] font-medium rounded-md px-2 py-1 capitalize transition-colors ${
                sortBy === s ? "bg-primary/10 text-primary" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {visible.length > 0 ? (
          <div className="divide-y divide-border">
            {visible.map((item) => (
              <Link key={item.key} href={item.href}
                className="flex items-center gap-4 px-5 py-4 hover:bg-surface-2/60 transition-colors group">
                <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center flex-none text-base">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                    {item.title}
                  </p>
                  <p className={`text-[11px] font-medium mt-0.5 ${item.typeColor}`}>{item.typeLabel}</p>
                </div>
                <div className="flex items-center gap-2.5 flex-none">
                  {item.confidence !== null && (
                    <span className="text-[11px] font-mono text-text-muted">{item.confidence}%</span>
                  )}
                  <p className="text-[11px] text-text-muted">{formatRelative(item.createdAt)}</p>
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-none ${
                      item.status === "completed" ? "bg-primary" : item.status === "failed" ? "bg-destructive" : "bg-amber"
                    }`}
                    aria-label={item.status}
                  />
                  <ChevronRight size={13} className="text-text-muted group-hover:text-primary transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        ) : entries.length > 0 ? (
          // Real reports exist but the current filter combination matches
          // none of them — different from the true empty state below,
          // and needs different copy (per UX Spec QA checklist: "not
          // found" vs genuinely-empty are distinguishable states).
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <p className="font-semibold text-text-primary text-sm mb-1">No reports match these filters</p>
            <button
              type="button"
              onClick={() => setFilters({ types: new Set(), dateRange: "all" })}
              className="text-xs font-semibold text-primary hover:underline mt-1"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-14 text-center px-6">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-3">
              <Zap size={18} className="text-text-muted" />
            </div>
            <p className="font-semibold text-text-primary text-sm mb-1">No reports yet</p>
            <p className="text-text-muted text-xs mb-5">Run your first customer research to see it here.</p>
            <Link href="/research/new"
              className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg px-3 py-2 hover:bg-primary-dim transition-colors">
              <Plus size={13} />Start Research
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
