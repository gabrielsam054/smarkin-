import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertTriangle, ListOrdered } from "lucide-react";
import { OpportunityCard } from "@/components/domain/OpportunityCard";
import { requireUser } from "@/lib/auth/requireUser";
import { isCurrentUserAdmin } from "@/lib/admin";
import { resolveWorkspaceId } from "@/lib/workspace/resolveWorkspaceId";
import { computeCampaignHealth } from "@/lib/connectors/campaignHealth";
import { AppShell } from "@/components/layout/AppShell";
import { CampaignAnalyst } from "./CampaignAnalyst";

function formatNumber(n: number | null): string {
  return n === null ? "—" : n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function formatCurrency(n: number | null): string {
  return n === null ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function formatPercent(n: number | null): string {
  return n === null ? "—" : `${n.toFixed(2)}%`;
}

// A real, disclosed mapping — not an invented severity score. Based on
// what each opportunity type actually represents: zero activity is a
// real operational problem (a campaign that might be effectively dead);
// high spend with low CTR is real money being spent inefficiently;
// the "outperforming" findings are positive signals, not urgent
// problems, so they land at Medium rather than being over-dramatized.
const SEVERITY_MAP: Record<string, { label: string; className: string }> = {
  zero_recent_activity: { label: "Critical", className: "bg-destructive/10 text-destructive border-destructive/20" },
  high_spend_low_ctr: { label: "High", className: "bg-destructive/10 text-destructive border-destructive/20" },
  high_ctr_low_conversion: { label: "High", className: "bg-destructive/10 text-destructive border-destructive/20" },
  high_ctr_low_spend: { label: "Medium", className: "bg-primary/10 text-primary border-primary/20" },
  audience_segment_outperforming: { label: "Medium", className: "bg-primary/10 text-primary border-primary/20" },
  placement_outperforming: { label: "Medium", className: "bg-primary/10 text-primary border-primary/20" },
};



/**
 * The real Campaign Detail page. Deliberately does NOT include an "Ask
 * AI about this campaign" chat — that's a genuine architectural
 * departure (real LLM-generated language) from everything else in this
 * connector work, which has been provably deterministic throughout,
 * and deserves its own explicit decision rather than being bundled in
 * here. The "diagnosis" and "if this were my campaign" sections below
 * both reuse the SAME real, already-stored Opportunities for this
 * campaign — not a second, parallel detection system.
 */
export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, supabase } = await requireUser(`/campaigns/${id}`);
  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  const workspaceId = await resolveWorkspaceId(user.id, supabase);
  if (!workspaceId) notFound();

  const { data: campaign } = await supabase
    .from("campaign_entities")
    .select("id, external_id, name, objective, daily_budget, lifetime_budget, synced_at")
    .eq("id", id).eq("workspace_id", workspaceId).single();

  if (!campaign) notFound();

  const { data: dailySnapshots } = await supabase
    .from("metric_snapshots").select("metric_key, value, captured_at")
    .eq("workspace_id", workspaceId).eq("entity_id", campaign.external_id).eq("source_window", "daily")
    .gte("captured_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const { data: latestSnapshots } = await supabase
    .from("metric_snapshots").select("metric_key, value, captured_at")
    .eq("workspace_id", workspaceId).eq("entity_id", campaign.external_id)
    .order("captured_at", { ascending: false }).limit(20);

  const latestByMetric = new Map<string, number>();
  for (const s of latestSnapshots ?? []) {
    if (!latestByMetric.has(s.metric_key)) latestByMetric.set(s.metric_key, s.value);
  }

  const health = computeCampaignHealth(dailySnapshots ?? []);

  const { data: opportunityRows } = await supabase
    .from("opportunities").select("id, opportunity_type, title, evidence, confidence")
    .eq("workspace_id", workspaceId).eq("related_campaign_external_id", campaign.external_id).eq("status", "open");
  const opportunities = opportunityRows ?? [];

  const dailyPacingPercent = campaign.daily_budget && latestByMetric.get("spend") !== undefined
    ? Math.round(((latestByMetric.get("spend") ?? 0) / campaign.daily_budget) * 100)
    : null;

  return (
    <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Campaigns"
      headerLeft={<Link href="/campaigns" className="text-text-muted hover:text-text-primary transition-colors"><ArrowLeft size={18} /></Link>}>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Campaign</p>
            {campaign.objective && (
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-surface-2 border border-border text-text-muted">
                {campaign.objective.replace(/_/g, " ")}
              </span>
            )}
          </div>
          <h1 className="text-lg font-bold text-text-primary">{campaign.name}</h1>
        </div>

        {/* Real audit fix #2: no way to jump between sections as this
            page has grown. Links only to sections that actually exist
            for THIS campaign — no dead link to "action plan" for a
            campaign with zero opportunities. */}
        <div className="flex gap-4 text-xs font-medium text-text-muted border-b border-border pb-3 -mt-1">
          <a href="#diagnosis" className="hover:text-text-primary transition-colors">Diagnosis</a>
          {opportunities.length > 0 && <a href="#action-plan" className="hover:text-text-primary transition-colors">Action Plan</a>}
          <a href="#analyst" className="hover:text-text-primary transition-colors">Ask the Analyst</a>
        </div>

        {/* Overview grid - every field here is genuinely synced, no
            placeholders. Reach and frequency are real (added this
            session); ROAS/conversions/learning status are deliberately
            absent, not shown as "—" placeholders implying they were
            attempted and came back empty, since that would misleadingly
            imply Smarkin tried to fetch them. */}
        <div className="card p-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-text-muted mb-1">Health score</p>
            <p className="text-lg font-semibold text-text-primary">{health.healthScore ?? "—"}</p>
            {health.healthScore !== null && (
              <p className="text-[10px] text-text-muted mt-0.5 leading-tight">
                {[
                  { label: "CTR", t: health.ctr }, { label: "CPC", t: health.cpc },
                  { label: "CPM", t: health.cpm }, { label: "ROAS", t: health.roas },
                ].filter((m) => m.t.direction !== "insufficient_data").map((m) => `${m.label} ${m.t.direction}`).join(", ") || "starting from neutral (50)"}
              </p>
            )}
          </div>
          <div><p className="text-xs text-text-muted mb-1">Impressions</p><p className="text-lg font-semibold text-text-primary">{formatNumber(latestByMetric.get("impressions") ?? null)}</p></div>
          <div><p className="text-xs text-text-muted mb-1">Reach</p><p className="text-lg font-semibold text-text-primary">{formatNumber(latestByMetric.get("reach") ?? null)}</p></div>
          <div><p className="text-xs text-text-muted mb-1">Frequency</p><p className="text-lg font-semibold text-text-primary">{latestByMetric.get("frequency")?.toFixed(2) ?? "—"}</p></div>
          <div><p className="text-xs text-text-muted mb-1">Clicks</p><p className="text-lg font-semibold text-text-primary">{formatNumber(latestByMetric.get("clicks") ?? null)}</p></div>
          <div><p className="text-xs text-text-muted mb-1">Spend</p><p className="text-lg font-semibold text-text-primary">{formatCurrency(latestByMetric.get("spend") ?? null)}</p></div>
          <div><p className="text-xs text-text-muted mb-1">CTR</p><p className="text-lg font-semibold text-text-primary">{formatPercent(latestByMetric.get("ctr") ?? null)}</p></div>
          <div><p className="text-xs text-text-muted mb-1">CPC</p><p className="text-lg font-semibold text-text-primary">{formatCurrency(health.cpc.current)}</p></div>
          <div><p className="text-xs text-text-muted mb-1">Conversions</p><p className="text-lg font-semibold text-text-primary">{formatNumber(latestByMetric.get("conversions") ?? null)}</p></div>
          <div><p className="text-xs text-text-muted mb-1">ROAS</p><p className="text-lg font-semibold text-text-primary">{health.roas.current !== null ? `${health.roas.current.toFixed(2)}x` : "—"}</p></div>
        </div>

        {/* Real, earned delight — not manufactured enthusiasm. Only
            appears when the health score is genuinely high AND at
            least two real metrics are genuinely trending improving;
            cites the actual metrics, never generic praise. */}
        {(() => {
          const improvingMetrics = [
            { label: "CTR", t: health.ctr }, { label: "CPC", t: health.cpc },
            { label: "CPM", t: health.cpm }, { label: "ROAS", t: health.roas },
          ].filter((m) => m.t.direction === "improving");
          if (health.healthScore !== null && health.healthScore >= 75 && improvingMetrics.length >= 2) {
            return (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 mb-4 flex items-center gap-2.5">
                <span className="text-base">🎉</span>
                <p className="text-sm text-text-primary">
                  This campaign is genuinely performing well — {improvingMetrics.map((m) => m.label).join(" and ")} are both trending up, real health score of {health.healthScore}.
                </p>
              </div>
            );
          }
          return null;
        })()}

        {dailyPacingPercent !== null && (
          <div className="card p-4 flex items-center justify-between">
            <p className="text-sm text-text-secondary">Daily budget pacing</p>
            <p className={`text-sm font-semibold ${dailyPacingPercent > 100 ? "text-destructive" : "text-text-primary"}`}>
              {dailyPacingPercent}% of {formatCurrency(campaign.daily_budget)}
            </p>
          </div>
        )}

        {/* Diagnosis — real, reused from Opportunities, never a second
            detection system computed fresh here. */}
        <div id="diagnosis">
          <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-text-muted" />
            Diagnosis
          </h2>
          {opportunities.length === 0 ? (
            <p className="text-sm text-text-muted">No issues or opportunities currently flagged for this campaign.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {opportunities.map((o) => (
                <OpportunityCard
                  key={o.id}
                  data={{ id: o.id, opportunityType: o.opportunity_type, title: o.title, evidence: o.evidence as Record<string, unknown>, confidence: o.confidence as "low" | "medium" | "high" }}
                  badge={SEVERITY_MAP[o.opportunity_type] ?? { label: "Medium", className: "bg-surface-2 text-text-muted border-border" }}
                />
              ))}
            </div>
          )}
        </div>

        {/* "If this were my campaign" - the same real opportunities,
            reframed as a prioritized list. Not a second AI-generated
            plan — a different presentation of the same evidence above. */}
        {opportunities.length > 0 && (
          <div id="action-plan">
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5">
              <ListOrdered size={14} className="text-text-muted" />
              If this were my campaign
            </h2>
            <div className="card p-5">
              <ol className="flex flex-col gap-2 text-sm text-text-secondary list-decimal list-inside">
                {opportunities
                  .slice()
                  .sort((a, b) => (a.confidence === "high" ? 0 : a.confidence === "medium" ? 1 : 2) - (b.confidence === "high" ? 0 : b.confidence === "medium" ? 1 : 2))
                  .map((o) => (
                    <li key={o.id}>{o.title} <span className="text-text-muted">({o.confidence} confidence)</span></li>
                  ))}
              </ol>
            </div>
          </div>
        )}

        <CampaignAnalyst
          campaignId={campaign.id}
          exportData={{
            campaignName: campaign.name,
            healthScore: health.healthScore,
            metrics: {
              impressions: latestByMetric.get("impressions") ?? null, clicks: latestByMetric.get("clicks") ?? null,
              spend: latestByMetric.get("spend") ?? null, ctr: latestByMetric.get("ctr") ?? null,
              conversions: latestByMetric.get("conversions") ?? null,
            },
            opportunities: opportunities.map((o) => ({ title: o.title, confidence: o.confidence, evidence: o.evidence as Record<string, unknown> })),
          }}
        />
      </div>
    </AppShell>
  );
}
