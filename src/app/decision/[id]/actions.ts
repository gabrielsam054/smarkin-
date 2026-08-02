"use server";

import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// Learning Engine — first real capability, and deliberately minimal. Records
// whether a recommendation actually worked. Does NOT yet feed back into
// decisionEngine.ts's confidence scoring — see the comment in migration 015
// for why that's a later step, once real outcome volume exists, not this one.
// ─────────────────────────────────────────────────────────────────────────────
export async function reportDecisionOutcome(
  decisionResultId: string,
  outcome: "worked" | "did_not_work" | "too_early_to_tell",
  notes?: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in to report an outcome." };

  const { error } = await supabase.from("decision_outcomes").insert({
    decision_result_id: decisionResultId,
    user_id: user.id,
    outcome,
    notes: notes || null,
  });

  if (error) return { error: `Could not save your feedback: ${error.message}` };
  return {};
}
