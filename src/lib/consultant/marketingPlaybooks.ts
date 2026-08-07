import { SupabaseClient } from "@supabase/supabase-js";

export interface MarketingPlaybook {
  id: string;
  name: string;
  problem: string;
  symptoms: string;
  evidenceRequired: string[];
  likelyCauses: Array<{ cause: string; confirmingEvidence: string }>;
  recommendedActions: Array<{ action: string; confidenceRule: string }>;
  successMetric: string;
}

/**
 * Real, reusable consultant workflows, per the Consultant Brain
 * architecture's §3 design. Fetched by name — deterministic, matching
 * the same "no AI-guessed routing" discipline as classifyIntent.ts —
 * never fuzzy-matched to a question.
 */
export async function getPlaybookByName(supabase: SupabaseClient, name: string): Promise<MarketingPlaybook | null> {
  const { data, error } = await supabase.from("marketing_playbooks").select("*").eq("name", name).maybeSingle();
  if (error) {
    console.error("[getPlaybookByName] Failed to load:", error.message);
    return null; // A read failure here should never break the calling context builder.
  }
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    problem: data.problem,
    symptoms: data.symptoms,
    evidenceRequired: data.evidence_required,
    likelyCauses: data.likely_causes,
    recommendedActions: data.recommended_actions,
    successMetric: data.success_metric,
  };
}
