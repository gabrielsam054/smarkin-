import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft, Sparkles } from "lucide-react";
import { isCurrentUserAdmin } from "@/lib/admin";
import { AppShell } from "@/components/layout/AppShell";
import { AudienceCard, AudienceRecommendation as UiAudienceRecommendation } from "@/components/domain/AudienceCard";
import { StrategyCard, Strategy as UiStrategy } from "@/components/domain/StrategyCard";
import { RecommendationCard } from "@/components/domain/RecommendationCard";
import { EvidencePanel, Evidence } from "@/components/domain/EvidencePanel";
import type {
  AudienceRecommendation, TargetingStrategy, PlatformRecommendation, AudienceInsight,
} from "@/lib/capabilities/audienceResearch/types";

function toUiAudience(a: AudienceRecommendation, isPrimary: boolean): UiAudienceRecommendation {
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

export default async function AudienceResearchResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("audience_research")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!row) notFound();

  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  const primaryAudiences = (row.primary_audiences ?? []) as AudienceRecommendation[];
  const secondaryAudiences = (row.secondary_audiences ?? []) as AudienceRecommendation[];
  const targetingStrategies = (row.targeting_strategies ?? []) as TargetingStrategy[];
  const platformRecommendations = (row.platform_recommendations ?? []) as PlatformRecommendation[];
  const audienceInsights = (row.audience_insights ?? []) as AudienceInsight[];
  const evidenceRaw = (row.evidence ?? []) as Evidence[];
  const gaps = (row.gaps ?? []) as string[];
  const confidence = row.confidence as number;

  const uiAudiences: UiAudienceRecommendation[] = [
    ...primaryAudiences.map(a => toUiAudience(a, true)),
    ...secondaryAudiences.map(a => toUiAudience(a, false)),
  ];
  const uiStrategies: UiStrategy[] = targetingStrategies.map(s => ({
    name: s.name,
    bestFor: s.bestFor,
    budget: s.budgetRecommendation ? `${s.budgetRecommendation.amount}/${s.budgetRecommendation.period}` : null,
    confidence: s.confidence,
    learningSpeed: s.learningSpeed,
    reasoning: s.reasoning,
  }));

  const topAudience = primaryAudiences[0] ?? null;
  const topPlatform = [...platformRecommendations].sort((a, b) => b.suitability - a.suitability)[0] ?? null;

  return (
    <AppShell
      firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Audience Research"
      headerLeft={<Link href="/audience/new" className="text-text-muted hover:text-text-primary transition-colors"><ArrowLeft size={18} /></Link>}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Audience Research · v{row.version_number}</p>
            <h1 className="text-xl font-bold text-text-primary">{row.business_id}</h1>
          </div>
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5">
            <Sparkles size={13} className="text-primary" />
            <span className="text-xs font-medium text-primary">{confidence} confidence</span>
          </div>
        </div>

        {/* Primary + Secondary Audiences */}
        <section>
          <h2 className="text-sm font-semibold text-text-primary mb-3">Audiences</h2>
          {uiAudiences.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {uiAudiences.map((a, i) => <AudienceCard key={i} audience={a} />)}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No audiences found — see Evidence below for why.</p>
          )}
        </section>

        {/* Targeting Strategies */}
        {uiStrategies.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-text-primary mb-3">Targeting Strategies</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {uiStrategies.map((s, i) => <StrategyCard key={i} strategy={s} />)}
            </div>
          </section>
        )}

        {/* Platform Recommendations */}
        {platformRecommendations.length > 0 && (
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Platform Suitability</h2>
            <div className="flex flex-col gap-2">
              {platformRecommendations.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b border-border py-2 last:border-0">
                  <span className="text-text-primary">{p.platform}</span>
                  <span className="text-xs font-mono text-text-muted">{p.suitability}/100</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Audience Insights */}
        {audienceInsights.length > 0 && (
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-text-primary mb-3">Audience Insights</h2>
            <div className="flex flex-col gap-2">
              {audienceInsights.map((ins, i) => (
                <p key={i} className="text-sm text-text-secondary">
                  <span className="text-[10px] uppercase text-text-muted mr-2">{ins.category.replace("-", " ")}</span>
                  {ins.insight}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* Recommendation — the one honest next action this asset supports */}
        {topAudience && (
          <RecommendationCard recommendation={{
            title: topPlatform ? `Target "${topAudience.name}" on ${topPlatform.platform}` : `Focus on "${topAudience.name}"`,
            confidence,
            reasoning: topAudience.reasoning,
            actionLabel: "Run Advertising",
            actionHref: "/decision/new",
          }} />
        )}

        {/* Evidence — gaps now render inside the panel's technical
            details section, matching the redesigned component's contract;
            the standalone GapList was removed to avoid showing the same
            gap strings twice on one page */}
        <EvidencePanel evidence={evidenceRaw} gaps={gaps} />
      </div>
    </AppShell>
  );
}
