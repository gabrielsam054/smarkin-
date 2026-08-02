import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyTransaction } from "@/lib/providers/paystack";
import { PLANS } from "@/lib/billing";
import type { PlanId } from "@/lib/billing";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const reference = searchParams.get("ref") ?? searchParams.get("reference");

  if (!reference) {
    return NextResponse.redirect(`${origin}/billing?error=missing_reference`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  try {
    // ── Step 1: Verify with Paystack (NEVER trust client) ────
    const verification = await verifyTransaction(reference);

    if (!verification.status || verification.data.status !== "success") {
      // Mark payment as failed
      await supabase
        .from("payment_history")
        .update({ status: "failed" })
        .eq("reference", reference)
        .eq("user_id", user.id);

      return NextResponse.redirect(
        `${origin}/billing?error=payment_failed&ref=${reference}`
      );
    }

    // ── Step 2: Extract plan from metadata ───────────────────
    const planId = verification.data.metadata?.plan_id as PlanId;
    const plan   = PLANS[planId];

    if (!plan) {
      return NextResponse.redirect(`${origin}/billing?error=invalid_plan`);
    }

    // ── Step 3: Check for duplicate (idempotency) ────────────
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("payment_reference", reference)
      .single();

    if (existing) {
      // Already activated — just redirect to billing
      return NextResponse.redirect(`${origin}/billing?success=1`);
    }

    // ── Step 4: Expire any existing active subscriptions ─────
    await supabase
      .from("subscriptions")
      .update({
        status:     "expired",
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("status", "active");

    // ── Step 5: Compute expiry ────────────────────────────────
    const now       = new Date();
    const startsAt  = now.toISOString();
    let expiresAt: string | null = null;
    let nextBillingAt: string | null = null;

    if (plan.durationDays) {
      const exp = new Date(now);
      exp.setDate(exp.getDate() + plan.durationDays);
      expiresAt = exp.toISOString();
    } else {
      // Monthly — next billing in 30 days
      const next = new Date(now);
      next.setDate(next.getDate() + 30);
      nextBillingAt = next.toISOString();
    }

    // ── Step 6: Activate subscription ────────────────────────
    await supabase.from("subscriptions").insert({
      user_id:           user.id,
      plan_id:           planId,
      status:            "active",
      provider:          "paystack",
      payment_reference: reference,
      customer_code:     verification.data.customer?.customer_code ?? null,
      starts_at:         startsAt,
      expires_at:        expiresAt,
      next_billing_at:   nextBillingAt,
    });

    // ── Step 7: Update payment record ─────────────────────────
    await supabase
      .from("payment_history")
      .update({
        status:       "success",
        paystack_ref: reference,
      })
      .eq("reference", reference)
      .eq("user_id", user.id);

    return NextResponse.redirect(`${origin}/billing?success=1`);
  } catch (err) {
    console.error("Payment verification error:", err);
    return NextResponse.redirect(
      `${origin}/billing?error=verification_failed`
    );
  }
}

// Paystack webhook (POST) — for renewals and async events
export async function POST(request: NextRequest) {
  const body      = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";

  // Verify webhook signature
  const crypto = await import("crypto");
  const secret = process.env.PAYSTACK_SECRET_KEY!;
  const hash   = crypto
    .createHmac("sha512", secret)
    .update(body)
    .digest("hex");

  if (hash !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body) as {
    event: string;
    data: Record<string, unknown>;
  };

  const supabase = await createClient();

  if (event.event === "charge.success") {
    const ref = event.data.reference as string;
    // Re-verify to be safe
    try {
      const verification = await verifyTransaction(ref);
      if (verification.data.status === "success") {
        await supabase
          .from("payment_history")
          .update({ status: "success" })
          .eq("reference", ref);
      }
    } catch {
      // Log and continue — don't crash the webhook
    }
  }

  if (event.event === "subscription.disable") {
    const subCode = event.data.subscription_code as string;
    await supabase
      .from("subscriptions")
      .update({
        status:       "cancelled",
        cancelled_at: new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      })
      .eq("subscription_code", subCode);
  }

  return NextResponse.json({ received: true });
}
