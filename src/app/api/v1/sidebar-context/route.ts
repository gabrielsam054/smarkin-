import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { resolveWorkspaceId } from "@/lib/workspace/resolveWorkspaceId";
import { buildDailyBriefing } from "@/lib/dailyBriefing";
import { CONNECTORS } from "@/lib/connectors";

/**
 * Real data for the AI Consultant sidebar, now shown on every page via
 * AppShell rather than only Mission Control's own custom layout.
 * Reuses buildDailyBriefing() and the exact same CONNECTORS +
 * platform_accounts pattern already proven on both the dashboard page
 * and the Integrations page — not a second, parallel implementation
 * that could quietly show different data than Mission Control itself.
 */
export async function GET() {
  const { user, supabase } = await requireUser("/dashboard");

  const workspaceId = await resolveWorkspaceId(user.id, supabase);
  if (!workspaceId) {
    return NextResponse.json({ recommendation: null, connectors: CONNECTORS.map((c) => ({ key: c.key, displayName: c.displayName, connected: false, available: c.available })) });
  }

  const [briefing, campaignRows, connectedAccountRows] = await Promise.all([
    buildDailyBriefing(supabase, workspaceId),
    supabase.from("campaign_entities").select("id, external_id").eq("kind", "campaign")
      .in("platform_account_id", (await supabase.from("platform_accounts").select("id").eq("workspace_id", workspaceId)).data?.map((a) => a.id) ?? []),
    supabase.from("platform_accounts").select("connector_key, status").eq("workspace_id", workspaceId),
  ]);

  const campaignIdByExternalId = new Map<string, string>((campaignRows.data ?? []).map((c) => [c.external_id, c.id]));
  const top = briefing.topPriorities[0];
  const recommendation = top
    ? { title: top.title, evidence: top.evidence, campaignId: campaignIdByExternalId.get(top.campaignExternalId) ?? null }
    : null;

  const connectedKeys = new Set((connectedAccountRows.data ?? []).filter((a) => a.status === "active").map((a) => a.connector_key));
  const connectors = CONNECTORS.map((c) => ({ key: c.key, displayName: c.displayName, connected: connectedKeys.has(c.key), available: c.available }));

  return NextResponse.json({ recommendation, connectors });
}
