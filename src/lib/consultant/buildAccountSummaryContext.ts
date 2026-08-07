import { SupabaseClient } from "@supabase/supabase-js";
import { buildDailyBriefing } from "@/lib/dailyBriefing";
import { getPlaybookByName, MarketingPlaybook } from "./marketingPlaybooks";

export interface AccountSummaryContext {
  hasConnectedAccount: boolean;
  totalSpend7d: number | null;
  openOpportunityCount: number;
  criticalCount: number;
  readyToScaleCount: number;
  campaignsImproving: number;
  campaignsDeclining: number;
  topFindings: Array<{ title: string; confidence: string; evidence: Record<string, unknown> }>;
  scalingPlaybook: MarketingPlaybook | null;
}

/**
 * Real account-wide context for the "account_summary" intent —
 * deliberately reuses buildDailyBriefing() rather than writing a
 * second, parallel set of queries that could quietly drift from what
 * Mission Control itself shows. The account summary intent should
 * never tell a user something different from what they'd see by just
 * looking at Mission Control directly.
 */
export async function buildAccountSummaryContext(supabase: SupabaseClient, workspaceId: string): Promise<AccountSummaryContext> {
  const briefing = await buildDailyBriefing(supabase, workspaceId);
  // Only fetched when there's a genuine, real signal to scale — no
  // point loading a playbook that has nothing to attach to.
  const scalingPlaybook = briefing.readyToScaleCount > 0 ? await getPlaybookByName(supabase, "Scale Winning Campaign") : null;
  return {
    hasConnectedAccount: briefing.hasConnectedAccount,
    totalSpend7d: briefing.totalSpend7d,
    openOpportunityCount: briefing.openOpportunityCount,
    criticalCount: briefing.criticalCount,
    readyToScaleCount: briefing.readyToScaleCount,
    campaignsImproving: briefing.campaignsImproving,
    campaignsDeclining: briefing.campaignsDeclining,
    topFindings: briefing.topPriorities.map((p) => ({ title: p.title, confidence: p.confidence, evidence: p.evidence })),
    scalingPlaybook,
  };
}
