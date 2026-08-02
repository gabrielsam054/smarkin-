import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScrollText, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { isCurrentUserAdmin } from "@/lib/admin";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";

interface AuditLogRow {
  id: string;
  timestamp: string;
  capability: string | null;
  resource: string | null;
  action: string | null;
  result: "success" | "denied" | "error";
  execution_id: string | null;
}

function ResultIcon({ result }: { result: AuditLogRow["result"] }) {
  if (result === "success") return <CheckCircle2 size={14} className="text-primary flex-none" aria-label="Success" />;
  if (result === "denied") return <XCircle size={14} className="text-amber flex-none" aria-label="Denied" />;
  return <AlertTriangle size={14} className="text-destructive flex-none" aria-label="Error" />;
}

export default async function AuditLogsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: entries }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    // RLS on audit_log already scopes this to the requesting user's own
    // entries (migration 017's "Users can view own audit log entries"
    // policy) — the .eq() here is a redundant, explicit second check, same
    // defense-in-depth discipline as the app-level authorization checks
    // built alongside the Security Gateway, not reliance on RLS alone.
    supabase.from("audit_log").select("id, timestamp, capability, resource, action, result, execution_id")
      .eq("user_id", user.id).order("timestamp", { ascending: false }).limit(100),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  const rows = (entries ?? []) as AuditLogRow[];

  return (
    <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Audit Logs">
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Audit Logs</h1>
          <p className="text-sm text-text-secondary mt-1">
            Who did what — every request the Security Gateway processed for your account, real and unfiltered.
          </p>
        </div>

        <div className="card overflow-hidden">
          {rows.length > 0 ? (
            <div className="divide-y divide-border">
              {rows.map(row => (
                <div key={row.id} className="flex items-center gap-4 px-5 py-3.5">
                  <ResultIcon result={row.result} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">
                      <span className="font-medium">{row.action ?? "execute"}</span>
                      {row.capability && <span className="text-text-secondary"> · {row.capability}</span>}
                    </p>
                    <p className="text-xs text-text-muted font-mono truncate">
                      {row.resource ?? "—"}{row.execution_id && ` · ${row.execution_id}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-none">
                    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border ${
                      row.result === "success" ? "text-primary border-primary/30 bg-primary/8"
                        : row.result === "denied" ? "text-amber border-amber/30 bg-amber/8"
                        : "text-destructive border-destructive/30 bg-destructive/8"
                    }`}>{row.result}</span>
                    <p className="text-[11px] text-text-muted">{new Date(row.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={ScrollText}
              title="No audit history yet"
              description="Every request your account makes through a registered capability — Advertising, Customer Research, or any future one — will show up here, including denied or failed attempts."
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
