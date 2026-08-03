import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Zap, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { generateIntelligenceReport } from "@/lib/intelligence";
import { AppShell } from "@/components/layout/AppShell";
import { isCurrentUserAdmin } from "@/lib/admin";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ReportSection } from "@/components/shared/ReportSection";
import { ConfidenceRing } from "@/components/shared/ConfidenceRing";
import { ExportToolbar } from "@/components/shared/ExportToolbar";
import { ProcessingState } from "@/components/ui/Skeleton";
import { StatCard, SourceRow } from "@/components/shared/ReportCards";
import { EvidenceList } from "@/components/intelligence/EvidenceBadge";
import { RelationshipPathDisplay } from "@/components/intelligence/RelationshipPath";
import { WeightedConfidenceDisplay } from "@/components/intelligence/ConfidenceDisplay";
import { TargetingStackDisplay } from "@/components/intelligence/TargetingStack";
import { CreativeConceptSection } from "@/components/intelligence/CreativeConceptSection";
import {
  EnhancedInterestCard,
  EnhancedBehaviorCard,
  EnhancedPersonaCard,
  EnhancedDemographicCard,
} from "@/components/intelligence/EnhancedCards";
import type { Metadata } from "next";
import type { AudienceReport, AnalysisInput } from "@/lib/engine";

export const metadata: Metadata = { title: "Audience Intelligence Report — Smarkin AI" };
interface PageProps { params: Promise<{ id: string }> }

/**
 * Wraps this page in AppShell (same as every other authenticated page)
 * instead of its own standalone ReportShell — makes it feel native to
 * Smarkin OS, per the explicit request. Deliberately NOT touching any
 * of the actual report logic below (subscription gating, data fetching,
 * the real 700+-line intelligence engine's output rendering) — this is
 * a shell swap, not a rebuild. ReportShell (Logo/email/Badge/Logout
 * header) is removed since AppShell's own header replaces it entirely.
 */
function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={24} className="text-destructive" />
        </div>
        <h1 className="text-2xl font-heading font-bold text-text-primary mb-3">Report Unavailable</h1>
        <p className="text-text-secondary mb-8 text-sm leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Button variant="secondary" asChild><Link href="/dashboard"><ArrowLeft size={14} />Dashboard</Link></Button>
          <Button asChild><Link href="/analysis/new"><Zap size={14} />New Analysis</Link></Button>
        </div>
      </div>
    </div>
  );
}

