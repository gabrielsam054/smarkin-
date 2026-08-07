import { SupabaseClient } from "@supabase/supabase-js";

export interface PastBlueprintOutcome {
  positioning: string | null;
  primaryAudience: string | null;
  outcome: string;
  notes: string | null;
  createdAt: string;
}

/**
 * Real persistence for the Blueprint's Learning gap - the exact same
 * pattern already proven for Campaign Intelligence (persist, report,
 * feed back), applied here instead of inventing a new one.
 */
export async function persistBlueprintRecommendation(
  supabase: SupabaseClient,
  userId: string,
  productName: string,
  positioning: string | null,
  primaryAudience: string | null,
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("blueprint_recommendations")
      .insert({ user_id: userId, product_name: productName, positioning, primary_audience: primaryAudience })
      .select("id")
      .single();
    if (error) {
      console.error("[persistBlueprintRecommendation] Failed to persist:", error.message);
      return null;
    }
    return data.id;
  } catch (e) {
    console.error("[persistBlueprintRecommendation] Exception:", e);
    return null;
  }
}

/**
 * Real past outcomes for this product, with real reported outcomes
 * where available - mirrors pastCampaignRecommendations exactly.
 */
export async function getPastBlueprintOutcomes(supabase: SupabaseClient, userId: string, productName: string): Promise<PastBlueprintOutcome[]> {
  const { data: pastRows } = await supabase
    .from("blueprint_recommendations")
    .select("id, positioning, primary_audience, created_at")
    .eq("user_id", userId)
    .eq("product_name", productName)
    .order("created_at", { ascending: false })
    .limit(5);

  if (!pastRows || pastRows.length === 0) return [];

  const { data: outcomeRows } = await supabase
    .from("blueprint_outcomes")
    .select("blueprint_id, outcome, notes")
    .in("blueprint_id", pastRows.map((r) => r.id));

  return pastRows
    .map((r) => {
      const matched = (outcomeRows ?? []).find((o) => o.blueprint_id === r.id);
      return matched
        ? { positioning: r.positioning, primaryAudience: r.primary_audience, outcome: matched.outcome, notes: matched.notes, createdAt: r.created_at }
        : null;
    })
    .filter((r): r is PastBlueprintOutcome => r !== null);
}
