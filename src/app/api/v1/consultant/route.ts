import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { resolveWorkspaceId } from "@/lib/workspace/resolveWorkspaceId";
import { classifyIntent } from "@/lib/consultant/classifyIntent";
import { buildAccountSummaryContext } from "@/lib/consultant/buildAccountSummaryContext";
import { buildDiagnosisContext } from "@/lib/consultant/buildDiagnosisContext";
import {
  ACCOUNT_SUMMARY_SYSTEM_PROMPT, buildAccountSummaryPrompt,
  DIAGNOSIS_SYSTEM_PROMPT, buildDiagnosisPrompt,
  GENERAL_EXPERTISE_SYSTEM_PROMPT, buildGeneralExpertisePrompt,
} from "@/lib/consultant/prompt";
import { buildCampaignAnalystContext } from "@/lib/campaignAnalyst/buildContext";
import { ANALYST_SYSTEM_PROMPT, buildAnalystPrompt } from "@/lib/campaignAnalyst/prompt";
import { callClaude } from "@/lib/claude";

/**
 * The real, Option C version of the account-wide AI Consultant.
 * Smarkin has two distinct forms of intelligence — Business
 * Intelligence (grounded in this account's real data) and Marketing
 * Expertise (general knowledge, honestly labeled as such) — and every
 * response makes clear which one produced which part of the answer.
 * See sharedResponseSchema.ts for the real structural implementation.
 *
 * Four real, deterministically-routed intents. Routing itself never
 * guesses which internal engine to trust — only the fourth path
 * (general_marketing_expertise) lets the model itself judge whether a
 * question is genuinely about marketing, since that's a real judgment
 * call that doesn't benefit from a database lookup the way "which
 * campaign is this" does.
 */
export async function POST(request: NextRequest) {
  const { user, supabase } = await requireUser("/dashboard");

  const workspaceId = await resolveWorkspaceId(user.id, supabase);
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not set up." }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as { question?: string } | null;
  if (!body?.question || typeof body.question !== "string" || body.question.trim().length === 0) {
    return NextResponse.json({ error: "A question is required." }, { status: 400 });
  }
  const question = body.question.trim();

  const intent = await classifyIntent(supabase, workspaceId, question);

  try {
    let raw: string;
    let routedTo: string;

    if (intent.type === "campaign_specific") {
      const context = await buildCampaignAnalystContext(supabase, user.id, workspaceId, intent.campaignEntityId);
      if (!context) {
        return NextResponse.json({ error: "Couldn't find that campaign's data." }, { status: 404 });
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
      // general_marketing_expertise — deliberately no context assembly;
      // there's genuinely no real account data to ground this in. The
      // model itself decides, honestly, whether to answer with real
      // marketing expertise or decline as genuinely unrelated.
      raw = await callClaude({ system: GENERAL_EXPERTISE_SYSTEM_PROMPT, prompt: buildGeneralExpertisePrompt(question), maxTokens: 2500 });
      routedTo = "general marketing expertise";
    }

    const cleaned = raw.replace(/^```json\s*|```\s*$/g, "").trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error(`[consultant] model returned unparseable JSON (length: ${raw.length}):`, raw);
      const likelyTruncated = !cleaned.trim().endsWith("}");
      return NextResponse.json({
        error: likelyTruncated ? "The response was cut off before finishing. Please try again." : "Couldn't produce a valid response. Please try rephrasing.",
      }, { status: 502 });
    }

    return NextResponse.json({ ...(parsed as object), routedTo });
  } catch (err) {
    console.error("[consultant] Claude call failed:", err);
    return NextResponse.json({ error: "The consultant is temporarily unavailable. Please try again shortly." }, { status: 503 });
  }
}
