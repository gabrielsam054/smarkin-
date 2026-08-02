import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap, CheckCircle, AlertCircle, TrendingUp, Lightbulb, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { generateCampaignStrategy } from "@/lib/strategy";
import type { AudienceReport, AnalysisInput } from "@/lib/engine";
import { Logo } from "@/components/layout/Logo";
import { LogoutButton } from "@/components/shared/LogoutButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StrategySection } from "@/components/strategy/StrategySection";
import { CopyBlock, CopyChip } from "@/components/strategy/CopyBlock";
import { CampaignScoreRing } from "@/components/strategy/CampaignScoreRing";
import { LaunchChecklist } from "@/components/strategy/LaunchChecklist";
import { CampaignStructureDisplay } from "@/components/strategy/CampaignStructureDisplay";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Campaign Strategy — Smarkin AI" };
interface PageProps { params: Promise<{ id: string }> }

export default async function CampaignStrategyPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Server-side gate — campaign_strategy feature required
  const { getSubscriptionGuard } = await import("@/lib/subscription-guard");
  const guard = await getSubscriptionGuard(user.id);
  if (!guard.hasFeature("campaign_strategy")) {
    redirect("/billing?reason=upgrade_required");
  }

  const { data: request } = await supabase
    .from("analysis_requests").select("*").eq("id", id).eq("user_id", user.id).single();
  if (!request) notFound();

  const { data: result } = await supabase
    .from("analysis_results").select("*").eq("request_id", id).eq("user_id", user.id).single();
  if (!result) redirect(`/analysis/${id}`);

  // Reconstruct typed report
  const report: AudienceReport = {
    industry: result.industry ?? "",
    sector: result.sector ?? "",
    category: result.category ?? "",
    subCategory: result.sub_category ?? "",
    productFamily: result.product_family ?? "",
    productType: result.product_type ?? "",
    matchedKeywordCount: result.matched_keyword_count ?? 0,
    matchConfidenceLevel: result.match_confidence_level ?? "keyword",
    interests: result.interests ?? [],
    behaviors: result.behaviors ?? [],
    demographics: result.demographics ?? [],
    personas: result.personas ?? [],
    problems: result.problems ?? [],
    campaignObjective: result.campaign_objective ?? "",
    objectiveStrategy: result.objective_strategy ?? "",
    audienceStrategy: result.audience_strategy ?? "",
    audienceStrategyBestFor: result.audience_strategy_best_for ?? "",
    funnelStage: result.funnel_stage ?? "",
    recommendedObjective: result.recommended_objective ?? "",
    creativeFocus: result.creative_focus ?? "",
    bestCreativeFormat: result.best_creative_format ?? "",
    placements: result.placements ?? [],
    creativeHooks: result.creative_hooks ?? [],
    optimizationTips: result.optimization_tips ?? [],
    customerGoals: result.customer_goals ?? [],
    buyingMotivations: result.buying_motivations ?? [],
    messagingAngles: result.messaging_angles ?? [],
    executiveSummary: result.executive_summary ?? "",
    audienceInsight: result.audience_insight ?? "",
    whyThisAudience: result.why_this_audience ?? "",
    overallScore: result.overall_score ?? 0,
    scoreBreakdown: result.score_breakdown ?? {},
    // v3 Intelligence Engine fields
    benchmarks:           result.benchmarks ?? null,
    recommendedOffers:    result.recommended_offers ?? [],
    creativeIntelligence: result.creative_intelligence ?? [],
    psychologyPrinciples: result.psychology_principles ?? [],
    journeyStage:         result.journey_stage ?? null,
    playbook:             result.playbook ?? null,
    knowledgeGraphPath:   result.knowledge_graph_path ?? [],
    explainability:       result.explainability ?? {
      classificationPath: "",
      keyDatabases: [],
      confidenceFactors: [],
      alternativeIndustries: [],
      riskFactors: [],
      assumptions: [],
    },
  };

  const input: AnalysisInput = {
    productName: request.product_name,
    description: request.description ?? "",
    businessType: request.business_type,
    objective: request.objective,
    country: request.country,
  };

  const strategy = generateCampaignStrategy(report, input);

  return (
    <div className="min-h-screen bg-background">
      {/* Topbar */}
      <header className="border-b border-border bg-surface sticky top-0 z-40 print:hidden">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-4">
            <span className="text-sm text-text-secondary hidden sm:block">{user.email}</span>
            <Badge variant="green">Free Trial</Badge>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-3 mb-8 flex-wrap print:hidden">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors">
            <ArrowLeft size={14} />Dashboard
          </Link>
          <span className="text-text-muted">/</span>
          <Link href={`/analysis/${id}`} className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Audience Report
          </Link>
          <span className="text-text-muted">/</span>
          <span className="text-sm text-primary font-medium">Campaign Strategy</span>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <p className="font-mono text-xs tracking-[3px] uppercase text-primary mb-2">Module 6 · AI Campaign Strategy Engine</p>
          <h1 className="text-3xl lg:text-4xl font-heading font-bold text-text-primary leading-tight mb-3">
            Campaign Strategy
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="green">{report.industry}</Badge>
            <Badge variant="blue">{request.business_type}</Badge>
            <Badge variant="muted">{request.objective}</Badge>
            <Badge variant="muted">{request.country}</Badge>
          </div>
        </div>

        {/* Section 1 - Executive Summary */}
        <div className="bg-surface border border-primary/25 rounded-2xl p-6 mb-4 shadow-green">
          <p className="font-mono text-[10px] tracking-[2px] uppercase text-primary mb-3">Executive Campaign Summary</p>
          <p className="text-text-primary leading-relaxed text-[15px]">{strategy.executiveSummary}</p>
        </div>

        {/* Nav to audience report */}
        <div className="flex gap-3 mb-4">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link href={`/analysis/${id}`}><ArrowLeft size={14} />Audience Report</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
            <Link href={`/analysis/${id}/strategy`}><Zap size={14} />Campaign Strategy</Link>
          </Button>
        </div>

        <div className="flex flex-col gap-3">

          {/* SECTION 2: Campaign Objective */}
          <StrategySection label="Campaign Objective" icon="🎯" defaultOpen accent="green">
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#0B1120] border border-primary/25 rounded-sm p-5">
                <p className="font-mono text-[9px] uppercase tracking-[2px] text-primary mb-2">Recommended Objective</p>
                <p className="text-2xl font-heading font-bold text-text-primary mb-1">{strategy.objectiveRec.objective}</p>
                <p className="text-xs text-text-secondary leading-relaxed mb-4">{strategy.objectiveRec.reason}</p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-text-muted mb-1">Confidence</p>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${strategy.objectiveRec.confidence}%` }} />
                      </div>
                      <span className="font-mono text-xs text-primary font-bold">{strategy.objectiveRec.confidence}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[9px] font-mono text-text-muted border border-border rounded-full px-2 py-1">
                    <CheckCircle size={8} className="text-primary" />
                    {strategy.objectiveRec.source}
                  </div>
                </div>
              </div>
              <div className="bg-[#0B1120] border border-border rounded-sm p-5">
                <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted mb-3">AI Strategy</p>
                <p className="text-sm text-text-primary leading-relaxed">{strategy.objectiveRec.strategy}</p>
              </div>
            </div>
          </StrategySection>

          {/* SECTION 3: Funnel Stage */}
          <StrategySection label="Funnel Stage" icon="📊" accent="blue">
            <div className="pt-4 space-y-2">
              {strategy.funnelStages.map((stage) => (
                <div
                  key={stage.stage}
                  className={`flex items-start gap-4 p-4 rounded-sm border transition-all ${
                    stage.isCurrent
                      ? "border-primary/40 bg-primary/5"
                      : "border-border bg-[#0B1120]"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-none ${stage.isCurrent ? "bg-primary" : "bg-surface-2"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`font-heading font-semibold text-sm ${stage.isCurrent ? "text-primary" : "text-text-primary"}`}>
                        {stage.stage}
                      </p>
                      {stage.isCurrent && (
                        <span className="font-mono text-[8px] uppercase tracking-wider text-primary border border-primary/30 bg-primary/10 px-1.5 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{stage.explanation}</p>
                    <div className="flex gap-4 mt-2 text-[10px] font-mono text-text-muted">
                      <span>Objective: <span className="text-text-secondary">{stage.recommendedObjective}</span></span>
                      <span>Focus: <span className="text-text-secondary">{stage.creativeFocus}</span></span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </StrategySection>

          {/* SECTION 4: Campaign Structure */}
          <StrategySection label="Campaign Structure" icon="🏗️" badge="3 Ad Sets" defaultOpen accent="blue">
            <CampaignStructureDisplay structure={strategy.campaignStructure} />
          </StrategySection>

          {/* SECTION 5: Creative Types */}
          <StrategySection label="Creative Strategy" icon="🎨" accent="amber">
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {strategy.creativeTypes.map((ct) => (
                <div
                  key={ct.type}
                  className={`p-4 rounded-sm border ${ct.isRecommended
                    ? "border-amber/40 bg-amber/5"
                    : "border-border bg-[#0B1120]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {ct.isRecommended && <Star size={12} className="text-amber flex-none" />}
                    <p className={`font-heading font-semibold text-sm ${ct.isRecommended ? "text-amber" : "text-text-primary"}`}>
                      {ct.type}
                    </p>
                    {ct.isRecommended && (
                      <span className="font-mono text-[8px] uppercase tracking-wider text-amber border border-amber/30 bg-amber/10 px-1.5 py-0.5 rounded-full ml-auto">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed mb-1">{ct.reason}</p>
                  <p className="text-[10px] font-mono text-text-muted">Best for: {ct.bestFor}</p>
                </div>
              ))}
            </div>
          </StrategySection>

          {/* SECTION 6: Creative Angles */}
          <StrategySection label="Creative Angles" icon="💡" badge={strategy.creativeAngles.length}>
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {strategy.creativeAngles.map((angle, i) => (
                <div key={i} className="bg-[#0B1120] border border-border rounded-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-heading font-semibold text-text-primary text-sm">{angle.title}</p>
                    <span className="font-mono text-[8px] text-primary border border-primary/30 bg-primary/10 px-2 py-0.5 rounded-full">
                      {angle.emotion}
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs mb-3">
                    <div><span className="text-text-muted">Pain: </span><span className="text-text-secondary">{angle.painPoint}</span></div>
                    <div><span className="text-text-muted">Outcome: </span><span className="text-text-secondary">{angle.desiredOutcome}</span></div>
                  </div>
                  <CopyBlock text={angle.hookExample} className="text-[11px]" />
                </div>
              ))}
            </div>
          </StrategySection>

          {/* SECTION 7: Hooks */}
          <StrategySection label="Ad Hooks" icon="🪝" badge={strategy.hooks.length}>
            <div className="pt-4 space-y-2">
              {strategy.hooks.map((hook, i) => (
                <div key={i} className={`flex items-center gap-3 ${hook.type === "primary" ? "order-first" : ""}`}>
                  {hook.type === "primary" && (
                    <span className="font-mono text-[8px] uppercase tracking-wider text-primary border border-primary/30 bg-primary/10 px-2 py-0.5 rounded-full flex-none">
                      Primary
                    </span>
                  )}
                  <CopyChip text={hook.text} label={hook.text} />
                  <span className="font-mono text-[9px] text-text-muted flex-none hidden sm:block">{hook.emotion}</span>
                </div>
              ))}
            </div>
          </StrategySection>

          {/* SECTION 8: CTAs */}
          <StrategySection label="CTA Recommendations" icon="👆" badge={strategy.ctas.length}>
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {strategy.ctas.map((cta, i) => (
                <div key={i} className={`p-3 rounded-sm border ${i === 0 ? "border-primary/30 bg-primary/5" : "border-border bg-[#0B1120]"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className={`font-heading font-semibold text-sm ${i === 0 ? "text-primary" : "text-text-primary"}`}>
                      {cta.text}
                    </p>
                    <span className={`font-mono text-[10px] font-bold ${i === 0 ? "text-primary" : "text-text-secondary"}`}>
                      {cta.effectiveness}%
                    </span>
                  </div>
                  <div className="h-1 bg-surface-2 rounded-full overflow-hidden mb-1.5">
                    <div className={`h-full rounded-full ${i === 0 ? "bg-primary" : "bg-secondary"}`} style={{ width: `${cta.effectiveness}%` }} />
                  </div>
                  <p className="text-[10px] text-text-muted leading-relaxed">{cta.bestFor}</p>
                </div>
              ))}
            </div>
          </StrategySection>

          {/* SECTION 9: Offers */}
          <StrategySection label="Offer Suggestions" icon="🏷️" badge={strategy.offers.length}>
            <div className="pt-4 space-y-2">
              {strategy.offers.map((offer, i) => (
                <div key={i} className="flex items-center gap-4 bg-[#0B1120] border border-border rounded-sm px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-heading font-semibold text-text-primary text-sm">{offer.offer}</p>
                      <span className="font-mono text-[8px] text-text-muted border border-border rounded-full px-2 py-0.5">{offer.type}</span>
                    </div>
                    <p className="text-xs text-text-secondary">{offer.reason}</p>
                  </div>
                  <div className="flex-none text-right">
                    <p className="font-mono text-xs font-bold text-primary">{offer.conversionLikelihood}%</p>
                    <p className="font-mono text-[9px] text-text-muted">conversion</p>
                  </div>
                </div>
              ))}
            </div>
          </StrategySection>

          {/* SECTION 10: Ad Copy */}
          <StrategySection label="Copy Generator" icon="✍️" badge={strategy.adCopy.length} accent="violet">
            <div className="pt-4 space-y-3">
              {strategy.adCopy.map((copy) => (
                <CopyBlock
                  key={copy.type}
                  label={copy.label}
                  text={copy.text}
                  maxLength={copy.maxLength}
                />
              ))}
            </div>
          </StrategySection>

          {/* SECTION 11: Video Ideas */}
          <StrategySection label="Video Ideas" icon="🎬" badge={strategy.videoIdeas.length}>
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {strategy.videoIdeas.map((vid, i) => (
                <div key={i} className="bg-[#0B1120] border border-border rounded-sm p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-secondary border border-secondary/30 bg-secondary/10 px-2 py-0.5 rounded-full">{vid.type}</span>
                    <p className="font-heading font-semibold text-text-primary text-sm">{vid.title}</p>
                  </div>
                  <CopyBlock label="Opening Hook" text={vid.openingHook} />
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted mb-1.5">Scene List</p>
                    <ul className="space-y-1">
                      {vid.scenes.map((scene, j) => (
                        <li key={j} className="flex items-start gap-2 text-xs text-text-secondary">
                          <span className="text-secondary flex-none">→</span>{scene}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <CopyBlock label="Ending CTA" text={vid.endingCTA} />
                </div>
              ))}
            </div>
          </StrategySection>

          {/* SECTION 12: Image Ideas */}
          <StrategySection label="Image Ideas" icon="🖼️" badge={strategy.imageIdeas.length}>
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {strategy.imageIdeas.map((img, i) => (
                <div key={i} className="bg-[#0B1120] border border-border rounded-sm p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[8px] uppercase tracking-wider text-text-muted border border-border rounded-full px-2 py-0.5">{img.type}</span>
                    <p className="font-heading font-semibold text-text-primary text-sm">{img.title}</p>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">{img.description}</p>
                  <div className="flex items-start gap-2 bg-surface border border-primary/20 rounded-sm px-3 py-2">
                    <Lightbulb size={11} className="text-primary flex-none mt-0.5" />
                    <p className="text-[10px] text-primary leading-relaxed">{img.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </StrategySection>

          {/* SECTION 14: Budget */}
          <StrategySection label="Campaign Budget" icon="💰" accent="green">
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {strategy.budgets.map((budget, i) => (
                <div key={i} className={`p-5 rounded-sm border ${i === 0 ? "border-primary/30 bg-primary/5" : "border-border bg-[#0B1120]"}`}>
                  <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted mb-2">{budget.phase}</p>
                  <p className="text-2xl font-heading font-bold text-primary mb-1">{budget.dailyBudget}</p>
                  <p className="text-xs text-text-secondary mb-1">Duration: {budget.duration}</p>
                  <p className="text-xs text-text-muted mb-3">Total: {budget.totalBudget}</p>
                  <p className="text-[10px] text-text-secondary leading-relaxed border-t border-border pt-3">{budget.reason}</p>
                </div>
              ))}
            </div>
          </StrategySection>

          {/* SECTION 15: Optimization */}
          <StrategySection label="Optimization Strategy" icon="📈" accent="blue">
            <div className="pt-4 space-y-2">
              {strategy.metricGuides.map((m, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#0B1120] border border-border rounded-sm p-4 items-start">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-text-muted mb-0.5">Metric</p>
                    <p className="font-heading font-bold text-text-primary text-sm">{m.metric}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-text-muted mb-0.5">Condition</p>
                    <p className="text-sm text-amber">{m.condition}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-text-muted mb-0.5">Benchmark</p>
                    <p className="text-xs text-secondary font-mono">{m.benchmark}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-wider text-text-muted mb-0.5">Action</p>
                    <p className="text-xs text-text-secondary leading-relaxed">{m.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </StrategySection>

          {/* SECTION 16: Launch Checklist */}
          <StrategySection label="Launch Checklist" icon="✅" badge={`${strategy.checklist.length} items`} defaultOpen>
            <div className="pt-4">
              <LaunchChecklist initialItems={strategy.checklist} />
            </div>
          </StrategySection>

          {/* SECTION 17: Campaign Score */}
          <StrategySection label="Campaign Readiness Score" icon="⭐" defaultOpen accent="green">
            <div className="pt-4">
              <CampaignScoreRing score={strategy.campaignScore} components={strategy.scoreComponents} />
            </div>
          </StrategySection>

          {/* SECTION 18: AI Recommendations */}
          <StrategySection label="AI Recommendations" icon="🤖" defaultOpen accent="violet">
            <div className="pt-4 space-y-4">
              {/* Priority */}
              <div className="bg-[#0B1120] border border-primary/25 rounded-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Star size={14} className="text-primary" />
                  <p className="font-mono text-[10px] uppercase tracking-[2px] text-primary font-bold">Top Priority</p>
                </div>
                <p className="text-sm text-text-primary leading-relaxed">{strategy.aiRecommendations.priority}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Quick Wins */}
                <div className="bg-[#0B1120] border border-primary/20 rounded-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap size={12} className="text-primary" />
                    <p className="font-mono text-[9px] uppercase tracking-[2px] text-primary font-semibold">Quick Wins</p>
                  </div>
                  <ul className="space-y-2">
                    {strategy.aiRecommendations.quickWins.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                        <span className="text-primary flex-none">→</span>{w}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Risks */}
                <div className="bg-[#0B1120] border border-amber/20 rounded-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle size={12} className="text-amber" />
                    <p className="font-mono text-[9px] uppercase tracking-[2px] text-amber font-semibold">Potential Risks</p>
                  </div>
                  <ul className="space-y-2">
                    {strategy.aiRecommendations.potentialRisks.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                        <span className="text-amber flex-none">→</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Opportunities */}
                <div className="bg-[#0B1120] border border-secondary/20 rounded-sm p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp size={12} className="text-secondary" />
                    <p className="font-mono text-[9px] uppercase tracking-[2px] text-secondary font-semibold">Opportunities</p>
                  </div>
                  <ul className="space-y-2">
                    {strategy.aiRecommendations.optimizationOpportunities.map((o, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                        <span className="text-secondary flex-none">→</span>{o}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </StrategySection>

        </div>

        {/* Bottom nav */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface border border-border rounded-2xl p-6 print:hidden">
          <div>
            <p className="font-heading font-semibold text-text-primary mb-1">Ready to launch?</p>
            <p className="text-sm text-text-secondary">Go back to your audience report or start a new analysis.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button variant="secondary" asChild>
              <Link href={`/analysis/${id}`}><ArrowLeft size={14} />Audience Report</Link>
            </Button>
            <Button asChild className="gap-2">
              <Link href="/analysis/new"><Zap size={14} />New Analysis</Link>
            </Button>
          </div>
        </div>

        <p className="text-center text-xs text-text-muted font-mono mt-8 print:hidden">
          Smarkin AI Module 6 · AI Campaign Strategy Engine · Database-driven · Zero hallucination
        </p>
      </main>
    </div>
  );
}
