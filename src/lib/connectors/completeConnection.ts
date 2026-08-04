import type { SupabaseClient } from "@supabase/supabase-js";
import { encryptToken } from "@/lib/crypto/tokenEncryption";
import type { OAuthTokenSet } from "@/lib/connectors/types";

export interface AccountToConnect { externalId: string; displayName: string }

export type CompleteConnectionResult =
  | { ok: true; connectorKey: string; platformAccountId: string; syncJobId: number }
  | { ok: false; errorCode: "backend_not_ready" | "token_store_failed" | "connected_but_sync_not_queued" };

/**
 * Extracted from the OAuth callback's original single-account path so
 * the new multi-account selection flow (built when Meta returned more
 * than one ad account — the exact "real, upcoming work" gap flagged
 * when this limitation was first built) can reuse the identical,
 * already-verified logic rather than a second, drifting copy of it.
 * Every comment below on WHY each step matters is preserved from the
 * original — this is a real extraction, not a rewrite.
 */
export async function completeConnection(params: {
  supabase: SupabaseClient;
  workspaceId: string;
  connectorKey: string;
  userId: string;
  account: AccountToConnect;
  tokens: OAuthTokenSet;
}): Promise<CompleteConnectionResult> {
  const { supabase, workspaceId, connectorKey, userId, account, tokens } = params;

  const encAccessToken = encryptToken(tokens.accessToken);
  const encRefreshToken = tokens.refreshToken ? encryptToken(tokens.refreshToken) : null;

  // Upsert on the real unique constraint — same row, same id on a
  // reconnect, so oauth_tokens' existing reference stays valid rather
  // than erroring or duplicating.
  const { data: upsertedAccount, error: accountError } = await supabase
    .from("platform_accounts")
    .upsert({
      workspace_id: workspaceId,
      connector_key: connectorKey,
      external_account_id: account.externalId,
      display_name: account.displayName,
      status: "active",
      connected_by: userId,
      connected_at: new Date().toISOString(),
    }, { onConflict: "workspace_id,connector_key,external_account_id" })
    .select("id")
    .single();

  if (accountError || !upsertedAccount) {
    console.error("[completeConnection] platform_accounts upsert failed:", accountError?.message ?? "no row returned", accountError?.details ?? "", accountError?.hint ?? "");
    return { ok: false, errorCode: "backend_not_ready" };
  }

  const { error: tokenError } = await supabase.from("oauth_tokens").upsert({
    platform_account_id: upsertedAccount.id,
    enc_access_token: encAccessToken,
    enc_refresh_token: encRefreshToken,
    key_version: 1,
    expires_at: tokens.expiresAt,
    scopes: tokens.scopes,
  }, { onConflict: "platform_account_id" });

  if (tokenError) {
    console.error("[completeConnection] oauth_tokens upsert failed:", tokenError.message, tokenError.details ?? "", tokenError.hint ?? "");
    return { ok: false, errorCode: "token_store_failed" };
  }

  // Fresh circuit on every (re)connect — an account shouldn't inherit
  // failure history from before it was reconnected.
  await supabase.from("connector_health").upsert({
    platform_account_id: upsertedAccount.id,
    state: "closed",
    fail_count: 0,
    last_ok_at: null,
    last_error: null,
    opened_at: null,
  }, { onConflict: "platform_account_id" }).then(({ error }) => {
    if (error) console.error(`[completeConnection] failed to reset connector_health for ${upsertedAccount.id}:`, error.message);
  });

  const { data: insertedJob, error: jobError } = await supabase.from("sync_jobs").insert({
    platform_account_id: upsertedAccount.id,
    job_class: "backfill",
    status: "queued",
  }).select("id").single();

  if (jobError || !insertedJob) {
    console.error(`[completeConnection] sync_jobs insert failed for platform_account ${upsertedAccount.id}:`, jobError?.message ?? "no row returned", jobError?.details ?? "", jobError?.hint ?? "");
    return { ok: false, errorCode: "connected_but_sync_not_queued" };
  }

  return { ok: true, connectorKey, platformAccountId: upsertedAccount.id, syncJobId: insertedJob.id };
}
