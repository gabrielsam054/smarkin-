/**
 * Zero imports, deliberately — same reasoning as security/identity.ts and
 * security/errors.ts. Any file needing to check data freshness (the
 * Business Intelligence Cache, the Customer Research Service) shouldn't be
 * forced to pull in businessIntelligenceCache.ts's Supabase dependency just
 * to reference this constant.
 *
 * Manually bumped when smarkin-db.json is redeployed with new content —
 * same version-numbering already used for the spreadsheet exports this
 * session (v15, etc.).
 */
export const CURRENT_DATA_VERSION = "v15";
