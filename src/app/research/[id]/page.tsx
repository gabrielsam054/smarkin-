import { redirect, notFound } from "next/navigation";
import { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Users, Flame, Target, Lightbulb, TrendingUp, AlertTriangle } from "lucide-react";
import { isCurrentUserAdmin } from "@/lib/admin";
import {
  CustomerResearchResult, CustomerPersona, PainPoint, JourneyStage, BuyingMotivation, ResearchSource,
} from "@/lib/capabilities/customerResearch/types";
import { AppShell } from "@/components/layout/AppShell";
import { PersonaCard } from "@/components/shared/PersonaCard";
import { PainPointRow } from "@/components/shared/PainPointRow";
import { HeroCard } from "@/components/domain/HeroCard";
import { MetricTile } from "@/components/domain/MetricTile";
import { ConfidenceMeter, ConfidenceBreakdownItem } from "@/components/domain/ConfidenceMeter";
import { AudienceResearchSection } from "@/components/domain/AudienceResearchSection";
import { AudienceRecommendation as UiAudienceRecommendation } from "@/components/domain/AudienceCard";
import { StrategyCard, Strategy as UiStrategy } from "@/components/domain/StrategyCard";
import type { AudienceRecommendation as RealAudienceRecommendation, TargetingStrategy } from "@/lib/capabilities/audienceResearch/types";
import { RecommendationCard } from "@/components/domain/RecommendationCard";
import { EvidencePanel, Evidence } from "@/components/domain/EvidencePanel";

