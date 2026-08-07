import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { resolveWorkspaceId } from "@/lib/workspace/resolveWorkspaceId";
import { runConsultantBrain } from "@/lib/consultant/consultantBrain";

/**
 * Thin HTTP wrapper. All real orchestration — intent routing, context
 * assembly, reasoning, response parsing — lives in consultantBrain.ts,
 * the Consultant Brain Core. This file only handles what's genuinely
 * HTTP-specific: auth, request parsing, and mapping the Brain's
 * structured result onto the right NextResponse.
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

  const result = await runConsultantBrain(supabase, user.id, workspaceId, body.question.trim());

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ...result.response, routedTo: result.routedTo });
}
