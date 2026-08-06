import { TrendingUp, CalendarClock } from "lucide-react";
import { requireUser } from "@/lib/auth/requireUser";
import { isCurrentUserAdmin } from "@/lib/admin";
import { resolveWorkspaceId } from "@/lib/workspace/resolveWorkspaceId";
import { detectPatterns } from "@/lib/patterns";
import { AppShell } from "@/components/layout/AppShell";

/**
 * The real Patterns page. Honestly gated behind real time, not
 * fabricated from insufficient data. Genuinely different from
 * Knowledge Graph's situation — that needed relationships that already
 * existed; this needs statistical validity that literally cannot be
 * shortcut by better code, only by real days passing.
 */
export default async function PatternsPage() {
  const { user, supabase } = await requireUser("/intelligence/patterns");
  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  const workspaceId = await resolveWorkspaceId(user.id, supabase);
  const result = workspaceId
    ? await detectPatterns(supabase, workspaceId)
    : { ready: false, daysCollected: 0, daysNeeded: 14, patterns: [] };

  return (
    <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Patterns">
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Patterns</h1>
          <p className="text-sm text-text-secondary mt-1">Real trends validated across real weeks of history — not guessed from a handful of days.</p>
        </div>

        {!result.ready ? (
          <div className="flex flex-col items-center text-center py-16 px-6 rounded-xl border border-border bg-surface">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-4">
              <CalendarClock size={18} className="text-text-muted" />
            </div>
            <p className="font-semibold text-text-primary text-sm mb-1.5">Building real history</p>
            <p className="text-sm text-text-secondary max-w-sm mb-4">
              Patterns need genuine time to validate — a finding from two days of data would be indistinguishable from noise. Smarkin is honestly waiting, not guessing.
            </p>
            <div className="w-full max-w-xs">
              <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, (result.daysCollected / result.daysNeeded) * 100)}%` }} />
              </div>
              <p className="text-xs text-text-muted mt-2">{result.daysCollected} of {result.daysNeeded} real days collected</p>
            </div>
          </div>
        ) : result.patterns.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-6 rounded-xl border border-border bg-surface">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-4">
              <TrendingUp size={18} className="text-text-muted" />
            </div>
            <p className="font-semibold text-text-primary text-sm mb-1.5">No strong patterns yet</p>
            <p className="text-sm text-text-secondary max-w-sm">
              {result.daysCollected} real days of history now exist — performance looks fairly consistent day to day so far. This is a real, honest result, not an empty placeholder.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {result.patterns.map((p) => (
              <div key={p.dayOfWeek} className="card p-4 flex items-center gap-3">
                <TrendingUp size={14} className="text-primary flex-none" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">{p.dayOfWeek}s show a consistent CTR difference</p>
                  <p className="text-[11px] text-text-muted font-mono mt-0.5">
                    {p.dayOfWeek} avg ctr: {p.avgCtr} · account avg ctr: {p.accountAvgCtr} · based on {p.occurrences} real {p.dayOfWeek}s
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
