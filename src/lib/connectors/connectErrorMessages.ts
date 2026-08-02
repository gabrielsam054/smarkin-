/**
 * Every value these routes actually redirect with, collected from the
 * real routes rather than invented — connect/route.ts, callback/route.ts.
 * Kept in one place so a new error code added to either route has an
 * obvious, single spot to add its message too, instead of the page
 * silently showing nothing for it (the exact gap this fix closes).
 */
const CONNECT_ERROR_MESSAGES: Record<string, string> = {
  denied: "You declined the connection request on Meta's side. You can try again anytime.",
  invalid_state: "The connection attempt couldn't be verified and was rejected for your security. Please try connecting again.",
  unknown_connector: "That platform isn't recognized. Please try again from the Integrations page.",
  no_accounts_found: "No ad accounts were found on that Meta login. Make sure the account you logged in with has access to at least one ad account.",
  multiple_accounts_unsupported: "That Meta login has access to multiple ad accounts. Connecting a specific one isn't supported yet — this is real, upcoming work, not a bug.",
  backend_not_ready: "Something went wrong saving the connection. Please try again — if this keeps happening, let support know.",
  token_store_failed: "The connection succeeded but saving your credentials failed. Please try connecting again.",
  connected_but_sync_not_queued: "Your account is connected, but the first sync couldn't be scheduled yet. It should catch up automatically soon.",
  exchange_failed: "The connection process failed unexpectedly. Please try again.",
  no_workspace: "Your account isn't fully set up yet — please contact support to finish workspace setup before connecting a platform.",
};

export function getConnectErrorMessage(code: string): string {
  return CONNECT_ERROR_MESSAGES[code] ?? "Something went wrong connecting that platform. Please try again.";
}
