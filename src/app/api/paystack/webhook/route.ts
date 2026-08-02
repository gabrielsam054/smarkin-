/**
 * POST /api/paystack/webhook
 *
 * Receives async Paystack events (charge.success, subscription.disable, etc.)
 * Validates the HMAC-SHA512 signature before processing any event.
 *
 * Register this URL in Paystack dashboard:
 *   https://dashboard.paystack.com/#/settings/developer → Webhooks
 *   URL: https://your-domain.com/api/paystack/webhook
 *
 * SECURITY:
 * - Always verify the x-paystack-signature header.
 * - Re-verify successful charges with the Paystack API before updating DB.
 * - Return 200 quickly — Paystack retries on non-2xx responses.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createHmac } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { verifyTransaction } from "@/lib/providers/paystack";
import { PLANS } from "@/lib/billing";
import type { PlanId } from "@/lib/billing";

// ── Signature verification ─────────────────────────────────────

function verifyWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    console.error("[webhook] PAYSTACK_SECRET_KEY is not set");
    return false;
  }
  const expected = createHmac("sha512", secret)
    .update(body)
    .digest("hex");
  return expected === signature;
}

// ── Event handlers ─────────────────────────────────────────────

async function handleChargeSuccess(
  data: Record<string, unknown>
): Promise<void> {
  const reference = data.reference as string;
  if (!reference) return;

  const supabase = await createClient();

  // Re-verify with Paystack — never trust the webhook payload alone
  const verification = await verifyTransaction(reference);
  if (!verification.status || verification.data.status !== "success") {
    console.warn("[webhook] charge.success but verify returned:", verification.data.status);
    return;
  }

  const planId = verification.data.metadata?.plan_id as PlanId | undefined;
  const plan   = planId ? PLANS[planId] : null;

  // Update payment_history
  await supabase
    .from("payment_history")
    .update({ status: "success" })
    .eq("reference", reference);

  // If subscription not yet created (e.g. verify route missed), create it
  if (plan && planId) {
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("payment_reference", reference)
      .maybeSingle();

    if (!existing) {
      const userId = verification.data.metadata?.user_id as string | undefined;
      if (userId) {
        const now = new Date();
        let expiresAt: string | null = null;
        let nextBillingAt: string | null = null;

        if (plan.durationDays) {
          const exp = new Date(now);
          exp.setDate(exp.getDate() + plan.durationDays);
          expiresAt = exp.toISOString();
        } else {
          const next = new Date(now);
          next.setDate(next.getDate() + 30);
          nextBillingAt = next.toISOString();
        }

        const customerCode =
          (verification.data.customer as { customer_code?: string } | undefined)
            ?.customer_code ?? null;

        // Expire existing active subs
        await supabase
          .from("subscriptions")
          .update({ status: "expired", updated_at: now.toISOString() })
          .eq("user_id", userId)
          .eq("status", "active");

        await supabase.from("subscriptions").insert({
          user_id:           userId,
          plan_id:           planId,
          status:            "active",
          provider:          "paystack",
          payment_reference: reference,
          customer_code:     customerCode,
          starts_at:         now.toISOString(),
          expires_at:        expiresAt,
          next_billing_at:   nextBillingAt,
        });
      }
    }
  }
}

async function handleSubscriptionDisable(
  data: Record<string, unknown>
): Promise<void> {
  const subscriptionCode = data.subscription_code as string | undefined;
  if (!subscriptionCode) return;

  const supabase = await createClient();
  await supabase
    .from("subscriptions")
    .update({
      status:       "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    })
    .eq("subscription_code", subscriptionCode)
    .eq("status", "active");
}

async function handlePaymentFailed(
  data: Record<string, unknown>
): Promise<void> {
  const reference = data.reference as string | undefined;
  if (!reference) return;

  const supabase = await createClient();
  await supabase
    .from("payment_history")
    .update({ status: "failed" })
    .eq("reference", reference)
    .eq("status", "pending");
}

async function handleSubscriptionNotRenew(
  data: Record<string, unknown>
): Promise<void> {
  const subscriptionCode = data.subscription_code as string | undefined;
  if (!subscriptionCode) return;

  const supabase = await createClient();
  await supabase
    .from("subscriptions")
    .update({
      status:     "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("subscription_code", subscriptionCode)
    .eq("status", "active");
}

// ── Main handler ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Read body as text for signature verification
  const body      = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";

  // ── Verify signature (reject anything unsigned) ─────────────
  if (!verifyWebhookSignature(body, signature)) {
    console.warn("[webhook] Invalid signature — rejected");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // ── Parse event ──────────────────────────────────────────────
  let event: { event: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log(`[webhook] Received event: ${event.event}`);

  // ── Dispatch events ───────────────────────────────────────────
  // Respond 200 immediately — async processing must not time out
  try {
    switch (event.event) {
      case "charge.success":
        await handleChargeSuccess(event.data);
        break;

      case "subscription.disable":
      case "subscription.not_renew":
        await handleSubscriptionDisable(event.data);
        break;

      case "invoice.payment_failed":
      case "charge.failed":
        await handlePaymentFailed(event.data);
        break;

      case "subscription.not_renew_update":
        await handleSubscriptionNotRenew(event.data);
        break;

      default:
        // Unhandled event — acknowledge and move on
        console.log(`[webhook] Unhandled event type: ${event.event}`);
    }
  } catch (err) {
    // Log but return 200 — Paystack should not retry on processing errors
    console.error(`[webhook] Error processing ${event.event}:`, err);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
