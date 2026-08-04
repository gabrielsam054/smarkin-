import Link from "next/link";
import { Brain, Sparkles, Users, Network, AlertTriangle, TrendingUp } from "lucide-react";
import { requireUser } from "@/lib/auth/requireUser";
import { isCurrentUserAdmin } from "@/lib/admin";
import { resolveWorkspaceId } from "@/lib/workspace/resolveWorkspaceId";
import { resolveLatestMetrics } from "@/lib/connectors/resolveLatestMetrics";
import { AppShell } from "@/components/layout/AppShell";
import { LinkAccountSelector, ConnectableAccount } from "./LinkAccountSelector";
import type {
  ProductProfile, CustomerProfile, KnowledgeGraphProfile,
} from "@/lib/businessIntelligenceEngine";

interface ProfileRow {
  product_name: string;
  product_profile: ProductProfile;
  customer_profile: CustomerProfile;
  knowledge_graph_profile: KnowledgeGraphProfile;
  gaps: string[] | null;
  linked_platform_account_id: string | null;
}

function formatCurrency(n: number | null): string {
  return n === null ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Extends the real Marketing Brain page with the honest version of
 * "connect what you told us to what your account actually shows us":
 * an explicit, user-confirmed link (LinkAccountSelector + actions.ts),
 * never an inferred/fuzzy match — there's no reliable way to
 * algorithmically know that a Meta campaign named "Q3 Retargeting"
 * belongs to a business researched as "Muscle Builder Supplement."
 */
export default async function MarketingBrainPage() {
  const { user, supabase } = await requireUser("/intelligence/brain");
  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  const { data: rows, error } = await supabase
    .from("business_intelligence_profiles")
    .select("product_name, product_profile, customer_profile, knowledge_graph_profile, gaps, linked_platform_account_id")
    .eq("user_id", user.id);

  if (error) {
    console.error("[marketing-brain] failed to load business_intelligence_profiles:", error.message);
  }

  const profiles = (rows ?? []) as unknown as ProfileRow[];

  // Real connected accounts, for the link selector — resolved once,
  // reused across every unlinked profile below.
  const workspaceId = await resolveWorkspaceId(user.id, supabase);
  const { data: accountRows } = workspaceId
    ? await supabase.from("platform_accounts").select("id, display_name, external_id").eq("workspace_id", workspaceId).eq("status", "active")
    : { data: null };
  const availableAccounts: ConnectableAccount[] = (accountRows ?? []).map((a) => ({
    id: a.id, displayName: a.display_name, externalId: a.external_id,
  }));

  // Real performance data, only for profiles that are actually linked —
  // fetched once per linked account, reusing the exact same
  // latest-metric resolution logic as the Campaigns page.
  const linkedAccountIds = profiles.map((p) => p.linked_platform_account_id).filter((id): id is string => !!id);
  const performanceByAccount = new Map<string, { spend: number | null; impressions: number | null; campaignCount: number }>();
  if (linkedAccountIds.length > 0 && workspaceId) {
    const { data: campaignRows } = await supabase
      .from("campaign_entities").select("id, external_id, name, synced_at, platform_account_id")
      .in("platform_account_id", linkedAccountIds);
    const externalIds = (campaignRows ?? []).map((c) => c.external_id);
    const { data: snapshotRows } = externalIds.length > 0
      ? await supabase.from("metric_snapshots").select("entity_id, metric_key, value, captured_at")
          .eq("workspace_id", workspaceId).in("entity_id", externalIds)
          .gte("captured_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      : { data: null };

    for (const accountId of linkedAccountIds) {
      const accountCampaigns = (campaignRows ?? []).filter((c) => c.platform_account_id === accountId);
      const resolved = resolveLatestMetrics(accountCampaigns, snapshotRows ?? []);
      const totalSpend = resolved.reduce((sum, c) => sum + (c.metrics.spend ?? 0), 0);
      const totalImpressions = resolved.reduce((sum, c) => sum + (c.metrics.impressions ?? 0), 0);
      performanceByAccount.set(accountId, {
        spend: resolved.some((c) => c.metrics.spend !== null) ? totalSpend : null,
        impressions: resolved.some((c) => c.metrics.impressions !== null) ? totalImpressions : null,
        campaignCount: resolved.length,
      });
    }
  }

  return (
    <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Marketing Brain">
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Marketing Brain</h1>
          <p className="text-sm text-text-secondary mt-1">What Smarkin has actually understood about your business, from real research runs.</p>
        </div>

        {profiles.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-6 rounded-xl border border-border bg-surface">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-4">
              <Brain size={18} className="text-text-muted" />
            </div>
            <p className="font-semibold text-text-primary text-sm mb-1.5">Nothing understood yet</p>
            <p className="text-sm text-text-secondary max-w-sm mb-5">
              Smarkin builds its understanding of your business as you run research — nothing reasoned about yet.
            </p>
            <Link href="/research/new" className="text-sm font-semibold text-primary hover:underline">Run Customer Research</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {profiles.map((p) => {
              const linkedAccount = availableAccounts.find((a) => a.id === p.linked_platform_account_id);
              const performance = p.linked_platform_account_id ? performanceByAccount.get(p.linked_platform_account_id) : undefined;

              return (
                <div key={p.product_name} className="card p-5">
                  <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                    <h2 className="text-base font-semibold text-text-primary">{p.product_name}</h2>
                    <div className="flex items-center gap-2">
                      {p.product_profile?.matched && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1">
                          <Sparkles size={11} />
                          {p.product_profile.confidenceWeight}% confidence
                        </span>
                      )}
                      <LinkAccountSelector
                        productName={p.product_name}
                        availableAccounts={availableAccounts.filter((a) => a.id !== p.linked_platform_account_id)}
                        linkedAccountName={linkedAccount ? (linkedAccount.displayName || linkedAccount.externalId) : null}
                      />
                    </div>
                  </div>

                  {/* Real performance, only when a real link exists — never
                      inferred, never shown for an unlinked profile. */}
                  {performance && (
                    <div className="flex items-center gap-5 mb-4 pb-4 border-b border-border">
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <TrendingUp size={12} className="text-primary" />
                        <span className="font-semibold text-text-primary">{performance.campaignCount}</span> campaigns
                      </div>
                      <div className="text-xs text-text-secondary">
                        <span className="font-semibold text-text-primary">{formatCurrency(performance.spend)}</span> spend (7d)
                      </div>
                      <Link href="/campaigns" className="text-xs font-medium text-primary hover:underline ml-auto">View campaigns →</Link>
                    </div>
                  )}

                  {p.product_profile?.matched ? (
                    <div className="grid sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Industry / Category</p>
                        <p className="text-sm text-text-primary">{p.product_profile.industry} · {p.product_profile.category}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Customer Problem</p>
                        <p className="text-sm text-text-primary">{p.product_profile.customerProblem || "—"}</p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs text-text-muted uppercase tracking-wide mb-1">What Smarkin thinks this is</p>
                        <p className="text-sm text-text-secondary">{p.product_profile.functionalDescription || "—"}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted mb-4">No confident product classification found for this business — real gap, not a display placeholder.</p>
                  )}

                  {p.customer_profile?.personas?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Users size={12} />
                        Understood personas ({p.customer_profile.personas.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.customer_profile.personas.slice(0, 5).map((persona, i) => (
                          <span key={i} className="text-xs text-text-secondary bg-surface-2 border border-border rounded-full px-2.5 py-1">
                            {persona.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {p.knowledge_graph_profile?.matched && (
                    <div className="mb-4">
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <Network size={12} />
                        Knowledge graph connections
                      </p>
                      <p className="text-xs text-text-secondary">
                        {p.knowledge_graph_profile.connectedGoals?.length ?? 0} goals · {p.knowledge_graph_profile.connectedPersonas?.length ?? 0} personas · {p.knowledge_graph_profile.connectedPainPoints?.length ?? 0} pain points
                      </p>
                    </div>
                  )}

                  {p.gaps && p.gaps.length > 0 && (
                    <div className="pt-3 border-t border-border">
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <AlertTriangle size={12} className="text-amber" />
                        What Smarkin doesn&apos;t know yet
                      </p>
                      <div className="flex flex-col gap-1">
                        {p.gaps.slice(0, 3).map((gap, i) => (
                          <p key={i} className="text-xs text-text-secondary">{gap}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
