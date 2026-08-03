import Link from "next/link";
import { Megaphone, Clock } from "lucide-react";
import { requireUser } from "@/lib/auth/requireUser";
import { isCurrentUserAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveWorkspaceId } from "@/lib/workspace/resolveWorkspaceId";
import { resolveLatestMetrics } from "@/lib/connectors/resolveLatestMetrics";
import { AppShell } from "@/components/layout/AppShell";

function formatNumber(n: number | null): string {
  return n === null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function formatCurrency(n: number | null): string {
  return n === null ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatPercent(n: number | null): string {
  return n === null ? "—" : `${n.toFixed(2)}%`;
}

/**
 * The real page — reads from campaign_entities + metric_snapshots,
 * both genuinely written by the sync worker now that campaign names
 * are actually captured (metaSync.ts fix, same feature). Distinct from
 * every other RESERVED page: this isn't waiting on unbuilt code, it's
 * waiting on the next scheduled sync for a genuinely connected
 * account — a different, more specific honest state.
 */
export default async function CampaignsPage() {
  const { user } = await requireUser("/campaigns");
  const supabase = await createClient();
  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  const workspaceId = await resolveWorkspaceId(user.id, supabase);

  const { data: hasConnection } = workspaceId
    ? await supabase.from("platform_accounts").select("id").eq("workspace_id", workspaceId).eq("status", "active").limit(1).maybeSingle()
    : { data: null };

  const { data: campaignRows } = workspaceId
    ? await supabase.from("campaign_entities").select("id, external_id, name, synced_at").eq("workspace_id", workspaceId).eq("kind", "campaign")
    : { data: null };

  const externalIds = (campaignRows ?? []).map((c) => c.external_id);
  const { data: snapshotRows } = externalIds.length > 0
    ? await supabase.from("metric_snapshots").select("entity_id, metric_key, value, captured_at")
        .eq("workspace_id", workspaceId!).in("entity_id", externalIds)
        .gte("captured_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    : { data: null };

  const campaigns = resolveLatestMetrics(campaignRows ?? [], snapshotRows ?? []);

  return (
    <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Campaigns">
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Campaigns</h1>
          <p className="text-sm text-text-secondary mt-1">Real campaign performance from your connected platforms.</p>
        </div>

        {!hasConnection ? (
          <div className="flex flex-col items-center text-center py-16 px-6 rounded-xl border border-border bg-surface">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-4">
              <Megaphone size={18} className="text-text-muted" />
            </div>
            <p className="font-semibold text-text-primary text-sm mb-1.5">No platform connected yet</p>
            <p className="text-sm text-text-secondary max-w-sm mb-5">Connect Meta Ads to see real campaign performance here.</p>
            <Link href="/integrations" className="text-sm font-semibold text-primary hover:underline">Go to Integrations</Link>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-6 rounded-xl border border-border bg-surface">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
              <Clock size={18} className="text-primary" />
            </div>
            <p className="font-semibold text-text-primary text-sm mb-1.5">Connected — first sync hasn&apos;t run yet</p>
            <p className="text-sm text-text-secondary max-w-sm">
              Your account is connected. Campaign data syncs automatically once a day — check back after the next sync.
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="divide-y divide-border">
              {campaigns.map((c) => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center flex-none">
                    <Megaphone size={15} className="text-text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{c.name}</p>
                    <p className="text-[11px] text-text-muted font-mono">{c.externalId}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-6 flex-none text-right">
                    <div>
                      <p className="text-xs text-text-muted">Impressions</p>
                      <p className="text-sm font-semibold text-text-primary">{formatNumber(c.metrics.impressions)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Clicks</p>
                      <p className="text-sm font-semibold text-text-primary">{formatNumber(c.metrics.clicks)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">Spend</p>
                      <p className="text-sm font-semibold text-text-primary">{formatCurrency(c.metrics.spend)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted">CTR</p>
                      <p className="text-sm font-semibold text-text-primary">{formatPercent(c.metrics.ctr)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
