/**
 * The Extension Rule applied to connectors, per the 2.0/2.1 blueprints:
 * one shared interface, per-platform implementations register against
 * it. Adding a platform = adding one file + one registry entry; nothing
 * upstream changes. Read/write scopes are separate types deliberately —
 * matches v16's connectors_registry.read_scopes/write_scopes split, so
 * a read-only connection is structurally incapable of spending money
 * (Execution Layer design principle, enforced here at the connector
 * boundary too, not only at the draft-approval boundary).
 */
export interface OAuthTokenSet {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  scopes: string[];
}

export interface Connector {
  key: string;
  displayName: string;

  /** Builds the platform's OAuth authorization URL. `state` is a
   *  caller-generated CSRF token — every implementation MUST include it
   *  in the URL and the caller MUST verify it on callback. Omitting
   *  state is a known OAuth CSRF vulnerability class, not an optional
   *  hardening step. */
  getAuthorizationUrl(params: { redirectUri: string; state: string }): string;

  /** Exchanges an authorization code for tokens. Never logs the raw
   *  code or the resulting tokens — callers must treat the return value
   *  as sensitive from the moment it exists. */
  exchangeCodeForTokens(params: { code: string; redirectUri: string }): Promise<OAuthTokenSet>;

  /** Refreshes an expiring token. Returns null if the platform's tokens
   *  don't expire / don't support refresh (some platforms differ).
   *  What to pass here is platform-specific by design, not a false
   *  uniformity: platforms with real refresh tokens (Google) expect the
   *  refresh token; platforms without them (Meta has none — its OAuth
   *  model re-exchanges the current access token instead) expect the
   *  current access token. Each connector's own doc comment states
   *  which it needs. */
  refreshTokens(token: string): Promise<OAuthTokenSet | null>;

  /** Lists the accounts (ad accounts, properties, stores — platform-
   *  specific concept, uniform shape) this token grants access to.
   *  Added deliberately to the shared interface rather than left as a
   *  Meta-specific helper: the need to resolve "which specific account
   *  did the user just authorize" is universal across every OAuth
   *  connector, and keeping it here is what lets the OAuth callback
   *  route stay connector-agnostic (one shared route, no per-connector
   *  branching) as more connectors are added later. */
  listAvailableAccounts(accessToken: string): Promise<Array<{ externalId: string; displayName: string }>>;
}

/**
 * Registry — adding a connector means adding one entry here, nothing
 * else changes. Only Meta is implemented; this is intentionally the
 * single slice built this feature, matching the roadmap's stated
 * first-connector priority (same file, same principle as
 * src/lib/connectors.ts's CONNECTORS list from the Integrations feature —
 * that list is UI-facing display metadata; this registry is the
 * server-side implementation registry. Two different concerns, kept
 * separate deliberately rather than one file serving both roles).
 */
const REGISTRY = new Map<string, Connector>();

export function registerConnector(connector: Connector) {
  REGISTRY.set(connector.key, connector);
}

export function getConnector(key: string): Connector | undefined {
  return REGISTRY.get(key);
}
