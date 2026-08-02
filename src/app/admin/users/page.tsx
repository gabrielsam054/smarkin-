import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { Search, Download, MoreHorizontal, Ban, RefreshCw } from "lucide-react";

export const metadata = { title: "Users — Control Center" };

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ q?: string; plan?: string; page?: string }> }) {
  await requireAdmin();
  const supabase = await createClient();
  const { q, plan, page } = await searchParams;
  const pageNum = parseInt(page ?? "1");
  const pageSize = 20;

  let query = supabase.from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((pageNum - 1) * pageSize, pageNum * pageSize - 1);

  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  if (plan) query = query.eq("plan", plan);

  let users: Record<string, string>[] = [];
  let count = 0;
  try {
    const res = await query;
    users = (res.data ?? []) as Record<string, string>[];
    count = res.count ?? 0;
  } catch { users = []; count = 0; }

  const formatDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  const PLAN_COLORS: Record<string, string> = {
    free:    "text-text-muted bg-surface-2 border-border",
    starter: "text-secondary bg-secondary/10 border-secondary/25",
    pro:     "text-primary bg-primary/10 border-primary/25",
    agency:  "text-amber bg-amber/10 border-amber/25",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Users</h1>
          <p className="text-sm text-text-muted mt-0.5">{count ?? 0} total users</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-[12px] text-text-secondary border border-border px-3 py-2 rounded-lg hover:bg-surface-2 transition-all">
            <Download size={13} /> Export
          </button>
        </div>
      </div>

      {/* s */}
      <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
        <form className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input name="q" defaultValue={q} placeholder="Search by name or email…"
              className="w-full bg-surface-2 border border-border rounded-lg pl-9 pr-4 py-2 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50" />
          </div>
          <select name="plan" defaultValue={plan ?? ""}
            className="bg-surface-2 border border-border rounded-lg px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:border-primary/50">
            <option value="">All plans</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
            <option value="agency">Agency</option>
          </select>
          <button type="submit" className="bg-primary text-primary-foreground text-[12px] font-semibold px-4 py-2 rounded-lg shadow-green-btn hover:bg-primary-dim">
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              {["User", "Plan", "Credits", "Campaigns", "Joined", "Status", ""].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(users ?? []).length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-text-muted text-sm">No users found</td></tr>
            ) : (users ?? []).map((u: Record<string, string>) => (
              <tr key={u.id} className="border-b border-border hover:bg-surface-2/50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[12px] font-bold text-primary flex-none">
                      {(u.full_name || u.email || "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[13px] font-medium text-text-primary">{u.full_name || "—"}</p>
                      <p className="text-[11px] text-text-muted">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${PLAN_COLORS[u.plan] ?? PLAN_COLORS.free}`}>
                    {u.plan ?? "free"}
                  </span>
                </td>
                <td className="px-4 py-3 text-[13px] text-text-secondary">{u.credits_remaining ?? 0}</td>
                <td className="px-4 py-3 text-[13px] text-text-secondary">—</td>
                <td className="px-4 py-3 text-[12px] text-text-muted">{formatDate(u.created_at)}</td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-semibold text-primary">Active</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 rounded-md hover:bg-surface-3 text-text-muted hover:text-primary transition-colors" title="Reset usage">
                      <RefreshCw size={12} />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-surface-3 text-text-muted hover:text-destructive transition-colors" title="Suspend">
                      <Ban size={12} />
                    </button>
                    <button className="p-1.5 rounded-md hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors" title="More">
                      <MoreHorizontal size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        {(count ?? 0) > pageSize && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-[12px] text-text-muted">
              Showing {((pageNum-1)*pageSize)+1}–{Math.min(pageNum*pageSize, count ?? 0)} of {count ?? 0}
            </p>
            <div className="flex gap-2">
              {pageNum > 1 && (
                <a href={`?${new URLSearchParams({ ...(q ? {q} : {}), ...(plan ? {plan} : {}), page: String(pageNum-1) })}`}
                  className="text-[12px] text-primary hover:underline">← Prev</a>
              )}
              {pageNum * pageSize < (count ?? 0) && (
                <a href={`?${new URLSearchParams({ ...(q ? {q} : {}), ...(plan ? {plan} : {}), page: String(pageNum+1) })}`}
                  className="text-[12px] text-primary hover:underline">Next →</a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
