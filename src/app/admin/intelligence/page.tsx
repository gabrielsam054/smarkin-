import { requireAdmin } from "@/lib/admin";
import { Search, Download, Upload } from "lucide-react";
import smarkinDb from "@/lib/smarkin-db.json";

export const metadata = { title: "AI Intelligence — Control Center" };

export default async function IntelligenceManager({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  await requireAdmin();
  const { tab = "keywords", q } = await searchParams;

  const db = smarkinDb as Record<string, unknown[]>;
  const tableKeys = Object.keys(db);
  const currentData = db[tab] ?? [];
  const filtered = q
    ? currentData.filter((r: unknown) => JSON.stringify(r).toLowerCase().includes(q.toLowerCase()))
    : currentData;

  const TABLE_LABELS: Record<string, string> = {
    keywords: "Keyword Mapping", interests: "Meta Interests", behaviors: "Behaviors",
    personas: "Personas", productProblems: "Pain Points", industries: "Industries",
    benchmarks: "Benchmarks", playbooks: "Playbooks", creativeIntelligence: "Creative Intel",
    marketingPsychology: "Psychology", customerJourney: "Customer Journey",
    knowledgeGraph: "Knowledge Graph",
  };

  const SHOW_TABS = ["keywords","interests","behaviors","personas","productProblems","industries","benchmarks","playbooks"];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">AI Intelligence Manager</h1>
          <p className="text-sm text-text-muted mt-0.5">Marketing Intelligence Engine — {(db["keywords"] as unknown[])?.length ?? 0} keywords · {tableKeys.length} databases</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 text-[12px] border border-border px-3 py-2 rounded-lg hover:bg-surface-2 text-text-secondary transition-all">
            <Upload size={13} /> Import
          </button>
          <button className="flex items-center gap-1.5 text-[12px] border border-border px-3 py-2 rounded-lg hover:bg-surface-2 text-text-secondary transition-all">
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 scrollbar-none">
        {SHOW_TABS.map(t => (
          <a key={t} href={`?tab=${t}${q ? `&q=${q}` : ""}`}
            className={`flex-none px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap ${
              tab === t ? "bg-primary/10 text-primary border border-primary/20" : "text-text-muted hover:text-text-secondary hover:bg-surface-2"
            }`}>
            {TABLE_LABELS[t] ?? t} <span className="text-[10px] opacity-70">({(db[t] ?? []).length})</span>
          </a>
        ))}
      </div>

      {/* Search */}
      <form className="card p-3 mb-4 flex gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input name="q" defaultValue={q} placeholder={`Search ${TABLE_LABELS[tab] ?? tab}…`}
            className="w-full bg-surface-2 border border-border rounded-lg pl-9 pr-4 py-2 text-[13px] placeholder:text-text-muted focus:outline-none focus:border-primary/50" />
        </div>
        <input type="hidden" name="tab" value={tab} />
        <button type="submit" className="bg-primary text-primary-foreground text-[12px] font-semibold px-4 py-2 rounded-lg shadow-green-btn hover:bg-primary-dim">
          Search
        </button>
      </form>

      {/* Data table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-surface-2 flex items-center justify-between">
          <span className="text-[12px] text-text-muted">{filtered.length} records</span>
          <div className="flex gap-2">
            <span className="text-[11px] text-primary font-semibold">Read-only view</span>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-text-muted py-12 text-sm">No records found</p>
          ) : (
            <table className="w-full text-[12px]">
              <thead className="sticky top-0 bg-surface border-b border-border">
                <tr>
                  {Object.keys(filtered[0] as object).slice(0, 6).map(k => (
                    <th key={k} className="text-left px-4 py-2 text-[10px] font-semibold text-text-muted uppercase tracking-wide whitespace-nowrap">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(filtered as Record<string, unknown>[]).slice(0, 50).map((row, i) => (
                  <tr key={i} className="border-b border-border hover:bg-surface-2/50 transition-colors">
                    {Object.values(row).slice(0, 6).map((v, j) => (
                      <td key={j} className="px-4 py-2 text-text-secondary max-w-[200px] truncate">{String(v ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {filtered.length > 50 && (
          <div className="px-4 py-3 border-t border-border text-[11px] text-text-muted">
            Showing first 50 of {filtered.length} records. Use Export to access all data.
          </div>
        )}
      </div>
    </div>
  );
}
