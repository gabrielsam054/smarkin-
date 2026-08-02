"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, AlertTriangle } from "lucide-react";

/**
 * Maps directly onto CustomerResearchResult.sources (ResearchSource[]) —
 * { table, rowsUsed } — the exact real shape, no invented fields. This is
 * "no hidden reasoning" made structural: every checkmark corresponds to a
 * real database table this specific run actually queried, not a decorative
 * list of capability names.
 */
export interface Evidence {
  label: string;   // human-readable name for the source (e.g. "Customer Personas")
  table: string;   // the real table/source name, shown for anyone who wants the literal reference
  rowsUsed: number;
  matched: boolean; // false when rowsUsed === 0 — real absence, not hidden
}

/**
 * UI/UX Presentation Sprint redesign: verified sources are visible by
 * default (matching "Verified Sources... 3 verified sources" from the
 * spec) — no longer hidden behind a click. Only the technical, per-table
 * row-count detail and the real gap list move behind "View Technical
 * Details". The gaps themselves are unchanged, real content — the exact
 * same strings every engine already produces — only their visual
 * placement moved, matching "the existing content should remain, but
 * inside an expandable developer section."
 */
export function EvidencePanel({ evidence, gaps = [] }: { evidence: Evidence[]; gaps?: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const verified = evidence.filter(e => e.matched);
  const totalRows = evidence.reduce((sum, e) => sum + e.rowsUsed, 0);

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-4">Evidence</p>

      <div className="flex flex-col gap-2 mb-4">
        {verified.map((e, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-text-primary">
            <CheckCircle2 size={15} className="text-primary flex-none" />
            {e.label}
          </div>
        ))}
      </div>
      <p className="text-xs text-text-muted mb-4">{verified.length} verified source{verified.length === 1 ? "" : "s"}</p>

      <button
        type="button"
        onClick={() => setExpanded((v: boolean) => !v)}
        aria-expanded={expanded}
        className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
      >
        <ChevronDown size={13} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
        View Technical Details
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-border flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            {evidence.map((e, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {e.matched
                    ? <CheckCircle2 size={12} className="text-primary flex-none" />
                    : <span className="w-3 h-3 rounded-full border border-border flex-none" aria-label="Not matched" />}
                  <span className="text-text-secondary">{e.label}</span>
                </div>
                <span className="font-mono text-text-muted">{e.table} · {e.rowsUsed} rows</span>
              </div>
            ))}
            <div className="flex items-center justify-between text-xs text-text-muted border-t border-border pt-2 mt-1">
              <span>Total rows used</span>
              <span className="font-mono">{totalRows}</span>
            </div>
          </div>

          {gaps.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-amber" />
                Nothing here was invented
              </p>
              <div className="flex flex-col gap-1.5">
                {gaps.map((g, i) => (
                  <p key={i} className="text-xs text-text-secondary leading-relaxed">{g}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
