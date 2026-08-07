import { SupabaseClient } from "@supabase/supabase-js";

export type ConsultantIntent =
  | { type: "campaign_specific"; campaignEntityId: string; campaignName: string }
  | { type: "account_summary" }
  | { type: "out_of_scope" };

const SUMMARY_KEYWORDS = ["today", "overview", "summary", "attention", "how am i doing", "how are things", "opportunities", "what's happening", "whats happening", "focus"];

/**
 * Real, deterministic routing — not an AI judgment call about where to
 * route, which would risk confidently misrouting a question to the
 * wrong internal engine. Exactly two real intents handled; everything
 * else honestly falls through to out_of_scope rather than guessing.
 *
 * Campaign matching is real substring overlap against actual campaign
 * names in this workspace — not fuzzy AI matching that could match
 * the wrong campaign with false confidence.
 */
export async function classifyIntent(supabase: SupabaseClient, workspaceId: string, question: string): Promise<ConsultantIntent> {
  const q = question.toLowerCase();

  const { data: campaigns } = await supabase
    .from("campaign_entities")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .eq("kind", "campaign");

  const matched = (campaigns ?? []).find((c) => c.name && q.includes(c.name.toLowerCase()));
  if (matched) {
    return { type: "campaign_specific", campaignEntityId: matched.id, campaignName: matched.name };
  }

  if (SUMMARY_KEYWORDS.some((k) => q.includes(k))) {
    return { type: "account_summary" };
  }

  return { type: "out_of_scope" };
}
