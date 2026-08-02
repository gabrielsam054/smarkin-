import { requireAdmin } from "@/lib/admin";
import { buildServiceRoleClient } from "@/lib/supabase/serviceClient";
import { AlertTriangle, AlertCircle } from "lucide-react";

export const metadata = { title: "Operational Errors — Control Center" };

interface OperationalErrorRow {
  id: number;
  level: "warn" | "error";
  message: string;
  category: string | null;
  execution_id: string | null;
  capability: string | null;
  service: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default async function AdminOperationalErrorsPage() {
  await requireAdmin();

  // operational_errors has no per-user RLS policy that would let the
  // normal user-scoped client read it — this page uses the service role,
  // same trust boundary as every other real admin capability, gated by
  // requireAdmin() above, not by RLS on this specific table.
  const client = buildServiceRoleClient();
  let rows: OperationalErrorRow[] = [];
  let queryFailed = false;

  if (client) {
    const { data, error } = await client
      .from("operational_errors")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) queryFailed = true;
    else rows = (data ?? []) as OperationalErrorRow[];
  } else {
    queryFailed = true;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-text-primary">Operational Errors</h1>
        <p className="text-sm text-text-muted mt-0.5">
          Real pipeline, repository, validation, and cache failures — every one logged via the
          same diagnostics layer every capability already uses. No sensitive data is shown here
          beyond what the original structured log already contained.
        </p>
      </div>

      {queryFailed ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/25 flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={24} className="text-destructive" />
          </div>
          <h2 className="text-base font-bold text-text-primary mb-2">Could not load operational errors</h2>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            Either the service role key isn&apos;t configured, or migration 022 hasn&apos;t been run yet.
            Console logging is still working normally regardless of this page.
          </p>
        </div>
      ) : rows.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={24} className="text-primary" />
          </div>
          <h2 className="text-base font-bold text-text-primary mb-2">No operational errors recorded</h2>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            This is either genuinely good news, or the table is new — errors only start
            appearing here from the point this migration was run onward.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y divide-border">
            {rows.map(row => (
              <div key={row.id} className="flex items-start gap-4 px-5 py-4">
                {row.level === "error"
                  ? <AlertCircle size={16} className="text-destructive flex-none mt-0.5" />
                  : <AlertTriangle size={16} className="text-amber flex-none mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">{row.message}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {row.category && <span className="text-[10px] font-mono uppercase text-text-muted bg-surface-2 border border-border rounded-full px-2 py-0.5">{row.category}</span>}
                    {row.capability && <span className="text-[10px] font-mono text-text-muted">{row.capability}</span>}
                    {row.service && <span className="text-[10px] font-mono text-text-muted">· {row.service}</span>}
                  </div>
                </div>
                <p className="text-[11px] text-text-muted flex-none">
                  {new Date(row.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
