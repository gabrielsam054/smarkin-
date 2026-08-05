import Link from "next/link";
import { ListChecks, TrendingUp, AlertCircle, TrendingDown, Users, MonitorSmartphone } from "lucide-react";
import { requireUser } from "@/lib/auth/requireUser";
import { isCurrentUserAdmin } from "@/lib/admin";
import { resolveWorkspaceId } from "@/lib/workspace/resolveWorkspaceId";
import { AppShell } from "@/components/layout/AppShell";
import { DismissButton } from "./DismissButton";

interface OpportunityRow {
  id: string;
  opportunity_type: string;
  title: string;
  evidence: Record<string, number | string>;
  confidence: "low" | "medium" | "high";
  created_at: string;
}

const CONFIDENCE_RANK = { high: 0, medium: 1, low: 2 };

const TYPE_ICON: Record<string, typeof TrendingUp> = {
  high_ctr_low_spend: TrendingUp,
  high_spend_low_ctr: TrendingDown,
  zero_recent_activity: AlertCircle,
  audience_segment_outperforming: Users,
  placement_outperforming: MonitorSmartphone,
};

/**
 * The first real Opportunities page — not the reserved lock. Reads
 * from opportunities, populated by detectOpportunities() running right
 * after each real sync. Every item shown here has real evidence
 * (actual numbers, not a fabricated impact estimate) sitting directly
 * in the card, per the discipline established everywhere else in this
 * project: never a claim without the data that produced it.
 */
export default async function OpportunitiesPage() {
  const { user, supabase } = await requireUser("/intelligence/opportunities");
  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  const workspaceId = await resolveWorkspaceId(user.id, supabase);
  const { data: rows } = workspaceId
    ? await supabase.from("opportunities").select("id, opportunity_type, title, evidence, confidence, created_at")
        .eq("workspace_id", workspaceId).eq("status", "open")
    : { data: null };

  const opportunities = ((rows ?? []) as unknown as OpportunityRow[])
    .sort((a, b) => CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence] || b.created_at.localeCompare(a.created_at));

  return (
    <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Opportunities">
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Opportunities</h1>
          <p className="text-sm text-text-secondary mt-1">Real, evidence-backed findings from your connected campaign data.</p>
        </div>

        {opportunities.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-6 rounded-xl border border-border bg-surface">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-4">
              <ListChecks size={18} className="text-text-muted" />
            </div>
            <p className="font-semibold text-text-primary text-sm mb-1.5">Nothing to flag right now</p>
            <p className="text-sm text-text-secondary max-w-sm mb-5">
              Opportunities are computed from your real campaign data after each sync — either everything looks steady, or there isn&apos;t enough connected data yet.
            </p>
            <Link href="/integrations" className="text-sm font-semibold text-primary hover:underline">Manage connections</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {opportunities.map((o) => {
              const Icon = TYPE_ICON[o.opportunity_type] ?? ListChecks;
              return (
                <div key={o.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center flex-none">
                      <Icon size={14} className="text-text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-text-primary">{o.title}</p>
                        <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-full flex-none ${
                          o.confidence === "high" ? "bg-primary/10 text-primary" : "bg-surface-2 text-text-muted border border-border"
                        }`}>
                          {o.confidence} confidence
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted font-mono mt-2">
                        {Object.entries(o.evidence).filter(([k]) => k !== "campaign_name").map(([key, value], i, arr) => (
                          <span key={key}>
                            {key.replace(/_/g, " ")}: {typeof value === "number" ? value.toFixed(2) : String(value)}
                            {i < arr.length - 1 && <span className="text-border-strong mx-1">·</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                    <DismissButton opportunityId={o.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
