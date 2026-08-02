import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { getConnector } from "@/lib/connectors/types";
import { bootstrapConnectors } from "@/lib/connectors/bootstrap";
import { encryptToken } from "@/lib/crypto/tokenEncryption";
import { buildServiceRoleClient } from "@/lib/supabase/serviceClient";
import { resolveWorkspaceId } from "@/lib/workspace/resolveWorkspaceId";

bootstrapConnectors();

const STATE_COOKIE = "smarkin_oauth_state";

/**
 * Single shared callback for every connector (matches how OAuth apps
 * typically register one static redirect_uri) — the connector key comes
 * out of the verified state, not the URL, so it can't be spoofed by
 * editing the query string.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");

  const integrationsUrl = new URL("/integrations", request.nextUrl.origin);

  if (oauthError) {
    // User denied the platform's consent dialog — a real, expected
    // outcome, not an error condition to alarm over.
    integrationsUrl.searchParams.set("connect_error", "denied");
    return NextResponse.redirect(integrationsUrl);
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE); // single-use, regardless of outcome below

  // CSRF check — this is the check that matters most in this whole
  // route. A mismatch here means the callback wasn't the direct result
  // of an authorization request this server issued; refusing to
  // proceed is not optional.
  if (!code || !returnedState || !storedState || returnedState !== storedState) {
    integrationsUrl.searchParams.set("connect_error", "invalid_state");
    return NextResponse.redirect(integrationsUrl);
  }

  const [connectorKey] = returnedState.split(".");
  const connector = getConnector(connectorKey);
  if (!connector) {
    integrationsUrl.searchParams.set("connect_error", "unknown_connector");
    return NextResponse.redirect(integrationsUrl);
  }

  const { user } = await requireUser("/integrations");

  // The real bug this fix closes: platform_accounts/oauth_tokens/
  // sync_jobs/connector_health are all deliberately service-role-only
  // writes by RLS design (documented in the v16 catalog itself) —
  // requireUser()'s client is scoped to the user's own session and
  // respects RLS, so it was ALWAYS going to be blocked from writing to
  // any of these tables, regardless of whether the tables existed. The
  // "table doesn't exist" error masked this until the migration ran;
  // this is what was underneath it. requireUser() still does the real
  // auth check (confirms who's connecting) — only the actual writes
  // below move to the service-role client, which these tables require.
  const supabase = buildServiceRoleClient();
  if (!supabase) {
    console.error("[oauth callback] buildServiceRoleClient() returned null — service-role credentials are not configured.");
    return NextResponse.redirect(new URL("/integrations?connect_error=backend_not_ready", request.nextUrl.origin));
  }

  try {
    const redirectUri = `${request.nextUrl.origin}/api/v1/connectors/callback`;
    const tokens = await connector.exchangeCodeForTokens({ code, redirectUri });

    // The actual root cause of the recurring backend_not_ready error:
    // platform_accounts.workspace_id has a real foreign key to
    // workspaces(id), and every write here was using user.id as a
    // stand-in — which was always going to be rejected by that
    // constraint once real data could be checked against it. Resolved
    // properly now, with a distinct, honest error if the user
    // genuinely has no workspace yet (a real, different situation from
    // "the backend isn't ready" — this tells them what's actually true).
    const workspaceId = await resolveWorkspaceId(user.id, supabase);
    if (!workspaceId) {
      integrationsUrl.searchParams.set("connect_error", "no_workspace");
      return NextResponse.redirect(integrationsUrl);
    }

    // Resolve the real account before writing anything — "pending" was
    // a placeholder from the first pass of this flow; a platform_account
    // row with a fake external_account_id is worse than not creating one
    // yet, since every downstream sync depends on that id being real.
    const accounts = await connector.listAvailableAccounts(tokens.accessToken);
    if (accounts.length === 0) {
      integrationsUrl.searchParams.set("connect_error", "no_accounts_found");
      return NextResponse.redirect(integrationsUrl);
    }
    if (accounts.length > 1) {
      // Honest limitation, not a silent wrong choice: picking the first
      // account automatically when several exist could connect an
      // account the user didn't intend, which is worse than asking
      // again. Account-selection UI is real, separate follow-up work,
      // not built in this feature.
      integrationsUrl.searchParams.set("connect_error", "multiple_accounts_unsupported");
      return NextResponse.redirect(integrationsUrl);
    }
    const account = accounts[0];

    const encAccessToken = encryptToken(tokens.accessToken);
    const encRefreshToken = tokens.refreshToken ? encryptToken(tokens.refreshToken) : null;

    // Closes the reconnect gap flagged at the end of Feature 17: a plain
    // insert() would violate platform_accounts' real unique constraint
    // (workspace_id, connector_key, external_account_id) the moment a
    // user reconnects an already-existing account — exactly the
    // scenario Feature 17's revoked-detection creates, since detecting
    // "revoked" is only useful if reconnecting afterward actually works.
    // Upsert on that same constraint: same row, same id (Postgres
    // upsert never changes the primary key), so oauth_tokens' existing
    // reference stays valid — this updates the row in place rather than
    // creating a duplicate or erroring.
    const { data: upsertedAccount, error: accountError } = await supabase
      .from("platform_accounts")
      .upsert({
        workspace_id: workspaceId, // the actual fix — was user.id, rejected by the real FK constraint
        connector_key: connectorKey,
        external_account_id: account.externalId,
        display_name: account.displayName,
        status: "active", // explicitly reset — this is the fix for a previously-revoked account reconnecting
        connected_by: user.id,
        connected_at: new Date().toISOString(),
      }, { onConflict: "workspace_id,connector_key,external_account_id" })
      .select("id")
      .single();

    if (accountError || !upsertedAccount) {
      integrationsUrl.searchParams.set("connect_error", "backend_not_ready");
      return NextResponse.redirect(integrationsUrl);
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
      integrationsUrl.searchParams.set("connect_error", "token_store_failed");
      return NextResponse.redirect(integrationsUrl);
    }

    // Reset health state on reconnect — without this, a reconnected
    // account would inherit its OLD fail_count/open-circuit state from
    // before the revoke, sitting in a cooldown despite the connection
    // now being genuinely healthy again. A fresh connection deserves a
    // fresh circuit, not the previous connection's failure history.
    await supabase.from("connector_health").upsert({
      platform_account_id: upsertedAccount.id,
      state: "closed",
      fail_count: 0,
      last_ok_at: null,
      last_error: null,
      opened_at: null,
    }, { onConflict: "platform_account_id" }).then(({ error }) => {
      if (error) console.error(`[oauth callback] failed to reset connector_health on reconnect for ${upsertedAccount.id}:`, error.message);
    });

    // The gap this feature exists to close: without this insert, a
    // successful connection would sit forever with zero sync_jobs rows,
    // and the cron worker (Feature 9) would never have anything to
    // claim for it. job_class "backfill" — a new connection wants
    // history pulled, not just the next incremental tick — matching
    // the distinct job class the 2.1 blueprint named for exactly this
    // "first connect" case (different queue priority/economics than
    // steady-state incremental sync, per that blueprint's own gap 1.2).
    // Also correct on reconnect: a gap since the revoke deserves a
    // fresh backfill to catch up, not just resuming incremental ticks.
    const { error: jobError } = await supabase.from("sync_jobs").insert({
      platform_account_id: upsertedAccount.id,
      job_class: "backfill",
      status: "queued",
    });

    if (jobError) {
      // The connection itself succeeded and is real — only the first
      // sync's enqueue failed. Surface this distinctly rather than as a
      // generic connect failure, since from the user's perspective the
      // connection worked; only the first sync is delayed.
      integrationsUrl.searchParams.set("connect_error", "connected_but_sync_not_queued");
      return NextResponse.redirect(integrationsUrl);
    }

    integrationsUrl.searchParams.set("connected", connectorKey);
    return NextResponse.redirect(integrationsUrl);
  } catch (err) {
    // Never let a raw error (which could include partial token material
    // in a stack trace from a poorly-behaved dependency) reach the
    // client via redirect params — log server-side only, show a generic
    // message to the user.
    console.error(`[oauth callback] ${connectorKey} exchange failed:`, err);
    integrationsUrl.searchParams.set("connect_error", "exchange_failed");
    return NextResponse.redirect(integrationsUrl);
  }
}
