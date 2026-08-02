import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BarChart3, CheckCircle2, XCircle, Clock } from "lucide-react";
import { isCurrentUserAdmin } from "@/lib/admin";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { MetricCard } from "@/components/shared/MetricCard";

interface OutcomeRow {
  id: string;
  outcome: "worked" | "did_not_work" | "too_early_to_tell";
  notes: string | null;
  reported_at: string;
  decision_result_id: string;
}

function OutcomeIcon({ outcome }: { outcome: OutcomeRow["outcome"] }) {
  if (outcome === "worked") return <CheckCircle2 size={14} className="text-primary flex-none" />;
  if (outcome === "did_not_work") return <XCircle size={14} className="text-destructive flex-none" />;
  return <Clock size={14} className="text-text-muted flex-none" />;
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: outcomes }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    supabase.from("decision_outcomes").select("id, outcome, notes, reported_at, decision_result_id")
      .eq("user_id", user.id).order("reported_at", { ascending: false }),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  const rows = (outcomes ?? []) as OutcomeRow[];
  const worked = rows.filter(r => r.outcome === "worked").length;
  const total = rows.length;

  return (
    <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Analytics">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Analytics</h1>
          <p className="text-sm text-text-secondary mt-1">
            Real outcome history from decisions you&apos;ve reported on. Campaign ROI, traffic, revenue,
            and forecasts require the Analytics Engine — not yet registered as a capability, so those
            sections aren&apos;t shown here rather than filled with invented numbers.
          </p>
        </div>

        {total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <MetricCard label="Decisions Reported On" value={total} source="decision_outcomes" icon={BarChart3} />
            <MetricCard label="Reported As Working" value={worked} source="decision_outcomes" icon={CheckCircle2} />
            <MetricCard label="Success Rate" value={`${Math.round((worked / total) * 100)}%`} source={`${worked} of ${total} reported`} icon={CheckCircle2} />
          </div>
        )}

        <div className="card overflow-hidden">
          {rows.length > 0 ? (
            <div className="divide-y divide-border">
              {rows.map(row => (
                <div key={row.id} className="flex items-center gap-4 px-5 py-3.5">
                  <OutcomeIcon outcome={row.outcome} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary capitalize">{row.outcome.replace(/_/g, " ")}</p>
                    {row.notes && <p className="text-xs text-text-muted truncate">{row.notes}</p>}
                  </div>
                  <p className="text-[11px] text-text-muted flex-none">
                    {new Date(row.reported_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BarChart3}
              title="No outcomes reported yet"
              description="Once you mark a decision as worked, didn't work, or too early to tell on its report page, it shows up here — real feedback, not a fabricated metric."
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
