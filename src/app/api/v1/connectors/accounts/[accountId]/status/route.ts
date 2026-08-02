import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";

/**
 * Closes the other half of Feature 17's flagged gap: the "Manage"
 * button previously had no onClick handler at all — pausing/resuming a
 * connection was unreachable through any UI action despite the type
 * system and status rendering both supporting it.
 *
 * PATCH, not POST — this updates an existing resource's state, which
 * PATCH is the correct verb for; matches the semantic already used by
 * "connect" (POST, creates something new) vs this (PATCH, mutates).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const { user, supabase } = await requireUser("/integrations");

  const body = await request.json().catch(() => null) as { status?: "active" | "paused" } | null;
  if (!body || (body.status !== "active" && body.status !== "paused")) {
    return NextResponse.json({ error: "status must be 'active' or 'paused'" }, { status: 400 });
  }

  // Ownership check before mutating — never trust the accountId alone;
  // a user could otherwise pause/resume another workspace's connection
  // by guessing or observing an id. connected_by is the closest real
  // ownership signal available today (workspace_id is still the
  // placeholder-correlation noted throughout this connector work,
  // pending real tenancy).
  const { data: account, error: fetchError } = await supabase
    .from("platform_accounts")
    .select("id, status, connected_by")
    .eq("id", accountId)
    .single();

  if (fetchError || !account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (account.connected_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (account.status === "revoked") {
    // A revoked account can't be "resumed" by toggling status — it
    // needs a real reconnect (the OAuth flow), since the stored token
    // is actually invalid, not just administratively paused. Returning
    // a clear, specific error here rather than silently flipping status
    // back to "active" over a token that will just fail the next sync.
    return NextResponse.json({ error: "Revoked connections must be reconnected, not resumed" }, { status: 409 });
  }

  const { error: updateError } = await supabase
    .from("platform_accounts")
    .update({ status: body.status })
    .eq("id", accountId);

  if (updateError) {
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }

  return NextResponse.json({ status: body.status });
}
