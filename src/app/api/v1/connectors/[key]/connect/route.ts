import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { requireUser } from "@/lib/auth/requireUser";
import { getConnector } from "@/lib/connectors/types";
import { bootstrapConnectors } from "@/lib/connectors/bootstrap";

bootstrapConnectors();

const STATE_COOKIE = "smarkin_oauth_state";

/**
 * Matches the documented contract ConnectorCard (Feature 6) already
 * calls: POST /api/v1/connectors/:key/connect -> { redirectUrl }.
 * That component was written against this contract before this route
 * existed — this is the other half arriving, not a new contract.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  // Real auth check — matches every other real write action in this
  // project (requireUser, not a bare cookie check).
  await requireUser(`/integrations`);

  const connector = getConnector(key);
  if (!connector) {
    // Honest 404 for connectors not yet implemented (everything except
    // meta_ads right now) — matches ConnectorCard's own handling of
    // this exact status code, written in Feature 6 anticipating it.
    return NextResponse.json({ error: "Connector not available" }, { status: 404 });
  }

  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/v1/connectors/callback`;

  // CSRF state: connector key embedded so the callback (a single shared
  // route, since OAuth apps typically register one static redirect_uri)
  // knows which connector's exchange to run, plus a random token
  // verified against the cookie on callback. Without this, an attacker
  // could trick a user's browser into completing an OAuth flow the user
  // never initiated — a real, well-known OAuth CSRF class, not a
  // theoretical concern.
  const stateToken = randomBytes(24).toString("base64url");
  const state = `${key}.${stateToken}`;

  // getAuthorizationUrl() throws if the connector's required env vars
  // (META_APP_ID for Meta) aren't configured — a real, easy-to-hit
  // misconfiguration during initial setup, not a hypothetical. This
  // was previously unguarded: an unhandled throw here crashed the route
  // as an opaque 500, instead of the clean, informative error every
  // other failure path in this connector layer already returns.
  let redirectUrl: string;
  try {
    redirectUrl = connector.getAuthorizationUrl({ redirectUri, state });
  } catch (err) {
    console.error(`[connect] ${key} getAuthorizationUrl failed:`, err);
    return NextResponse.json(
      { error: "This connector isn't fully configured yet — its credentials are missing or invalid." },
      { status: 503 }
    );
  }

  // Only set the state cookie once we know we actually have a URL to
  // send the user to — no reason to leave a stray, unusable CSRF cookie
  // behind for a request that never resulted in a real redirect.
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600, // 10 minutes — long enough for a real OAuth dialog, short enough to limit replay window
    path: "/",
  });

  return NextResponse.json({ redirectUrl });
}
