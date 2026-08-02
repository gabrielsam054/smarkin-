/**
 * /api/ai-enhance — Enriches a DB-generated intelligence report with Claude narrative.
 * Called AFTER the engine runs. Claude only explains, never invents data.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "AI not configured" }, { status: 503 });

    const { report, productName, objective, country } = await req.json();
    if (!report || !productName) {
      return NextResponse.json({ error: "Missing report data" }, { status: 400 });
    }

    const system = `You are Smarkin AI's Audience Intelligence Narrator.
You have been given structured marketing intelligence retrieved from the Smarkin Intelligence Engine database.
Your job is to write clear, professional, actionable narrative explanations based ONLY on the provided data.
Do NOT invent statistics, interests, or audiences not present in the data.
Write in second person. Be specific and confident. No fluff.`;

    const context = `PRODUCT: ${productName}
OBJECTIVE: ${objective ?? "Sales"}
COUNTRY: ${country ?? "Worldwide"}
Industry: ${report.industry} → ${report.sector} → ${report.category}
Matched Keywords: ${report.matchedKeywordCount} signals
Confidence Score: ${report.overallScore}/100
Top Personas: ${(report.personas ?? []).slice(0,3).map((p: Record<string,string>) => p.name).join(", ")}
Top Meta Interests: ${(report.interests ?? []).slice(0,5).map((i: Record<string,string>) => i.name).join(", ")}
Top Behaviors: ${(report.behaviors ?? []).slice(0,3).map((b: Record<string,string>) => b.metaAudience || b.parent).join(", ")}
Campaign Objective: ${report.campaignObjective}
Audience Strategy: ${report.audienceStrategy}
Funnel Stage: ${report.funnelStage}
Best Creative Format: ${report.bestCreativeFormat}
Benchmark CTR: ${report.benchmarks?.["Average CTR (%)"] ?? "N/A"}%
Benchmark CPC: $${report.benchmarks?.["Average CPC ($)"] ?? "N/A"}
Customer Goals: ${(report.customerGoals ?? []).slice(0,3).join(", ")}
Buying Motivations: ${(report.buyingMotivations ?? []).slice(0,3).join(", ")}

Write THREE paragraphs:
1. EXECUTIVE SUMMARY (what this product is, who buys it)
2. AUDIENCE INSIGHT (who the core buyers are, what drives them)
3. WHY THIS AUDIENCE (why these specific interests/behaviors were selected)

Each paragraph: 2-3 sentences, under 60 words. Second person. Actionable.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 600,
        system,
        messages: [{ role: "user", content: context }],
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data?.error?.message ?? "AI error" }, { status: response.status });
    }

    const text: string = (data.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text?: string }) => b.text ?? "")
      .join("").trim();

    const paragraphs = text.split(/\n\n+/).filter(Boolean);
    const clean = (s: string) => s.replace(/^\*?\*?\d+\.\s*(EXECUTIVE SUMMARY|AUDIENCE INSIGHT|WHY THIS AUDIENCE)?:?\*?\*?\s*/i, "").trim();

    return NextResponse.json({
      executiveSummary: clean(paragraphs[0] ?? ""),
      audienceInsight:  clean(paragraphs[1] ?? ""),
      whyThisAudience:  clean(paragraphs[2] ?? ""),
    });

  } catch (err) {
    console.error("[/api/ai-enhance]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
