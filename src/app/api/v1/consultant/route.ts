import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { resolveWorkspaceId } from "@/lib/workspace/resolveWorkspaceId";
import { classifyIntent } from "@/lib/consultant/classifyIntent";
import { buildAccountSummaryContext } from "@/lib/consultant/buildAccountSummaryContext";
import { ACCOUNT_SUMMARY_SYSTEM_PROMPT, buildAccountSummaryPrompt } from "@/lib/consultant/prompt";
import { buildCampaignAnalystContext } from "@/lib/campaignAnalyst/buildContext";
import { ANALYST_SYSTEM_PROMPT, buildAnalystPrompt } from "@/lib/campaignAnalyst/prompt";
import { callClaude } from "@/lib/claude";

/**
 * The real, first version of the account-wide AI Consultant. Per the
 * explicit architectural decision to route natural-language questions
 * to the right internal engine automatically — but scoped honestly to
 * what can actually be routed reliably today. Two real intents,
 * handled deterministically, not by an AI guess at where to route.
 * Everything else declines honestly, naming what it can actually help
 * with, rather than fabricating an answer no engine here actually
 * supports (e.g., "should I sell in Ghana or Nigeria" has no real
 * engine behind it yet — this correctly says so).
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

  if (intent.type === "out_of_scope") {
    // Real, honest decline — no AI call at all, since there's nothing
    // real to ground an answer in for whatever this question actually
    // asked. Names what genuinely does exist rather than a vague apology.
    return NextResponse.json({
      outOfScope: true,
      message: "I can currently help with two things: questions about a specific campaign (mention its name), or a summary of what needs attention across your account today. For anything else, this capability doesn't exist yet — check Marketing Brain, Opportunities, or Decisions directly for now.",
    });
  }

  try {
    let raw: string;
    if (intent.type === "campaign_specific") {
      const context = await buildCampaignAnalystContext(supabase, user.id, workspaceId, intent.campaignEntityId);
      if (!context) {
        return NextResponse.json({ error: "Couldn't find that campaign's data." }, { status: 404 });
      }
      raw = await callClaude({ system: ANALYST_SYSTEM_PROMPT, prompt: buildAnalystPrompt(context, question), maxTokens: 2500 });
    } else {
      const context = await buildAccountSummaryContext(supabase, workspaceId);
      raw = await callClaude({ system: ACCOUNT_SUMMARY_SYSTEM_PROMPT, prompt: buildAccountSummaryPrompt(context, question), maxTokens: 2500 });
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

    return NextResponse.json({ ...(parsed as object), routedTo: intent.type === "campaign_specific" ? intent.campaignName : "account summary" });
  } catch (err) {
    console.error("[consultant] Claude call failed:", err);
    return NextResponse.json({ error: "The consultant is temporarily unavailable. Please try again shortly." }, { status: 503 });
  }
}
