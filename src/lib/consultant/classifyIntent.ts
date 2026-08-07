import { SupabaseClient } from "@supabase/supabase-js";

export type ConsultantIntent =
  | { type: "campaign_specific"; campaignEntityId: string; campaignName: string }
  | { type: "campaign_diagnosis" } // a real problem question with no named campaign - "why is my ROAS dropping" - genuinely different from account_summary, which surveys everything; this specifically surfaces what's actually struggling
  | { type: "account_summary" }
  | { type: "general_marketing_expertise" }; // Option C: a legitimate marketing question with no real account data behind it ("what pricing strategy should I use") - answered honestly as general expertise, not refused just because it isn't tied to the account. The deterministic router doesn't try to judge "is this really about marketing" - that's a genuine judgment call left to the path's own prompt, which is explicitly instructed to decline honestly if the question turns out to be unrelated to marketing entirely.

const SUMMARY_KEYWORDS = ["today", "overview", "summary", "attention", "how am i doing", "how are things", "opportunities", "what's happening", "whats happening", "focus"];
// Real, disclosed limitation: keyword matching, not sentiment/intent
// classification via AI - the same deterministic-over-guessing choice
// already made for the other two intents. A genuinely unusual phrasing
// of a diagnosis question ("things feel off lately") won't match and
// will honestly fall through to general_marketing_expertise, whose own
// prompt is responsible for the real judgment call of whether to answer
// as general guidance or decline as genuinely unrelated to marketing.
const DIAGNOSIS_KEYWORDS = ["why is", "why are", "why did", "dropping", "declining", "going down", "worse", "underperforming", "not working", "went wrong", "problem"];

/**
 * Real, deterministic routing — not an AI judgment call about where to
 * route, which would risk confidently misrouting a question to the
 * wrong internal engine. Three real intents handled; everything else
 * honestly falls through to out_of_scope rather than guessing.
 *
 * Campaign matching is real substring overlap against actual campaign
 * names in this workspace — not fuzzy AI matching that could match
 * the wrong campaign with false confidence. Checked first since it's
 * the most specific possible match; diagnosis language is checked
 * next (a real problem, no named campaign); generic summary language
 * next; anything left over becomes general_marketing_expertise, per
 * Option C — the default shifts toward attempting a real, honestly-
 * labeled answer rather than declining outright.
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

  if (DIAGNOSIS_KEYWORDS.some((k) => q.includes(k))) {
    return { type: "campaign_diagnosis" };
  }

  if (SUMMARY_KEYWORDS.some((k) => q.includes(k))) {
    return { type: "account_summary" };
  }

  return { type: "general_marketing_expertise" };
}
