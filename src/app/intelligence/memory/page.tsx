import Link from "next/link";
import { BookOpen, CheckCircle2, XCircle, Clock } from "lucide-react";
import { requireUser } from "@/lib/auth/requireUser";
import { isCurrentUserAdmin } from "@/lib/admin";
import { AppShell } from "@/components/layout/AppShell";

interface OutcomeRow { decision_result_id: string; outcome: string; notes: string | null }
interface ResultContext { id: string; recommended_channel: string | null; primary_recommendation: unknown; request_id: string }
interface RequestContext { id: string; industry: string | null; product_name: string | null }

const OUTCOME_DISPLAY: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  worked: { label: "Worked", icon: CheckCircle2, className: "text-primary bg-primary/10 border-primary/20" },
  did_not_work: { label: "Didn't work", icon: XCircle, className: "text-destructive bg-destructive/10 border-destructive/20" },
  too_early_to_tell: { label: "Too early to tell", icon: Clock, className: "text-text-muted bg-surface-2 border-border" },
};

/**
 * The real Memory page — built on decision_outcomes, genuine
 * pre-existing infrastructure (its own comment calls it "Learning
 * Engine — first real capability") that predates this session. Only
 * the four columns directly confirmed from the real insert code are
 * used here (decision_result_id, user_id, outcome, notes) — deliberately
 * not assuming a created_at column exists, after two real "column
 * doesn't exist" surprises this session from unconfirmed pre-existing
 * schemas. Two plain, separate queries rather than an embedded
 * PostgREST join, matching the more robust pattern already proven
 * necessary in metaSync.ts this same session.
 *
 * Honest scope note: this is real, but narrower than "Memory" as
 * originally envisioned (winning campaigns/audiences/creative) — that
 * would need infrastructure that doesn't exist. What's real today is
 * "decisions you've reported outcomes on," stated plainly rather than
 * oversold.
 */
export default async function MemoryPage() {
  const { user, supabase } = await requireUser("/intelligence/memory");
  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  const { data: outcomeRows, error: outcomeError } = await supabase
    .from("decision_outcomes")
    .select("decision_result_id, outcome, notes")
    .eq("user_id", user.id);

  if (outcomeError) {
    console.error("[memory] failed to load decision_outcomes:", outcomeError.message);
  }
  const outcomes = (outcomeRows ?? []) as OutcomeRow[];

  const resultIds = outcomes.map((o) => o.decision_result_id);
  const { data: resultRows } = resultIds.length > 0
    ? await supabase.from("decision_results").select("id, recommended_channel, primary_recommendation, request_id").in("id", resultIds)
    : { data: null };
  const results = (resultRows ?? []) as unknown as ResultContext[];

  const requestIds = results.map((r) => r.request_id);
  const { data: requestRows } = requestIds.length > 0
    ? await supabase.from("decision_requests").select("id, industry, product_name").in("id", requestIds)
    : { data: null };
  const requests = (requestRows ?? []) as unknown as RequestContext[];

  const enriched = outcomes.map((o) => {
    const result = results.find((r) => r.id === o.decision_result_id);
    const request = result ? requests.find((r) => r.id === result.request_id) : undefined;
    return { ...o, result, request };
  });

  return (
    <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Memory">
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Memory</h1>
          <p className="text-sm text-text-secondary mt-1">Decisions you&apos;ve reported real outcomes on.</p>
        </div>

        {enriched.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-6 rounded-xl border border-border bg-surface">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-4">
              <BookOpen size={18} className="text-text-muted" />
            </div>
            <p className="font-semibold text-text-primary text-sm mb-1.5">Memory is built from outcomes, not predictions</p>
            <p className="text-sm text-text-secondary max-w-sm mb-5">
              Nothing confirmed yet — report whether a recommendation worked on any decision to start building real memory.
            </p>
            <Link href="/reports" className="text-sm font-semibold text-primary hover:underline">View your decisions</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {enriched.map((e) => {
              const display = OUTCOME_DISPLAY[e.outcome] ?? OUTCOME_DISPLAY.too_early_to_tell;
              const Icon = display.icon;
              const content = (
                <>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-sm font-semibold text-text-primary">
                      {e.request?.product_name || e.request?.industry || "Untitled decision"}
                    </p>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium border rounded-full px-2 py-0.5 flex-none ${display.className}`}>
                      <Icon size={11} />
                      {display.label}
                    </span>
                  </div>
                  {e.result?.recommended_channel && (
                    <p className="text-xs text-text-muted mb-1">Recommended: {e.result.recommended_channel}</p>
                  )}
                  {e.notes && <p className="text-xs text-text-secondary mt-2 border-t border-border pt-2">{e.notes}</p>}
                </>
              );
              return e.result?.request_id ? (
                <Link key={e.decision_result_id} href={`/decision/${e.result.request_id}`} className="card p-4 block hover:border-border-strong transition-colors">{content}</Link>
              ) : (
                <div key={e.decision_result_id} className="card p-4">{content}</div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