export default async function AnalysisReportPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Same pattern as every other AppShell page (dashboard, reports,
  // integrations, settings) — not invented fresh for this one.
  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  // Server-side subscription gate — audience_intelligence feature required
  const { getSubscriptionGuard } = await import("@/lib/subscription-guard");
  const guard = await getSubscriptionGuard(user.id);
  if (!guard.hasFeature("audience_intelligence")) {
    return <ErrorState message="You need an active plan to view Audience Intelligence Reports. Visit /billing to get started." />;
  }

  const { data: request, error: reqError } = await supabase
    .from("analysis_requests").select("*").eq("id", id).eq("user_id", user.id).single();
  if (reqError || !request) notFound();

  const { data: result } = await supabase
    .from("analysis_results").select("*").eq("request_id", id).eq("user_id", user.id).single();

  if (!result && request.status === "processing") {
    return <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Meta Ads Interest Finder">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-8 group">
          <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />Dashboard
        </Link>
        <ProcessingState />
      </div>
    </AppShell>;
  }

  if (!result || request.status === "failed") {
    return <ErrorState message="This analysis could not be completed. Please try running a new analysis." />;
  }

  // Re-construct a typed AudienceReport from the stored result
  const storedReport: AudienceReport = {
    industry:             result.industry ?? "",
    sector:               result.sector ?? "",
    category:             result.category ?? "",
    subCategory:          result.sub_category ?? "",
    productFamily:        result.product_family ?? "",
    productType:          result.product_type ?? "",
    matchedKeywordCount:  result.matched_keyword_count ?? 0,
    matchConfidenceLevel: result.match_confidence_level ?? "keyword",
    interests:            result.interests ?? [],
    behaviors:            result.behaviors ?? [],
    demographics:         result.demographics ?? [],
    personas:             result.personas ?? [],
    problems:             result.problems ?? [],
    campaignObjective:    result.campaign_objective ?? "",
    objectiveStrategy:    result.objective_strategy ?? "",
    audienceStrategy:     result.audience_strategy ?? "",
    audienceStrategyBestFor: result.audience_strategy_best_for ?? "",
    funnelStage:          result.funnel_stage ?? "",
    recommendedObjective: result.recommended_objective ?? "",
    creativeFocus:        result.creative_focus ?? "",
    bestCreativeFormat:   result.best_creative_format ?? "",
    placements:           result.placements ?? [],
    creativeHooks:        result.creative_hooks ?? [],
    optimizationTips:     result.optimization_tips ?? [],
    customerGoals:        result.customer_goals ?? [],
    buyingMotivations:    result.buying_motivations ?? [],
    messagingAngles:      result.messaging_angles ?? [],
    executiveSummary:     result.executive_summary ?? "",
    audienceInsight:      result.audience_insight ?? "",
    whyThisAudience:      result.why_this_audience ?? "",
    overallScore:         result.overall_score ?? 0,
    scoreBreakdown:       result.score_breakdown ?? {},
    // v3 Intelligence Engine fields (null-safe — may not exist on older analyses)
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
    productName:  request.product_name,
    description:  request.description ?? "",
    businessType: request.business_type,
    objective:    request.objective,
    country:      request.country,
  };

  // Generate intelligence layer (server-side, fast — pure JS)
  const intel = generateIntelligenceReport(storedReport, input);

  const confidenceLevelMap: Record<string, string> = {
    exact: "Exact Product Match", family: "Product Family Match",
    category: "Category Match", industry: "Industry Match",
    keyword: "Keyword Match", none: "No Match",
  };

  const formattedDate = new Date(request.created_at).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const allSources = [
    ...intel.interests.slice(0, 4).map((i) => ({ name: i.name, source: i.source, tier: i.tier })),
    ...intel.behaviors.slice(0, 3).map((b) => ({ name: b.metaAudience, source: b.source })),
    ...intel.personas.slice(0, 2).map((p) => ({ name: p.name, source: (p as unknown as Record<string,unknown>)["source"] as string ?? "Customer Persona Database" })),
    ...intel.demographics.slice(0, 2).map((d) => ({ name: d.name, source: d.source })),
    ...(storedReport.industry ? [{ name: storedReport.industry, source: "Industry Intelligence Database" }] : []),
    ...(storedReport.productFamily ? [{ name: storedReport.productFamily, source: "Product Family Database" }] : []),
  ];

  return (
    <AppShell
      firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin}
      activeLabel="Meta Ads Interest Finder"
      headerRight={
        <Link href="/analysis/new"
          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg px-3 py-2 hover:bg-primary-dim transition-colors">
          <Zap size={13} />
          <span className="hidden sm:inline">New Search</span>
        </Link>
      }
    >
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
      {/* Breadcrumb */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors mb-8 group print:hidden">
        <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />Dashboard
      </Link>

      {/* ── HEADER ── */}
      <div className="flex flex-col lg:flex-row items-start justify-between gap-8 mb-6">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-xs tracking-[3px] uppercase text-primary mb-2">Audience Intelligence Report · Module 5</p>
          <h1 className="text-3xl lg:text-4xl font-heading font-bold text-text-primary leading-tight mb-3">
            {request.product_name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge variant="green">{storedReport.industry}</Badge>
            <Badge variant="blue">{storedReport.productFamily || storedReport.productType}</Badge>
            <Badge variant="muted">{request.business_type}</Badge>
            <Badge variant="muted">{request.objective}</Badge>
            <Badge variant="muted">{request.country}</Badge>
            <Badge variant={request.status === "completed" ? "green" : "amber"}>{request.status}</Badge>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-text-muted font-mono">
            <span>ID: {id.slice(0, 8)}…</span>
            <span>{formattedDate}</span>
            <span>{confidenceLevelMap[storedReport.matchConfidenceLevel] ?? "—"}</span>
          </div>
          {/* Global evidence */}
          <div className="mt-4">
            <EvidenceList evidence={intel.globalEvidence} size="sm" />
          </div>
        </div>
        <div className="flex-none">
          <ConfidenceRing score={intel.weightedConfidence.overall} size={160} animated />
        </div>
      </div>

      {/* ── EXECUTIVE SUMMARY ── */}
      <div className="bg-surface border border-primary/25 rounded-2xl p-6 mb-4">
        <p className="font-mono text-[10px] tracking-[2px] uppercase text-primary mb-3">Executive Summary</p>
        <p className="text-text-primary leading-relaxed text-[15px]">{storedReport.executiveSummary}</p>
        {storedReport.audienceInsight && (
          <p className="text-text-secondary leading-relaxed text-sm mt-4 pt-4 border-t border-border">{storedReport.audienceInsight}</p>
        )}
      </div>

      {/* ── NAV TO STRATEGY ── */}
      <div className="flex flex-wrap gap-3 mb-4 print:hidden">
        <Button variant="ghost" size="sm" asChild className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
          <Link href={`/analysis/${id}`}><Zap size={14} />Audience Report</Link>
        </Button>
        <Button size="sm" asChild className="gap-2">
          <Link href={`/analysis/${id}/strategy`}>Campaign Strategy →</Link>
        </Button>
      </div>

      {/* ── TAXONOMY STRIP ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {[
          { label: "Industry",       value: storedReport.industry || "—" },
          { label: "Sector",         value: storedReport.sector || "—" },
          { label: "Category",       value: storedReport.category || "—" },
          { label: "Sub-Category",   value: storedReport.subCategory || "—" },
          { label: "Product Family", value: storedReport.productFamily || "—" },
        ].map(({ label, value }) => (
          <StatCard key={label} label={label} value={value} />
        ))}
      </div>

      {/* ── PRODUCT RELATIONSHIP PATH ── */}
      <div className="bg-surface border border-border rounded-2xl p-6 mb-4">
        <RelationshipPathDisplay path={intel.productRelationshipPath} />
      </div>

      {/* ── WEIGHTED CONFIDENCE ── */}
      <div className="mb-4">
        <WeightedConfidenceDisplay confidence={intel.weightedConfidence} />
      </div>

      {/* ── SECTIONS ── */}
      <div className="flex flex-col gap-3">

        {/* SECTION: Interests (enhanced, expandable) */}
        {intel.expansionGroups.map((group) => (
          <ReportSection
            key={group.tier}
            label={group.label}
            icon={group.tier === "Primary" ? "🎯" : group.tier === "Secondary" ? "🔵" : "🟡"}
            badge={group.interests.length}
            defaultOpen={group.tier === "Primary"}
            accent={group.tier === "Primary" ? "green" : group.tier === "Secondary" ? "blue" : "amber"}
          >
            <div className="pt-4 space-y-2">
              <p className="text-xs text-text-secondary mb-4 leading-relaxed">{group.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {group.interests.map((interest) => (
                  <EnhancedInterestCard key={interest.name} interest={interest} />
                ))}
              </div>
              <p className="text-[10px] font-mono text-text-muted pt-2">
                Estimated reach: {group.totalReach}
              </p>
            </div>
          </ReportSection>
        ))}

        {/* SECTION: Behaviors */}
        <ReportSection label="Recommended Behaviors" icon="⚡" badge={intel.behaviors.length} defaultOpen>
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {intel.behaviors.map((b, i) => <EnhancedBehaviorCard key={i} behavior={b} />)}
          </div>
        </ReportSection>

        {/* SECTION: Demographics */}
        <ReportSection label="Recommended Demographics" icon="📊" badge={intel.demographics.length}>
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {intel.demographics.map((d, i) => <EnhancedDemographicCard key={i} demographic={d} />)}
          </div>
        </ReportSection>

        {/* SECTION: Personas */}
        <ReportSection label="Customer Personas" icon="👥" badge={intel.personas.length} defaultOpen>
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {intel.personas.map((p, i) => <EnhancedPersonaCard key={i} persona={p} rank={i + 1} />)}
          </div>
        </ReportSection>

        {/* SECTION: Targeting Stack */}
        <ReportSection label="Complete Targeting Stack" icon="🎯" accent="blue" defaultOpen>
          <div className="pt-4">
            <TargetingStackDisplay stack={intel.targetingStack} />
          </div>
        </ReportSection>

        {/* SECTION: Campaign Strategy */}
        <ReportSection label="Campaign Strategy" icon="📈" accent="blue">
          <div className="pt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { k: "Campaign Objective", v: storedReport.campaignObjective, sub: storedReport.objectiveStrategy },
                { k: "Audience Strategy",  v: storedReport.audienceStrategy,  sub: `Best for: ${storedReport.audienceStrategyBestFor}` },
                { k: "Funnel Stage",       v: storedReport.funnelStage,       sub: `Recommended objective: ${storedReport.recommendedObjective}` },
                { k: "Creative Format",    v: storedReport.bestCreativeFormat, sub: `Focus: ${storedReport.creativeFocus}` },
              ].map((item) => (
                <div key={item.k} className="bg-[#F8FAFC] border border-secondary/20 rounded-sm p-4">
                  <p className="font-mono text-[9px] tracking-[2px] uppercase text-secondary mb-1">{item.k}</p>
                  <p className="font-heading font-semibold text-text-primary mb-1">{item.v}</p>
                  {item.sub && <p className="text-xs text-text-muted leading-relaxed">{item.sub}</p>}
                </div>
              ))}
            </div>
            {storedReport.placements.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[2px] text-text-muted mb-3">Suggested Placements</p>
                <div className="flex flex-wrap gap-2">
                  {storedReport.placements.map((p) => (
                    <span key={p} className="px-3 py-1.5 rounded-full text-xs font-mono bg-surface-2 text-text-secondary border border-border">{p}</span>
                  ))}
                </div>
              </div>
            )}
            {storedReport.creativeHooks.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[2px] text-text-muted mb-3">Proven Ad Hooks</p>
                <div className="space-y-2">
                  {storedReport.creativeHooks.map((h, i) => (
                    <div key={i} className="flex items-start gap-3 bg-[#F8FAFC] border border-amber/15 rounded-sm px-4 py-3">
                      <span className="font-mono text-[10px] text-amber font-bold mt-0.5 flex-none">{String(i+1).padStart(2,"0")}</span>
                      <p className="text-sm text-text-primary">{h}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ReportSection>

        {/* SECTION: Creative Concept Library */}
        <ReportSection
          label="Creative Concept Library"
          icon="✨"
          accent="blue"
          badge={(result.ai_enrichment?.creativeConceptLibrary ?? []).length || undefined}
        >
          <CreativeConceptSection
            concepts={result.ai_enrichment?.creativeConceptLibrary}
            testingStructure={result.ai_enrichment?.campaignStrategy?.testingStructure}
            pending={result.explainability?.aiEnrichmentPending}
          />
        </ReportSection>

        {/* SECTION: Psychology */}
        <ReportSection label="Customer Psychology" icon="🧠">
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { label: "Customer Goals", items: storedReport.customerGoals, color: "text-primary" },
              { label: "Buying Motivations", items: storedReport.buyingMotivations, color: "text-secondary" },
              { label: "Messaging Angles", items: storedReport.messagingAngles, color: "text-amber" },
            ].map(({ label, items, color }) => (
              <div key={label}>
                <p className={`font-mono text-[10px] uppercase tracking-[2px] mb-3 ${color}`}>{label}</p>
                <ul className="space-y-2">
                  {items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className={`${color} mt-0.5 flex-none`}>→</span>{item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* SECTION: Why These Audiences */}
        <ReportSection label="Why These Audiences Were Selected" icon="🔍">
          <div className="pt-4 space-y-4">
            <p className="text-sm text-text-secondary leading-relaxed">{storedReport.whyThisAudience}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Keywords Matched",  value: storedReport.matchedKeywordCount },
                { label: "Interests Found",   value: storedReport.interests.length },
                { label: "Behaviors Found",   value: storedReport.behaviors.length },
                { label: "Personas Matched",  value: storedReport.personas.length },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#F8FAFC] border border-border rounded-sm p-3 text-center">
                  <p className="text-2xl font-heading font-bold text-primary">{value}</p>
                  <p className="font-mono text-[9px] uppercase tracking-wider text-text-muted mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </ReportSection>

        {/* SECTION: Recommendation Sources */}
        <ReportSection label="Recommendation Sources" icon="📚">
          <div className="pt-4">
            <p className="text-xs text-text-muted mb-4">Every recommendation in this report is sourced from a verified database. No audiences were invented.</p>
            <div className="divide-y divide-border">
              {allSources.map((s, i) => (
                <SourceRow key={i} name={s.name} source={s.source} tier={"tier" in s ? s.tier as "primary" | "secondary" | "expansion" : undefined} />
              ))}
            </div>
          </div>
        </ReportSection>

        {/* SECTION: Optimization */}
        <ReportSection label="Optimization Tips" icon="⚙️">
          <div className="pt-4 space-y-2">
            {storedReport.optimizationTips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 bg-[#F8FAFC] border border-border rounded-sm px-4 py-3">
                <span className="font-mono text-[10px] text-primary font-bold mt-0.5 flex-none">{String(i+1).padStart(2,"0")}</span>
                <p className="text-sm text-text-secondary leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </ReportSection>

        {/* SECTION: Export */}
        <ExportToolbar
          request={request as Record<string, unknown>}
          result={result as Record<string, unknown>}
          productName={request.product_name as string}
        />
      </div>

      {/* Bottom CTA */}
      <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface border border-border rounded-2xl p-6 print:hidden">
        <div>
          <p className="font-heading font-semibold text-text-primary mb-1">Run another analysis?</p>
          <p className="text-sm text-text-secondary">Build more reports to refine your targeting intelligence.</p>
        </div>
        <Button asChild size="lg" className="gap-2 flex-none">
          <Link href="/analysis/new"><Zap size={16} />New Analysis</Link>
        </Button>
      </div>

      <p className="text-center text-xs text-text-muted font-mono mt-8 print:hidden">
        Smarkin AI Module 5 · Evidence Engine · Confidence Engine · Relationship Engine · {storedReport.interests.length} verified interests · {storedReport.behaviors.length} verified behaviors
      </p>
      </div>
    </AppShell>
  );
}
