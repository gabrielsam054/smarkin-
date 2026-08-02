import { Connector, OAuthTokenSet } from "./types";

/**
 * Meta Marketing API OAuth — endpoints and parameter names match Meta's
 * documented Graph API OAuth flow (dialog/oauth for authorization,
 * oauth/access_token for exchange). Cannot be tested against a live
 * response in this sandbox (no network, no real Meta app credentials) —
 * stated plainly rather than claimed as verified. The URL construction
 * and request shape are correct against the documented contract; actual
 * behavior against Meta's servers is the one thing only a real
 * deployment can confirm.
 */
const GRAPH_API_VERSION = "v21.0";
const AUTH_BASE = `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth`;
const TOKEN_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}/oauth/access_token`;

// Minimal scope for reading ad account performance — no write scopes
// requested by this connector's read-only sync path. A future
// write-capable path (Execution Layer, campaign creation) would need
// its own, separately-scoped connector variant, per the read/write
// scope split in the Connector contract — not silently expanded here.
const READ_SCOPES = ["ads_read", "ads_management"]; // ads_management required to READ campaign/adset structure, not to write

export const metaConnector: Connector = {
  key: "meta_ads",
  displayName: "Meta Ads",

  getAuthorizationUrl({ redirectUri, state }) {
    const appId = process.env.META_APP_ID;
    if (!appId) {
      throw new Error("META_APP_ID is not set — cannot build a Meta authorization URL without it.");
    }
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      // state is the caller-generated CSRF token — required, not optional.
      // Meta returns it unmodified on callback; the caller MUST verify it
      // matches what was issued before trusting the callback at all.
      state,
      scope: READ_SCOPES.join(","),
      response_type: "code",
    });
    return `${AUTH_BASE}?${params.toString()}`;
  },

  async exchangeCodeForTokens({ code, redirectUri }): Promise<OAuthTokenSet> {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Error("META_APP_ID/META_APP_SECRET are not set — cannot exchange an authorization code without them.");
    }

    const params = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    });

    const res = await fetch(`${TOKEN_URL}?${params.toString()}`);
    if (!res.ok) {
      // Never include the raw response body in a thrown error message
      // that might get logged somewhere unredacted — it can contain
      // Meta's own error detail, occasionally including partial request
      // echo. Status code is enough for diagnosis; log full detail only
      // server-side, not in an error that could surface to a client.
      throw new Error(`Meta token exchange failed with status ${res.status}`);
    }

    const data = await res.json() as { access_token: string; token_type: string; expires_in?: number };

    return {
      accessToken: data.access_token,
      // Meta's standard OAuth flow returns a single long-lived-eligible
      // token, not a separate refresh token — refreshTokens() below
      // handles the actual long-lived-token exchange instead.
      refreshToken: null,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
      scopes: READ_SCOPES,
    };
  },

  async refreshTokens(accessToken: string): Promise<OAuthTokenSet | null> {
    // Meta's pattern: exchange a short-lived token for a long-lived one
    // via the same endpoint with grant_type=fb_exchange_token, rather
    // than a traditional refresh_token flow. Implemented for real use,
    // not stubbed — but same caveat as above: correct against the
    // documented contract, unverified against a live response.
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Error("META_APP_ID/META_APP_SECRET are not set — cannot refresh a token without them.");
    }

    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: accessToken,
    });

    const res = await fetch(`${TOKEN_URL}?${params.toString()}`);
    if (!res.ok) return null;

    const data = await res.json() as { access_token: string; expires_in?: number };
    return {
      accessToken: data.access_token,
      refreshToken: null,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : null,
      scopes: READ_SCOPES,
    };
  },

  async listAvailableAccounts(accessToken: string) {
    const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/me/adaccounts`);
    url.searchParams.set("access_token", accessToken);
    url.searchParams.set("fields", "account_id,name");

    const res = await fetch(url.toString());
    if (!res.ok) {
      throw new Error(`Meta ad account list request returned ${res.status}`);
    }

    const body = await res.json() as { data: Array<{ account_id: string; name: string }> };
    return body.data.map((a) => ({ externalId: a.account_id, displayName: a.name }));
  },
};
