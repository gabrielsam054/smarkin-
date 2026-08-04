import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { getConnector } from "@/lib/connectors/types";
import { bootstrapConnectors } from "@/lib/connectors/bootstrap";
import { encryptToken } from "@/lib/crypto/tokenEncryption";
import { buildServiceRoleClient } from "@/lib/supabase/serviceClient";
import { resolveWorkspaceId } from "@/lib/workspace/resolveWorkspaceId";
import { completeConnection } from "@/lib/connectors/completeConnection";

bootstrapConnectors();

const STATE_COOKIE = "smarkin_oauth_state";
const PENDING_SELECTION_COOKIE = "smarkin_pending_account_selection";

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
      // Closes the gap deliberately left open when this limitation was
      // first built: rather than silently picking one account (which
      // could connect an account the user didn't intend — worse than
      // asking), the discovered accounts and the already-obtained
      // tokens are stored in a short-lived, encrypted, httpOnly cookie,
      // and the user picks explicitly on a real page. The OAuth dance
      // doesn't need to repeat — Meta already granted access; this is
      // just finishing the "which one" question honestly instead of
      // guessing.
      const encAccessToken = encryptToken(tokens.accessToken);
      const encRefreshToken = tokens.refreshToken ? encryptToken(tokens.refreshToken) : null;
      const pendingCookieStore = await cookies();
      pendingCookieStore.set(PENDING_SELECTION_COOKIE, JSON.stringify({
        connectorKey,
        workspaceId,
        accounts,
        encAccessToken: encAccessToken.toString("base64"),
        encRefreshToken: encRefreshToken ? encRefreshToken.toString("base64") : null,
        expiresAt: tokens.expiresAt,
        scopes: tokens.scopes,
      }), {
        httpOnly: true, secure: true, sameSite: "lax",
        maxAge: 600, // same 10-minute window as the OAuth state cookie — a stale pending selection shouldn't linger
        path: "/",
      });

      const selectUrl = new URL("/integrations/select-account", request.nextUrl.origin);
      return NextResponse.redirect(selectUrl);
    }
    const account = accounts[0];

    const result = await completeConnection({
      supabase, workspaceId, connectorKey, userId: user.id, account, tokens,
    });

    if (!result.ok) {
      integrationsUrl.searchParams.set("connect_error", result.errorCode);
      return NextResponse.redirect(integrationsUrl);
    }

    // The actual fix for a real product gap: without this, a user
    // connecting an account would wait up to a full day (Hobby-tier
    // cron cadence) before seeing any data at all. Awaited directly —
    // not fire-and-forget — so the redirect only completes once real
    // data has had a chance to land; worst case (Meta briefly slow)
    // the job is already safely queued and the next cron tick retries
    // it, so this can't make the connect flow itself fail.
    const { attemptImmediateSync } = await import("@/lib/connectors/sync/queue");
    await attemptImmediateSync({ id: result.syncJobId, platformAccountId: result.platformAccountId, jobClass: "backfill" });

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
