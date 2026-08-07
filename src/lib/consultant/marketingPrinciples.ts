import { SupabaseClient } from "@supabase/supabase-js";

export interface MarketingPrinciple {
  id: string;
  statement: string;
  evidenceRequired: string[];
  confidenceRule: string;
}

/**
 * Real, single source for marketing principles — referenced by
 * Decision Trees, Playbooks, and Campaign Analysis alike, per the
 * Consultant Brain architecture's explicit "shared, not duplicated"
 * design. Phase 1 scope: a small, real, static lookup — no dynamic
 * matching to arbitrary questions yet (that's Dynamic Context
 * Assembly, explicitly out of scope for this milestone).
 */
export async function getAllPrinciples(supabase: SupabaseClient): Promise<MarketingPrinciple[]> {
  const { data, error } = await supabase.from("marketing_principles").select("*");
  if (error) {
    console.error("[getAllPrinciples] Failed to load:", error.message);
    return []; // A read failure here should never break the calling context builder — same read-failure isolation pattern as businessIntelligenceCache.ts.
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    statement: row.statement,
    evidenceRequired: row.evidence_required,
    confidenceRule: row.confidence_rule,
  }));
}
