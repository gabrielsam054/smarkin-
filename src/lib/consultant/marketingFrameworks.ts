import { SupabaseClient } from "@supabase/supabase-js";

export interface MarketingFramework {
  name: string;
  category: string;
  structure: string[];
  bestFor: string;
}

/**
 * Real, genuinely new knowledge domain — classical marketing
 * frameworks, per the Consultant Brain architecture. Fetched by name
 * when a question explicitly references one (e.g. "using PAS",
 * "using JTBD") — deterministic, matching the same no-AI-guessed-
 * routing discipline as classifyIntent.ts.
 */
export async function findFrameworkMentionedIn(supabase: SupabaseClient, question: string): Promise<MarketingFramework | null> {
  const { data, error } = await supabase.from("marketing_frameworks").select("*");
  if (error || !data) {
    if (error) console.error("[findFrameworkMentionedIn] Failed to load:", error.message);
    return null;
  }
  const q = question.toLowerCase();
  const matched = data.find((f) => q.includes(f.name.toLowerCase()) || q.includes(f.name.split(" ")[0].toLowerCase()));
  if (!matched) return null;
  return { name: matched.name, category: matched.category, structure: matched.structure, bestFor: matched.best_for };
}
