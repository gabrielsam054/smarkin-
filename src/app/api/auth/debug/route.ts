/**
 * GET /api/auth/debug
 * Shows exactly what redirect URL the app is sending to Google/Supabase.
 * Visit this in your browser to get the exact URL to paste into Google Console.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  return NextResponse.json({
    app_origin: origin,
    supabase_callback_url: `https://${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "")}/auth/v1/callback`,
    app_callback_url: `${origin}/auth/callback`,
    env_check: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "✓ set" : "✗ MISSING",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? "✓ set" : "✗ MISSING",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? "✓ set" : "✗ MISSING",
    },
    instructions: {
      step1: "Go to https://console.cloud.google.com → APIs & Services → Credentials → Your OAuth Client",
      step2: `Add to 'Authorized redirect URIs': ${`https://${process.env.NEXT_PUBLIC_SUPABASE_URL?.replace("https://", "")}/auth/v1/callback`}`,
      step3: "Go to your Supabase project → Authentication → Providers → Google → Enable",
      step4: "Paste your Google Client ID and Client Secret into Supabase",
      step5: `In Supabase → Authentication → URL Configuration → add Site URL: ${origin}`,
      step6: `In Supabase → Authentication → URL Configuration → add Redirect URL: ${origin}/auth/callback`,
    },
  });
}
