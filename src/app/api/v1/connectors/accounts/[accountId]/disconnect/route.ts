import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/requireUser";
import { decryptToken } from "@/lib/crypto/tokenEncryption";

const GRAPH_API_VERSION = "v21.0";

/**
 * The real gap this closes: Pause (Feature 18) only ever toggled
 * status between active/paused — there was never an actual way to
 * disconnect an account at all. This does the complete, correct
 * version: revokes access with Meta itself (best-effort — a failure
 * here doesn't block the local disconnect, since the user's intent to
 * disconnect should still succeed even if Meta's revoke endpoint has
 * an issue), deletes the stored encrypted token entirely (not just
 * marking it unused — an explicit disconnect should mean the
 * credential is actually gone), and marks the account revoked so it
 * stops appearing as active and stops being synced.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await params;
  const { user, supabase } = await requireUser("/integrations");

  // Ownership check before doing anything destructive — never trust
  // the accountId alone.
  const { data: account, error: fetchError } = await supabase
    .from("platform_accounts")
    .select("id, connected_by, connector_key")
    .eq("id", accountId)
    .single();

  if (fetchError || !account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (account.connected_by !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Best-effort revoke with Meta itself — only implemented for the one
  // real connector (matches the established pattern elsewhere in this
  // connector layer: Meta-specific logic lives at the call site until
  // more connectors exist and justify abstracting through the
  // Connector interface).
  if (account.connector_key === "meta_ads") {
    const { data: tokenRow } = await supabase
      .from("oauth_tokens")
      .select("enc_access_token")
      .eq("platform_account_id", accountId)
      .maybeSingle();

    if (tokenRow?.enc_access_token) {
      try {
        const accessToken = decryptToken(Buffer.from(tokenRow.enc_access_token.replace(/^\\x/, ""), "hex"));
        const revokeUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/me/permissions`);
        revokeUrl.searchParams.set("access_token", accessToken);
        const res = await fetch(revokeUrl.toString(), { method: "DELETE" });
        if (!res.ok) {
          // Log and continue — the user's disconnect intent still
          // completes locally even if Meta's side didn't cooperate.
          console.error(`[disconnect] Meta revoke call returned ${res.status} for account ${accountId} — continuing with local disconnect anyway.`);
        }
      } catch (err) {
        console.error(`[disconnect] Meta revoke call failed for account ${accountId}, continuing with local disconnect:`, err);
      }
    }
  }

  // Delete the stored credential entirely — an explicit disconnect
  // should mean the token is actually gone, not just unused.
  await supabase.from("oauth_tokens").delete().eq("platform_account_id", accountId);

  const { error: updateError } = await supabase
    .from("platform_accounts")
    .update({ status: "revoked" })
    .eq("id", accountId);

  if (updateError) {
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  return NextResponse.json({ disconnected: true });
}
