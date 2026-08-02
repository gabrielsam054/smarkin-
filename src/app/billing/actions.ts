"use server";

import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/billing";
import { initializePayment, generateReference } from "@/lib/providers/paystack";
import type { PlanId } from "@/lib/billing";

export interface InitPaymentResult {
  authorizationUrl?: string;
  reference?: string;
  error?: string;
}

export async function initPaymentAction(
  planId: PlanId
): Promise<InitPaymentResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "You must be signed in." };

  const plan = PLANS[planId];
  if (!plan) return { error: "Invalid plan." };

  const reference = generateReference(user.id, planId);
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/paystack/verify?ref=${reference}`;

  // Record payment as pending in DB before redirecting
  await supabase.from("payment_history").insert({
    user_id:  user.id,
    amount:   plan.priceGHS,   // store GHS amount charged
    currency: "GHS",
    reference,
    status:   "pending",
    provider: "paystack",
    plan_id:  planId,
    metadata: { plan_name: plan.name, price_usd: plan.priceUsd },
  });

  try {
    const result = await initializePayment({
      email:       user.email!,
      amountGHS:   plan.priceGHS,
      reference,
      planId,
      userId:      user.id,
      callbackUrl,
    });

    if (!result.status) {
      return { error: result.message ?? "Payment initialization failed." };
    }

    return {
      authorizationUrl: result.data.authorization_url,
      reference:        result.data.reference,
    };
  } catch (err) {
    console.error("Paystack init error:", err);
    return { error: "Could not connect to payment provider. Please try again." };
  }
}

// Cancel subscription
export async function cancelSubscriptionAction(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("subscriptions")
    .update({
      status:       "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("status", "active");

  if (error) return { error: error.message };
  return {};
}
