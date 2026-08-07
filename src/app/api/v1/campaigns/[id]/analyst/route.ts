import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { resolveWorkspaceId } from "@/lib/workspace/resolveWorkspaceId";
import { buildCampaignAnalystContext } from "@/lib/campaignAnalyst/buildContext";
import { ANALYST_SYSTEM_PROMPT, buildAnalystPrompt, AnalystResponse } from "@/lib/campaignAnalyst/prompt";
import { callClaude } from "@/lib/claude";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, supabase } = await requireUser(`/campaigns/${id}`);

  const workspaceId = await resolveWorkspaceId(user.id, supabase);
  if (!workspaceId) {
    return NextResponse.json({ error: "Workspace not set up." }, { status: 400 });
  }

  const body = await request.json().catch(() => null) as { question?: string } | null;
  if (!body?.question || typeof body.question !== "string" || body.question.trim().length === 0) {
    return NextResponse.json({ error: "A question is required." }, { status: 400 });
  }

  // Ownership enforced inside buildCampaignAnalystContext itself (the
  // query is scoped to workspaceId) — returns null rather than another
  // workspace's data if the id doesn't belong to this user.
  const context = await buildCampaignAnalystContext(supabase, user.id, workspaceId, id);
  if (!context) {
    return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
  }

  try {
    const raw = await callClaude({
      system: ANALYST_SYSTEM_PROMPT,
      prompt: buildAnalystPrompt(context, body.question.trim()),
      // Real fix, found via live testing: 1200 tokens genuinely wasn't
      // enough for this response shape (executive answer + evidence +
      // reasoning + multiple recommendations, each with their own
      // evidence + a full limitations array + follow-ups) — confirmed
      // by an actual truncated response cut off mid-JSON in production.
      maxTokens: 2500,
    });

    // Defensive parsing — never trust the model's output blindly, per
    // the established pattern for structured LLM output in this
    // codebase. Strips markdown fences if present, and validates the
    // real shape before returning anything to the client.
    const cleaned = raw.replace(/^```json\s*|```\s*$/g, "").trim();
    let parsed: AnalystResponse;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[campaign-analyst] model returned unparseable JSON:", raw.slice(0, 500));
      // A response that doesn't end with a closing brace was very
      // likely cut off mid-generation (a real, confirmed failure mode
      // found via live testing) rather than a genuinely malformed
      // response — "try rephrasing" is honest advice for the latter,
      // actively misleading for the former, since the question wasn't
      // the problem.
      const likelyTruncated = !cleaned.trim().endsWith("}");
      return NextResponse.json({
        error: likelyTruncated
          ? "The analyst's response was cut off before finishing. Please try again."
          : "The analyst couldn't produce a valid response. Please try rephrasing your question.",
      }, { status: 502 });
    }

    if (!parsed.executiveAnswer || !Array.isArray(parsed.evidence) || !Array.isArray(parsed.recommendations) || !Array.isArray(parsed.limitations)) {
      console.error("[campaign-analyst] model returned wrong shape:", cleaned.slice(0, 500));
      return NextResponse.json({ error: "The analyst's response was malformed. Please try again." }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[campaign-analyst] Claude call failed:", err);
    return NextResponse.json({ error: "The analyst is temporarily unavailable. Please try again shortly." }, { status: 503 });
  }
}
