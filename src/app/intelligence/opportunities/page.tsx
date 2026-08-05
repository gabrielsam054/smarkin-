import Link from "next/link";
import { ListChecks } from "lucide-react";
import { requireUser } from "@/lib/auth/requireUser";
import { isCurrentUserAdmin } from "@/lib/admin";
import { resolveWorkspaceId } from "@/lib/workspace/resolveWorkspaceId";
import { AppShell } from "@/components/layout/AppShell";
import { OpportunityCard } from "@/components/domain/OpportunityCard";
import { DismissButton } from "./DismissButton";

interface OpportunityRow {
  id: string;
  opportunity_type: string;
  title: string;
  evidence: Record<string, number | string>;
  confidence: "low" | "medium" | "high";
  created_at: string;
  related_campaign_external_id: string;
}

const CONFIDENCE_RANK = { high: 0, medium: 1, low: 2 };
const CONFIDENCE_BADGE = {
  high: { label: "high confidence", className: "bg-primary/10 text-primary border-primary/20" },
  medium: { label: "medium confidence", className: "bg-surface-2 text-text-muted border-border" },
  low: { label: "low confidence", className: "bg-surface-2 text-text-muted border-border" },
};

/**
 * The real Opportunities page — now using the shared OpportunityCard
 * (usability audit finding #3), rather than its own independently
 * written rendering that could drift from Campaign Detail's version.
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
    ? await supabase.from("opportunities").select("id, opportunity_type, title, evidence, confidence, created_at, related_campaign_external_id")
        .eq("workspace_id", workspaceId).eq("status", "open")
    : { data: null };

  const opportunities = ((rows ?? []) as unknown as OpportunityRow[])
    .sort((a, b) => CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence] || b.created_at.localeCompare(a.created_at));

  const { data: campaignRows } = workspaceId
    ? await supabase.from("campaign_entities").select("id, external_id").eq("workspace_id", workspaceId)
    : { data: null };
  const campaignIdByExternalId = new Map<string, string>((campaignRows ?? []).map((c) => [c.external_id, c.id]));

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
              const campaignId = campaignIdByExternalId.get(o.related_campaign_external_id);
              return (
                <OpportunityCard
                  key={o.id}
                  data={{ id: o.id, opportunityType: o.opportunity_type, title: o.title, evidence: o.evidence, confidence: o.confidence }}
                  badge={CONFIDENCE_BADGE[o.confidence]}
                  campaignHref={campaignId ? `/campaigns/${campaignId}` : undefined}
                  action={
                    <div onClick={(e) => e.preventDefault()}>
                      <DismissButton opportunityId={o.id} />
                    </div>
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
