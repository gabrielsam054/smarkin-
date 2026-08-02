import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_MODELS = ["claude-sonnet-4-6", "claude-sonnet-5"];
const MAX_TOKENS_LIMIT = 4096;

export async function POST(req: NextRequest) {
  try {
    // ── Verify authenticated session ──
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Check Anthropic key ──
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Service not configured" }, { status: 503 });
    }

    const body = await req.json();
    const { model, max_tokens, system, messages } = body;

    // ── Validate input ──
    if (!model || !ALLOWED_MODELS.includes(model)) {
      return NextResponse.json({ error: "Invalid model" }, { status: 400 });
    }
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }
    if (typeof max_tokens !== "number" || max_tokens > MAX_TOKENS_LIMIT) {
      return NextResponse.json({ error: "Invalid max_tokens" }, { status: 400 });
    }

    // ── Forward to Anthropic ──
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model, max_tokens, system, messages }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? "Upstream error" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("[/api/analyze]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
