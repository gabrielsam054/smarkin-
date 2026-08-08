import { SupabaseClient } from "@supabase/supabase-js";
import { classifyIntent } from "./classifyIntent";
import { buildAccountSummaryContext } from "./buildAccountSummaryContext";
import { buildDiagnosisContext } from "./buildDiagnosisContext";
import {
  ACCOUNT_SUMMARY_SYSTEM_PROMPT, buildAccountSummaryPrompt,
  DIAGNOSIS_SYSTEM_PROMPT, buildDiagnosisPrompt,
  GENERAL_EXPERTISE_SYSTEM_PROMPT, buildGeneralExpertisePrompt,
} from "./prompt";
import { buildCampaignAnalystContext } from "@/lib/campaignAnalyst/buildContext";
import { ANALYST_SYSTEM_PROMPT, buildAnalystPrompt } from "@/lib/campaignAnalyst/prompt";
import { persistCampaignRecommendation } from "./persistCampaignRecommendation";
import { findFrameworkMentionedIn } from "./marketingFrameworks";
import { callClaude } from "@/lib/claude";

export type ConsultantBrainResult =
  | { ok: true; response: object; routedTo: string }
  | { ok: false; status: 404 | 502 | 503; error: string };

/**
 * The Consultant Brain Core — the internal orchestration layer
 * responsible for: receiving the request, determining what context is
 * required, gathering that context, passing it to the consultant for
 * reasoning, and returning structured output. Not exposed to users
 * directly; route.ts is now a thin HTTP wrapper around this.
 *
 * This is a pure extraction, not a rewrite — every branch, every
 * error case, every status code below is identical to what previously
 * lived inline in route.ts. No behavior changed; only named,
 * independently-testable structure was added, per the Phase 1
 * "connect, don't rebuild" instruction.
 */
export async function runConsultantBrain(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  question: string,
): Promise<ConsultantBrainResult> {
  const intent = await classifyIntent(supabase, workspaceId, question);

  try {
    let raw: string;
    let routedTo: string;

    if (intent.type === "campaign_specific") {
      const context = await buildCampaignAnalystContext(supabase, userId, workspaceId, intent.campaignEntityId);
      if (!context) {
        return { ok: false, status: 404, error: "Couldn't find that campaign's data." };
      }
      raw = await callClaude({ system: ANALYST_SYSTEM_PROMPT, prompt: buildAnalystPrompt(context, question), maxTokens: 2500 });
      routedTo = intent.campaignName;
    } else if (intent.type === "campaign_diagnosis") {
      const context = await buildDiagnosisContext(supabase, workspaceId);
      raw = await callClaude({ system: DIAGNOSIS_SYSTEM_PROMPT, prompt: buildDiagnosisPrompt(context, question), maxTokens: 2500 });
      routedTo = "campaign diagnosis";
    } else if (intent.type === "account_summary") {
      const context = await buildAccountSummaryContext(supabase, workspaceId);
      raw = await callClaude({ system: ACCOUNT_SUMMARY_SYSTEM_PROMPT, prompt: buildAccountSummaryPrompt(context, question), maxTokens: 2500 });
      routedTo = "account summary";
    } else {
      const framework = await findFrameworkMentionedIn(supabase, question);
      raw = await callClaude({ system: GENERAL_EXPERTISE_SYSTEM_PROMPT, prompt: buildGeneralExpertisePrompt(question, framework), maxTokens: 2500 });
      routedTo = "general marketing expertise";
    }

    const cleaned = raw.replace(/^```json\s*|```\s*$/g, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error(`[consultantBrain] model returned unparseable JSON (length: ${raw.length}):`, raw);
      const likelyTruncated = !cleaned.trim().endsWith("}");
      return {
        ok: false, status: 502,
        error: likelyTruncated ? "The response was cut off before finishing. Please try again." : "Couldn't produce a valid response. Please try rephrasing.",
      };
    }

    // Real Learning gap closed here too — the second real entry point
    // for campaign-specific responses. Only persists for
    // campaign_specific, since the other three intents aren't tied to
    // one specific campaign the same way.
    let recommendationId: string | null = null;
    if (intent.type === "campaign_specific") {
      const typedParsed = parsed as { recommendations?: unknown };
      recommendationId = await persistCampaignRecommendation(
        supabase, userId, intent.campaignEntityId, question, typedParsed.recommendations ?? [], "sidebar consultant",
      );
    }

    return { ok: true, response: { ...(parsed as object), recommendationId }, routedTo };
  } catch (err) {
    console.error("[consultantBrain] Claude call failed:", err);
    return { ok: false, status: 503, error: "The consultant is temporarily unavailable. Please try again shortly." };
  }
}
