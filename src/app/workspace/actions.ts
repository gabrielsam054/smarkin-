"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateReport } from "@/lib/engine";

export async function createCampaign(name: string, emoji: string = "🎯") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("campaigns")
    .insert({ user_id: user.id, name, emoji, status: "draft" })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/workspace");
  return { id: data.id };
}

export async function updateCampaignBrief(campaignId: string, brief: Record<string, string>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("campaigns")
    .update({
      business_name: brief.businessName,
      website:       brief.website,
      industry:      brief.industry,
      product:       brief.product,
      price:         brief.price,
      offer:         brief.offer,
      campaign_goal: brief.campaignGoal,
      budget:        brief.budget,
      country:       brief.country,
      competitors:   brief.competitors,
      deadline:      brief.deadline,
      brand_voice:   brief.brandVoice,
      updated_at:    new Date().toISOString(),
    })
    .eq("id", campaignId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function runAIResearch(campaignId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("user_id", user.id)
    .single();

  if (!campaign) return { error: "Campaign not found" };

  // Run Intelligence Engine — DB-first, no LLM
  const report = generateReport({
    productName:  campaign.product ?? "",
    description:  campaign.offer ?? "",
    country:      campaign.country ?? "Worldwide",
    businessType: campaign.industry ?? "Ecommerce",
    objective:    campaign.campaign_goal ?? "Sales",
  });

  const research = {
    industry:          report.industry,
    sector:            report.sector,
    personas:          report.personas,
    problems:          report.problems,
    goals:             report.customerGoals,
    motivations:       report.buyingMotivations,
    journeyStage:      report.journeyStage,
    benchmarks:        report.benchmarks,
    playbook:          report.playbook,
    psychologyPrinciples: report.psychologyPrinciples,
    overallScore:      report.overallScore,
    explainability:    report.explainability,
    generatedAt:       new Date().toISOString(),
  };

  // ── Claude Campaign Coach — explains engine findings ──────────────────────
  let coachInsight = "";
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiKey = (process as any).env.ANTHROPIC_API_KEY as string | undefined;
    if (apiKey) {
      const coachRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 700,
          system: `You are the Smarkin AI Campaign Coach — a senior Meta Ads strategist.

The Smarkin Intelligence Engine has already retrieved all audience data, benchmarks, personas, and playbooks.
You are NOT selecting audiences. You are NOT inventing interests or behaviors.
You are explaining and advising based ONLY on what the engine retrieved.

YOUR OUTPUT: Write 3-5 specific, numbered campaign recommendations.
Each recommendation must:
- Reference the actual data provided (benchmark CTR, persona names, funnel stage, etc.)
- Be immediately actionable for a Meta Ads manager
- Explain the reasoning, not just the instruction
- Be grounded in the playbook and journey stage provided

Do NOT invent audiences. Do NOT add interests. Only advise on what was retrieved.`,
          messages: [{
            role: "user",
            content: (() => {
              const r = research as unknown as Record<string,unknown>;
              const interests = (r.interests ?? [] as unknown[]) as {name?:string;mainCategory?:string;tier?:string}[];
              const behaviors = (r.behaviors ?? [] as unknown[]) as {metaAudience?:string;parent?:string;child?:string}[];
              const personas  = (r.personas  ?? [] as unknown[]) as {name?:string;goal?:string}[];
              return `=== SMARKIN INTELLIGENCE ENGINE — CAMPAIGN BRIEF ===

PRODUCT: ${campaign.product}
GOAL: ${campaign.campaign_goal}
DAILY BUDGET: ${campaign.daily_budget ?? "Unknown"}
COUNTRY: ${campaign.country}
INDUSTRY: ${research.industry}
CONFIDENCE: ${String(r.overallScore ?? "N/A")}/100

TOP PERSONAS (retrieved by engine):
${personas.slice(0,3).map((p, i) => `${i+1}. ${p.name ?? ""} — Goal: ${p.goal ?? ""}`).join("\n")}

TOP META INTERESTS (selected by engine — do not change):
${interests.slice(0,8).map(i => `- ${i.name ?? ""} [${i.mainCategory ?? ""}] (${i.tier ?? ""})`).join("\n")}

TOP BEHAVIORS (selected by engine):
${behaviors.slice(0,5).map(b => `- ${b.metaAudience || b.parent} > ${b.child}`).join("\n")}

JOURNEY STAGE: ${(research.journeyStage as unknown as Record<string,unknown>)?.["Stage"] ?? (research.journeyStage as unknown as Record<string,unknown>)?.["stage"] ?? "Awareness"}
FUNNEL STRATEGY: ${(research.playbook as unknown as Record<string,unknown>)?.["Recommended Funnel"] ?? (research.playbook as unknown as Record<string,unknown>)?.["recommendedFunnel"] ?? "Standard"}
CAMPAIGN OBJECTIVE: ${String(r.campaignObjective ?? "")}
AUDIENCE STRATEGY: ${String(r.audienceStrategy ?? "")}

BENCHMARKS:
- Average CTR: ${(research.benchmarks as unknown as Record<string,unknown>)?.["Average CTR (%)"] ?? "N/A"}%
- Average CPC: $${(research.benchmarks as unknown as Record<string,unknown>)?.["Average CPC ($)"] ?? "N/A"}

CUSTOMER GOALS: ${((r.customerGoals ?? []) as string[]).slice(0,3).join(" | ")}
BUYING MOTIVATIONS: ${((r.buyingMotivations ?? []) as string[]).slice(0,3).join(" | ")}

Write 3-5 numbered campaign coaching recommendations. Reference the specific data above. Be direct and actionable.`;
            })(),
          }],
        }),
      });
      if (coachRes.ok) {
        const coachData = await coachRes.json();
        coachInsight = (coachData.content ?? [])
          .filter((b: { type: string }) => b.type === "text")
          .map((b: { text?: string }) => b.text ?? "")
          .join("").trim();
      }
    }
  } catch { /* Claude unavailable — continue without coach */ }

  if (coachInsight) {
    (research as Record<string, unknown>).coachInsight = coachInsight;
  }

  // Save research + save audience in one transaction
  await supabase.from("campaigns")
    .update({ ai_research: research, updated_at: new Date().toISOString() })
    .eq("id", campaignId);

  // Save primary audience
  await supabase.from("campaign_audiences").upsert({
    campaign_id:   campaignId,
    user_id:       user.id,
    name:          "Primary Audience",
    audience_data: report,
    confidence:    report.overallScore,
    is_primary:    true,
  });

  // Log decision
  await supabase.from("campaign_decisions").insert({
    campaign_id:    campaignId,
    user_id:        user.id,
    decision_type:  "ai_research",
    title:          `AI Research: ${report.industry} identified`,
    reason:         report.explainability?.classificationPath ?? "",
    evidence:       `${report.matchedKeywordCount} keyword signals, ${report.interests?.length ?? 0} Meta interests`,
    confidence:     report.overallScore,
    data:           { industry: report.industry, score: report.overallScore },
  });

  revalidatePath(`/workspace/${campaignId}`);
  return { research, report };
}

