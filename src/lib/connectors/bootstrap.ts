import { registerConnector } from "./types";
import { metaConnector } from "./meta";

/**
 * The one place a new connector implementation gets wired in. Imported
 * once, at the top of any route that needs the registry populated
 * (Next.js module-level imports run once per server instance, so this
 * registration happens exactly once, not per-request).
 */
export function bootstrapConnectors() {
  registerConnector(metaConnector);
  // Future connectors (Google Ads, TikTok, GA4, Shopify) register here,
  // one line each, per the Extension Rule — nothing else in this file
  // or in the route handlers below needs to change.
}
