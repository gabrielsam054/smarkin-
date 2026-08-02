/**
 * POST /api/paystack/initialize
 * Initializes a Paystack transaction. Secret key never leaves the server.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PLANS } from "@/lib/billing";
import { initializePayment, generateReference } from "@/lib/providers/paystack";
import type { PlanId } from "@/lib/billing";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let planId: PlanId;
  try {
    const body = await request.json();
    planId = body.planId as PlanId;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const plan = PLANS[planId];
  if (!plan) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  if (!user.email) return NextResponse.json({ error: "User email required" }, { status: 400 });

  const reference = generateReference(user.id, planId);

  // Use request origin — avoids NEXT_PUBLIC_APP_URL misconfiguration
  const origin = new URL(request.url).origin;
  const callbackUrl = `${origin}/api/paystack/verify?ref=${reference}`;

  // Record pending payment
  await supabase.from("payment_history").insert({
    user_id:  user.id,
    amount:   plan.priceGHS,
    currency: "GHS",
    reference,
    status:   "pending",
    provider: "paystack",
    plan_id:  planId,
    metadata: { plan_name: plan.name, price_usd: plan.priceUsd },
  });

  try {
    const result = await initializePayment({
      email:     user.email,
      amountGHS: plan.priceGHS,
      reference,
      planId,
      userId:    user.id,
      callbackUrl,
    });

    if (!result.status) {
      await supabase.from("payment_history")
        .update({ status: "failed" })
        .eq("reference", reference);
      return NextResponse.json({ error: result.message ?? "Payment initialization failed" }, { status: 502 });
    }

    return NextResponse.json({
      authorizationUrl: result.data.authorization_url,
      reference:        result.data.reference,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[paystack/initialize] Error:", message);
    await supabase.from("payment_history")
      .update({ status: "failed" })
      .eq("reference", reference);
    return NextResponse.json({ error: "Could not reach payment provider. Try again." }, { status: 502 });
  }
}