export async function saveCreative(
  campaignId: string,
  type: string,
  content: string,
  metadata?: Record<string, unknown>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("campaign_creatives")
    .insert({ campaign_id: campaignId, user_id: user.id, creative_type: type, content, metadata })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { id: data.id };
}

export async function saveBudget(campaignId: string, budgetData: Record<string, unknown>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await supabase.from("campaign_budgets").upsert({
    campaign_id:    campaignId,
    user_id:        user.id,
    total_budget:   budgetData.totalBudget,
    daily_budget:   budgetData.dailyBudget,
    cold_pct:       budgetData.coldPct,
    retargeting_pct:budgetData.retargetingPct,
    lookalike_pct:  budgetData.lookalikePct,
    currency:       budgetData.currency ?? "GHS",
    benchmark_data: budgetData.benchmarks,
    updated_at:     new Date().toISOString(),
  });

  return { success: true };
}

export async function updateCampaignTab(campaignId: string, tab: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("campaigns")
    .update({ last_active_tab: tab, updated_at: new Date().toISOString() })
    .eq("id", campaignId).eq("user_id", user.id);
}

export async function deleteCampaign(campaignId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  await supabase.from("campaigns").delete().eq("id", campaignId).eq("user_id", user.id);
  revalidatePath("/workspace");
  return { success: true };
}
