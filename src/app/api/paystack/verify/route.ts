/**
 * GET /api/paystack/verify
 *
 * Paystack callback after payment. Verifies server-side and activates subscription.
 * Uses service role key so it works even if the session cookie isn't present
 * in the redirect from Paystack (which is the most common failure mode).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { verifyTransaction } from "@/lib/providers/paystack";
import { PLANS } from "@/lib/billing";
import type { PlanId } from "@/lib/billing";

// Service role client — bypasses RLS, works without a session cookie
function getAdminSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const reference =
    searchParams.get("reference") ??
    searchParams.get("ref") ??
    searchParams.get("trxref");

  if (!reference) {
    return NextResponse.redirect(`${origin}/billing/cancel?reason=missing_reference`);
  }

  // We need the app URL for redirects — use origin from the request, not env var
  // This fixes the localhost redirect bug when NEXT_PUBLIC_APP_URL isn't set
  const appOrigin = origin;

  try {
    // ── 1. Verify with Paystack ────────────────────────────────
    const verification = await verifyTransaction(reference);

    if (!verification.status || verification.data.status !== "success") {
      // Mark failed in DB using service role (no session needed)
      const svc = getAdminSupabase();
      await svc.from("payment_history")
        .update({ status: "failed" })
        .eq("reference", reference);

      const reason = verification.data?.status === "abandoned"
        ? "payment_abandoned" : "payment_failed";
      return NextResponse.redirect(`${appOrigin}/billing/cancel?reason=${reason}&ref=${reference}`);
    }

    // ── 2. Extract user_id from metadata (set during initialization) ──
    const userId = verification.data.metadata?.user_id as string | undefined;
    const planId = verification.data.metadata?.plan_id as PlanId | undefined;

    // Fallback: try to get user from session if metadata is missing
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      resolvedUserId = user?.id;
    }

    if (!resolvedUserId) {
      return NextResponse.redirect(`${appOrigin}/login?redirectTo=/billing`);
    }

    const plan = planId ? PLANS[planId] : null;
    if (!plan || !planId) {
      return NextResponse.redirect(`${appOrigin}/billing/cancel?reason=invalid_plan&ref=${reference}`);
    }

    // Use service role for all DB writes — no session dependency
    const svc = getAdminSupabase();

    // ── 3. Idempotency check ───────────────────────────────────
    const { data: existing } = await svc
      .from("subscriptions")
      .select("id")
      .eq("payment_reference", reference)
      .maybeSingle();

    if (existing) {
      return NextResponse.redirect(`${appOrigin}/billing/success?plan=${planId}`);
    }

    // ── 4. Expire old active subscriptions ────────────────────
    await svc
      .from("subscriptions")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("user_id", resolvedUserId)
      .eq("status", "active");

    // ── 5. Compute subscription window ────────────────────────
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

    // ── 6. Activate subscription ──────────────────────────────
    const { error: subError } = await svc.from("subscriptions").insert({
      user_id:           resolvedUserId,
      plan_id:           planId,
      status:            "active",
      provider:          "paystack",
      payment_reference: reference,
      customer_code:     customerCode,
      starts_at:         now.toISOString(),
      expires_at:        expiresAt,
      next_billing_at:   nextBillingAt,
    });

    if (subError) {
      console.error("[paystack/verify] Subscription insert error:", subError.message);
      // Still redirect to success — payment went through
    }

    // ── 7. Mark payment success ───────────────────────────────
    await svc
      .from("payment_history")
      .update({ status: "success", paystack_ref: reference })
      .eq("reference", reference);

    return NextResponse.redirect(`${appOrigin}/billing/success?plan=${planId}`);

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[paystack/verify] Error:", message);
    return NextResponse.redirect(`${appOrigin}/billing/cancel?reason=verification_error&ref=${reference}`);
  }
}
