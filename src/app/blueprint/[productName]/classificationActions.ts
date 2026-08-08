"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveBusinessClassification(
  productName: string,
  businessType: string | null,
  primaryGoal: string | null,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase.from("business_classification").upsert(
    { user_id: user.id, product_name: productName, business_type: businessType, primary_goal: primaryGoal },
    { onConflict: "user_id,product_name" },
  );

  if (error) return { error: `Could not save: ${error.message}` };
  return {};
}
