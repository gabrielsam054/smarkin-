/**
 * Paystack provider adapter.
 * All functions are server-side only (use in Server Actions / API Routes).
 * Adding Stripe: create src/lib/providers/stripe.ts with the same interface.
 *
 * Currency: GHS (Ghanaian Cedi) — amounts sent in pesewas (smallest unit).
 * 1 GHS = 100 pesewas.
 */
import type { PaystackInitResponse, PaystackVerifyResponse } from "@/lib/billing";

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_BASE   = "https://api.paystack.co";

async function paystackFetch<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paystack ${path} failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

// ── Initialize Payment ────────────────────────────────────────

export interface InitPaymentParams {
  email: string;
  amountGHS: number;   // e.g. 59.99 — in GHS (cedis), will be converted to pesewas
  reference: string;
  planId: string;
  userId: string;
  callbackUrl: string;
}

export async function initializePayment(
  params: InitPaymentParams
): Promise<PaystackInitResponse> {
  // Paystack requires amount in smallest currency unit (pesewas for GHS)
  const amountPesewas = Math.round(params.amountGHS * 100);

  return paystackFetch<PaystackInitResponse>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email:        params.email,
      amount:       amountPesewas,
      reference:    params.reference,
      currency:     "GHS",
      callback_url: params.callbackUrl,
      metadata: {
        plan_id:  params.planId,
        user_id:  params.userId,
        source:   "smarkin_ai",
      },
    }),
  });
}

// ── Verify Transaction ────────────────────────────────────────

export async function verifyTransaction(
  reference: string
): Promise<PaystackVerifyResponse> {
  return paystackFetch<PaystackVerifyResponse>(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
}

// ── Generate unique reference ─────────────────────────────────

export function generateReference(userId: string, planId: string): string {
  const ts   = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `smk_${planId}_${ts}_${rand}`;
}
