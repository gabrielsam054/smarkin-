/**
 * Matches v16's connectors_registry / platform_accounts / connector_health
 * exactly — these are the state machines the UI must render, not
 * speculative UI. See v16_core_schema_v2.sql for the source of truth.
 */
export type ConnectorAccountStatus = "active" | "paused" | "revoked" | "error";
export type ConnectorHealthState = "closed" | "open" | "half_open";

export interface ConnectorDefinition {
  key: string;
  displayName: string;
  /** Roadmap priority — matches the 2.1/3.0 blueprint's explicit choice
   *  of Meta Ads as the first connector. Not an invented product list. */
  available: boolean;
}

export interface ConnectedAccount {
  platformAccountId: string;
  connectorKey: string;
  externalAccountId: string;
  displayName: string | null;
  status: ConnectorAccountStatus;
  healthState: ConnectorHealthState;
  lastOkAt: string | null;
  lastError: string | null;
  connectedAt: string;
}

/**
 * Only Meta is marked available — matching the roadmap's stated
 * priority, not a fabricated "we support everything" list. The others
 * are named because they're on the real roadmap (2.1 blueprint), shown
 * as genuinely unavailable rather than omitted, so the page is honest
 * about what's coming without pretending it's here.
 */
export const CONNECTORS: ConnectorDefinition[] = [
  { key: "meta_ads", displayName: "Meta Ads", available: true },
  { key: "google_ads", displayName: "Google Ads", available: false },
  { key: "tiktok_ads", displayName: "TikTok Ads", available: false },
  { key: "ga4", displayName: "Google Analytics 4", available: false },
  { key: "shopify", displayName: "Shopify", available: false },
];