function MotivationColumn({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">{label}</p>
      <ul className="flex flex-col gap-1.5">{items.map((it, i) => <li key={i} className="text-sm text-text-secondary">{it}</li>)}</ul>
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-semibold text-text-primary mb-4">{children}</h2>;
}

export default async function ResearchResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("customer_research")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!row) notFound();

  const [{ data: profile }, isAdmin, { data: biRow }] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    isCurrentUserAdmin(),
    // Real Business Understanding confidence, for an honest breakdown —
    // never fabricated if this row doesn't exist.
    supabase.from("business_intelligence_profiles").select("product_profile")
      .eq("user_id", user.id).eq("product_name", row.business_id).maybeSingle(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  const personas = (row.persona_data ?? []) as CustomerPersona[];
  const painPoints = (row.pain_points ?? []) as PainPoint[];
  const motivations = (row.motivations ?? {}) as BuyingMotivation;
  const journey = (row.journey ?? []) as JourneyStage[];
  const language = (row.language ?? {}) as CustomerResearchResult["languagePatterns"];
  const recommendations = (row.recommendations ?? {}) as CustomerResearchResult["recommendedMessaging"];
  const sources = (row.sources ?? []) as ResearchSource[];
  const gaps = (row.gaps ?? []) as string[];
  const confidence = row.confidence as number;

  const motivationCount = motivations.logical.length + motivations.emotional.length
    + motivations.fearBased.length + motivations.aspirational.length;
  const audienceSignalCount = language.searchQueries?.length ?? 0;
  const messagingCount = (recommendations.headlineIdeas?.length ?? 0)
    + (recommendations.offerAngle ? 1 : 0) + (recommendations.positioning ? 1 : 0)
    + (recommendations.ctaRecommendations?.length ?? 0);

  const topPersona = personas[0] ?? null;

  const evidence: Evidence[] = sources.map(s => ({
    label: s.table.split(" / ")[0].split(" (")[0],
    table: s.table,
    rowsUsed: s.rowsUsed,
    matched: s.rowsUsed > 0,
  }));

  const recommendationTitle = recommendations.headlineIdeas?.[0] ?? recommendations.offerAngle ?? "Run Advertising to turn this research into a campaign";

  const { data: audienceRow } = await supabase
    .from("audience_research")
    .select("primary_audiences, secondary_audiences, targeting_strategies, confidence")
    .eq("business_id", row.business_id)
    .eq("user_id", user.id)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  function toUiAudience(a: RealAudienceRecommendation, isPrimary: boolean): UiAudienceRecommendation {
    return {
      name: a.name,
      confidence: a.confidence,
      interests: a.interests.map(i => i.name),
      behaviors: a.behaviors.map(b => b.name),
      audienceSize: a.audienceSize?.min && a.audienceSize?.max
        ? `${(a.audienceSize.min / 1_000_000).toFixed(1)}M - ${(a.audienceSize.max / 1_000_000).toFixed(1)}M`
        : null,
      bestStrategy: null,
      recommendedBudget: null,
      isPrimary,
    };
  }

  const realAudiences: UiAudienceRecommendation[] = audienceRow
    ? [
        ...(audienceRow.primary_audiences as RealAudienceRecommendation[]).map(a => toUiAudience(a, true)),
        ...(audienceRow.secondary_audiences as RealAudienceRecommendation[]).map(a => toUiAudience(a, false)),
      ]
    : [];

  const realStrategies: UiStrategy[] = audienceRow
    ? (audienceRow.targeting_strategies as TargetingStrategy[]).map(s => ({
        name: s.name, bestFor: s.bestFor,
        budget: s.budgetRecommendation ? `${s.budgetRecommendation.amount}/${s.budgetRecommendation.period}` : null,
        confidence: s.confidence, learningSpeed: s.learningSpeed, reasoning: s.reasoning,
      }))
    : [];

  // Honest confidence breakdown — only real numbers the page actually
  // fetched. Business Understanding is omitted entirely (not shown as 0)
  // if no business_intelligence_profiles row exists yet, since that's a
  // genuinely different situation from "we checked and it's low."
  const confidenceBreakdown: ConfidenceBreakdownItem[] = [];
  const biConfidence = (biRow?.product_profile as { confidenceWeight?: number } | undefined)?.confidenceWeight;
  if (typeof biConfidence === "number") {
    confidenceBreakdown.push({ label: "Business Understanding", score: biConfidence });
  }
  confidenceBreakdown.push({ label: "Customer Research", score: confidence });
  confidenceBreakdown.push({ label: "Audience Research", score: audienceRow?.confidence ?? 0 });

  return (
    <AppShell
      firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Research"
      headerLeft={<Link href="/research/new" className="text-text-muted hover:text-text-primary transition-colors"><ArrowLeft size={18} /></Link>}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-10 flex flex-col gap-12">

        {/* 1. Hero AI Summary */}
        <HeroCard summary={{
          businessName: row.business_id,
          confidence,
          primaryCustomer: topPersona?.name ?? null,
          primaryOpportunity: recommendations.positioning ?? recommendations.offerAngle ?? null,
          recommendedCampaign: recommendationTitle,
          actionHref: "/decision/new",
        }} />

        {/* 2. Intelligence Overview */}
        <section>
          <SectionHeading>Intelligence Overview</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <MetricTile icon={Users} label="Personas" value={personas.length} />
            <MetricTile icon={Flame} label="Pain Points" value={painPoints.length} />
            <MetricTile icon={Target} label="Audience Signals" value={audienceSignalCount} />
            <MetricTile icon={Lightbulb} label="Messaging Angles" value={messagingCount} />
            <MetricTile icon={TrendingUp} label="Motivations" value={motivationCount} />
            <MetricTile icon={AlertTriangle} label="Knowledge Gaps" value={gaps.length} tone={gaps.length > 0 ? "warning" : "default"} />
          </div>
        </section>

        {/* 3. Customer Intelligence */}
        <section className="flex flex-col gap-8">
          <SectionHeading>Customer Intelligence</SectionHeading>

          {personas.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {personas.map((p, i) => <PersonaCard key={i} persona={p} />)}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No personas found for this business — see Evidence below.</p>
          )}

          {painPoints.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">Pain Points</p>
              <div className="flex flex-col">
                {painPoints.map((p, i) => <PainPointRow key={i} pain={p} />)}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <MotivationColumn label="Logical" items={motivations.logical} />
            <MotivationColumn label="Emotional" items={motivations.emotional} />
            <MotivationColumn label="Fear-Based" items={motivations.fearBased} />
            <MotivationColumn label="Aspirational" items={motivations.aspirational} />
          </div>

          {journey.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">Journey</p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {journey.map((s, i) => (
                  <div key={i} className="flex-1 min-w-[160px] rounded-lg border border-border p-3">
                    <p className="text-[10px] font-mono uppercase tracking-wide text-primary mb-1">{s.stage}</p>
                    <p className="text-xs text-text-secondary">{s.customerMindset ?? "—"}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 4. Audience Research */}
        <section>
          <SectionHeading>Audience Research</SectionHeading>
          <AudienceResearchSection audiences={realAudiences} runHref="/audience/new" />
          {realStrategies.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              {realStrategies.map((s, i) => <StrategyCard key={i} strategy={s} />)}
            </div>
          )}
        </section>

        {/* 5. Messaging Strategy */}
        <section>
          <SectionHeading>Messaging Strategy</SectionHeading>
          <div className="grid sm:grid-cols-2 gap-4">
            {recommendations.headlineIdeas?.[0] && (
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1.5">Headline</p>
                <p className="text-sm text-text-primary">&ldquo;{recommendations.headlineIdeas[0]}&rdquo;</p>
              </div>
            )}
            {recommendations.offerAngle && (
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1.5">Offer</p>
                <p className="text-sm text-text-primary">{recommendations.offerAngle}</p>
              </div>
            )}
            {recommendations.positioning && (
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1.5">Positioning</p>
                <p className="text-sm text-text-primary">{recommendations.positioning}</p>
              </div>
            )}
            {recommendations.ctaRecommendations?.[0] && (
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs text-text-muted uppercase tracking-wide mb-1.5">Call to Action</p>
                <p className="text-sm text-text-primary">{recommendations.ctaRecommendations[0]}</p>
              </div>
            )}
          </div>
        </section>

        {/* 6. Recommended Campaign */}
        <section>
          <SectionHeading>Recommended Campaign</SectionHeading>
          <RecommendationCard recommendation={{
            title: recommendationTitle,
            confidence,
            reasoning: recommendations.positioning ?? `Based on ${personas.length} real persona${personas.length === 1 ? "" : "s"} and ${painPoints.length} pain point${painPoints.length === 1 ? "" : "s"} found for this business.`,
            actionLabel: "Launch Campaign",
            actionHref: "/decision/new",
          }} />
        </section>

        {/* 7. Evidence */}
        <section>
          <SectionHeading>Evidence</SectionHeading>
          <EvidencePanel evidence={evidence} gaps={gaps} />
        </section>

        {/* 8. Confidence */}
        <section>
          <SectionHeading>Confidence</SectionHeading>
          <ConfidenceMeter overall={confidence} breakdown={confidenceBreakdown} />
        </section>
      </div>
    </AppShell>
  );
}
