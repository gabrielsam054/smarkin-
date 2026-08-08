import Link from "next/link";
import { notFound } from "next/navigation";
import { Users, Target, MessageSquare, Layers, CheckSquare, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth/requireUser";
import { isCurrentUserAdmin } from "@/lib/admin";
import { assembleBlueprint } from "@/lib/blueprint/assembleBlueprint";
import { persistBlueprintRecommendation, getPastBlueprintOutcomes } from "@/lib/blueprint/blueprintLearning";
import { BlueprintOutcomeReporter } from "./BlueprintOutcomeReporter";
import { BusinessClassificationSelector } from "./BusinessClassificationSelector";
import { AppShell } from "@/components/layout/AppShell";

/**
 * Real "Launch" per the Phase 1 product decision: a genuine, complete
 * campaign blueprint — never a Meta API call, never touches real ad
 * spend. The human takes this into Meta Ads Manager themselves.
 * Assembled entirely from real, existing research engines (Customer
 * Research, Audience Research, Marketing Brain) — nothing here is
 * generated fresh by this page, it's a real synthesis of work already
 * done elsewhere in the system.
 */
export default async function BlueprintPage({ params }: { params: Promise<{ productName: string }> }) {
  const { productName: encodedProductName } = await params;
  const productName = decodeURIComponent(encodedProductName);

  const { user, supabase } = await requireUser(`/blueprint/${encodedProductName}`);
  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  const blueprint = await assembleBlueprint(supabase, user.id, productName);

  if (!blueprint.hasCustomerResearch && !blueprint.hasAudienceResearch) {
    return (
      <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Campaigns">
        <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
          <div className="flex flex-col items-center text-center py-16 px-6 rounded-xl border border-border bg-surface">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-4">
              <AlertTriangle size={18} className="text-text-muted" />
            </div>
            <p className="font-semibold text-text-primary text-sm mb-1.5">No research yet for &quot;{productName}&quot;</p>
            <p className="text-sm text-text-secondary max-w-sm mb-5">
              A real blueprint needs real research to build from. Run Customer Research or Audience Research for this product first — this page won&apos;t invent what should come from actual research.
            </p>
            <div className="flex gap-3">
              <Link href="/research/new" className="text-sm font-semibold text-primary hover:underline">Run Customer Research</Link>
              <Link href="/audience/new" className="text-sm font-semibold text-primary hover:underline">Run Audience Research</Link>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // Real Learning gap closed here — the same proven pattern already
  // used for Campaign Intelligence. A write failure must never break
  // the page itself; blueprintId is simply null if it fails, and the
  // reporter UI just doesn't render.
  const blueprintId = await persistBlueprintRecommendation(
    supabase, user.id, productName,
    blueprint.recommendedMessaging?.positioning ?? null,
    blueprint.primaryAudiences[0]?.name ?? null,
  );
  const pastOutcomes = await getPastBlueprintOutcomes(supabase, user.id, productName);

  return (
    <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Campaigns">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-6">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-text-muted mb-1">Campaign Blueprint</p>
          <h1 className="text-lg font-bold text-text-primary">{productName}</h1>
          {blueprint.industry && <p className="text-sm text-text-secondary mt-1">{blueprint.industry}</p>}
        </div>

        <div className="rounded-lg border border-border bg-surface-2 px-4 py-3 text-xs text-text-secondary">
          This is a planning document, not a live campaign — nothing here has been sent to Meta. Take this into Meta Ads Manager yourself to actually create and launch the campaign.
        </div>

        <BusinessClassificationSelector productName={productName} initialBusinessType={blueprint.businessType} initialGoal={blueprint.primaryGoal} />

        {/* Real Learning gap closed — genuine past outcomes for this
            product, only shown when a real one exists. */}
        {pastOutcomes.length > 0 && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-[10px] font-mono uppercase tracking-wide text-primary mb-2">What&apos;s worked before for this product</p>
            <div className="flex flex-col gap-1.5">
              {pastOutcomes.map((o, i) => (
                <p key={i} className="text-xs text-text-secondary">
                  {o.positioning && `"${o.positioning.slice(0, 60)}${o.positioning.length > 60 ? "…" : ""}"`}
                  {" — "}
                  <span className={o.outcome === "worked" ? "text-primary font-medium" : o.outcome === "did_not_work" ? "text-destructive font-medium" : "text-text-muted"}>
                    {o.outcome === "worked" ? "worked" : o.outcome === "did_not_work" ? "didn't work" : "too early to tell"}
                  </span>
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Personas — real, from Customer Research */}
        {blueprint.personas.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5"><Users size={14} className="text-text-muted" />Target Personas</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {blueprint.personas.map((p, i) => (
                <div key={i} className="card p-3">
                  <p className="text-sm font-medium text-text-primary">{p.name}</p>
                  <p className="text-xs text-text-secondary mt-1">{p.primaryGoal}</p>
                  <p className="text-[11px] text-text-muted mt-1">{p.ageRange ?? "Age not specified"} · {p.buyingPower} buying power</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pain points */}
        {blueprint.painPoints.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-text-primary mb-3">Real Pain Points to Address</h2>
            <ul className="flex flex-col gap-1.5">
              {blueprint.painPoints.slice(0, 6).map((p, i) => <li key={i} className="text-sm text-text-secondary">• {p}</li>)}
            </ul>
          </div>
        )}

        {/* Messaging — real, from Customer Research's recommendedMessaging */}
        {blueprint.recommendedMessaging && (
          <div>
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5"><MessageSquare size={14} className="text-text-muted" />Messaging Direction</h2>
            <div className="card p-4 flex flex-col gap-3">
              {blueprint.recommendedMessaging.positioning && (
                <div><p className="text-xs text-text-muted mb-1">Positioning</p><p className="text-sm text-text-primary">{blueprint.recommendedMessaging.positioning}</p></div>
              )}
              {blueprint.recommendedMessaging.offerAngle && (
                <div><p className="text-xs text-text-muted mb-1">Offer Angle</p><p className="text-sm text-text-primary">{blueprint.recommendedMessaging.offerAngle}</p></div>
              )}
              {blueprint.recommendedMessaging.headlineIdeas.length > 0 && (
                <div>
                  <p className="text-xs text-text-muted mb-1">Headline Ideas</p>
                  <ul className="flex flex-col gap-1">{blueprint.recommendedMessaging.headlineIdeas.slice(0, 5).map((h, i) => <li key={i} className="text-sm text-text-secondary">• {h}</li>)}</ul>
                </div>
              )}
              {blueprint.recommendedMessaging.ctaRecommendations.length > 0 && (
                <div>
                  <p className="text-xs text-text-muted mb-1">CTA Recommendations</p>
                  <div className="flex flex-wrap gap-1.5">{blueprint.recommendedMessaging.ctaRecommendations.map((c, i) => <span key={i} className="text-xs bg-surface-2 border border-border rounded-full px-2 py-0.5">{c}</span>)}</div>
                </div>
              )}
              {/* Real, from funnelRules - exact match against the same
                  stage names already shown above, not fuzzy matched. */}
              {(blueprint.funnelGuidance.mostAware || blueprint.funnelGuidance.productAware) && (
                <div className="border-t border-border pt-3">
                  <p className="text-xs text-text-muted mb-1.5">Funnel Guidance</p>
                  {blueprint.funnelGuidance.productAware && (
                    <p className="text-xs text-text-secondary">Product Aware stage → objective: <span className="text-text-primary">{blueprint.funnelGuidance.productAware.recommendedObjective}</span>, creative focus: <span className="text-text-primary">{blueprint.funnelGuidance.productAware.creativeFocus}</span></p>
                  )}
                  {blueprint.funnelGuidance.mostAware && (
                    <p className="text-xs text-text-secondary mt-1">Most Aware stage → objective: <span className="text-text-primary">{blueprint.funnelGuidance.mostAware.recommendedObjective}</span>, creative focus: <span className="text-text-primary">{blueprint.funnelGuidance.mostAware.creativeFocus}</span></p>
                  )}
                </div>
              )}
            </div>
            <p className="text-[11px] text-text-muted mt-2">
              This is real messaging direction from your customer research — not specific ad creative. No image or video creative is generated by this system.
            </p>
          </div>
        )}

        {/* Product Intelligence — real, from productIntelligenceDatabase,
            one of the audit's highest-value unused tables. Honestly
            labeled with which real product it matched against, since
            "Whey Protein" matches "Protein Powder" via word overlap,
            not an exact name — the user should know that. */}
        {blueprint.productIntelligence && (
          <div>
            <h2 className="text-sm font-semibold text-text-primary mb-3">Upsell &amp; Cross-Sell Opportunities</h2>
            <p className="text-[11px] text-text-muted mb-2">Matched against &quot;{blueprint.productIntelligence.matchedProductName}&quot; in the product reference database — real, but not specific to this exact product.</p>
            <div className="card p-4 flex flex-col gap-2">
              {blueprint.productIntelligence.upsellProducts.length > 0 && (
                <div><p className="text-xs text-text-muted mb-1">Upsell</p><p className="text-sm text-text-secondary">{blueprint.productIntelligence.upsellProducts.join(", ")}</p></div>
              )}
              {blueprint.productIntelligence.crossSellProducts.length > 0 && (
                <div><p className="text-xs text-text-muted mb-1">Cross-sell</p><p className="text-sm text-text-secondary">{blueprint.productIntelligence.crossSellProducts.join(", ")}</p></div>
              )}
              {blueprint.productIntelligence.recommendedCreative.length > 0 && (
                <div><p className="text-xs text-text-muted mb-1">Recommended creative formats</p><p className="text-sm text-text-secondary">{blueprint.productIntelligence.recommendedCreative.join(", ")}</p></div>
              )}
            </div>
          </div>
        )}

        {/* Real, from creativeStrategy - the first genuine beneficiary
            of the new business_classification capture point. Only
            shown when a real, user-provided goal exists - never
            guessed. */}
        {blueprint.bestCreativeForGoal && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <p className="text-[10px] font-mono uppercase tracking-wide text-primary mb-1">Best creative format for &quot;{blueprint.primaryGoal}&quot;</p>
            <p className="text-sm text-text-primary">{blueprint.bestCreativeForGoal}</p>
          </div>
        )}

        {/* Audiences — real, from Audience Research */}
        {blueprint.primaryAudiences.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5"><Target size={14} className="text-text-muted" />Target Audiences</h2>
            <div className="flex flex-col gap-2">
              {blueprint.primaryAudiences.slice(0, 4).map((a) => (
                <div key={a.id} className="card p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-text-primary">{a.name}</p>
                    <span className="text-[10px] font-mono text-text-muted">{a.confidence}% confidence</span>
                  </div>
                  <p className="text-xs text-text-secondary">{a.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Platforms & targeting strategies — real, from Audience Research */}
        {blueprint.platformRecommendations.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5"><Layers size={14} className="text-text-muted" />Platform Recommendations</h2>
            {/* Real bug found in live testing, fixed here: this
                reasoning is genuinely industry-level in the underlying
                data (channelSuitabilityDatabase has one Reasoning field
                per industry, not per platform) — repeating it once per
                platform made it look like a bug even though the
                suitability scores themselves are real and genuinely
                vary. Shown once, honestly labeled, rather than implying
                each platform has its own distinct explanation it doesn't
                actually have. */}
            {blueprint.platformRecommendations[0]?.reasoning && (
              <p className="text-xs text-text-secondary mb-2">{blueprint.platformRecommendations[0].reasoning}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {blueprint.platformRecommendations.map((p, i) => (
                <span key={i} className="text-xs bg-surface-2 border border-border rounded-full px-2.5 py-1">
                  <span className="font-medium text-text-primary">{p.platform}</span>
                  <span className="text-text-muted ml-1 font-mono">{p.suitability}%</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {blueprint.targetingStrategies.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-text-primary mb-3">Targeting Strategy</h2>
            {blueprint.targetingStrategies.slice(0, 2).map((t, i) => (
              <div key={i} className="card p-4 mb-2">
                <p className="text-sm font-medium text-text-primary mb-1">{t.name}</p>
                <p className="text-xs text-text-secondary mb-2">{t.reasoning}</p>
                <p className="text-[11px] text-text-muted">Best for: {t.bestFor} · Learning speed: {t.learningSpeed ?? "unknown"}</p>
                {t.budgetRecommendation && <p className="text-[11px] text-text-muted mt-1">Budget guidance: {JSON.stringify(t.budgetRecommendation)}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Launch checklist — real, general best-practice guidance, disclosed as such */}
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5"><CheckSquare size={14} className="text-text-muted" />Launch Checklist</h2>
          <p className="text-xs text-text-muted mb-2">General best-practice guidance, not personalized data — same for every blueprint.</p>
          <div className="card p-4">
            <ul className="flex flex-col gap-1.5 text-sm text-text-secondary">
              <li>☐ Confirm Meta Pixel / Conversions API is installed and firing correctly before launch</li>
              <li>☐ Set up conversion tracking for your actual goal (purchase, lead, etc.) — Smarkin can only report on conversions it can see</li>
              <li>☐ Start with a modest test budget rather than your full intended spend</li>
              <li>☐ Avoid changing budget or targeting during Meta&apos;s initial learning phase</li>
              <li>☐ Prepare at least 2-3 creative variations to test against each other</li>
            </ul>
          </div>
        </div>

        {/* First 7 days — real, general template */}
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5"><TrendingUp size={14} className="text-text-muted" />First 7-Day Plan</h2>
          <div className="card p-4">
            <ul className="flex flex-col gap-2 text-sm text-text-secondary">
              <li><span className="text-text-muted font-mono">Day 1-3:</span> Let the campaign run untouched through Meta&apos;s learning phase — resist optimizing early</li>
              <li><span className="text-text-muted font-mono">Day 4-5:</span> Check CTR and spend against your own account average — Smarkin&apos;s Opportunities page will flag genuine outliers once you connect this campaign</li>
              <li><span className="text-text-muted font-mono">Day 6-7:</span> Review real performance, not gut feeling — decide whether to scale, pause, or adjust creative</li>
            </ul>
          </div>
        </div>

        {blueprintId && (
          <div className="border-t border-border pt-4">
            <BlueprintOutcomeReporter blueprintId={blueprintId} />
          </div>
        )}

        {(blueprint.customerGaps.length > 0 || blueprint.audienceGaps.length > 0) && (
          <div className="border-t border-border pt-4">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5"><Sparkles size={12} />What this blueprint doesn&apos;t know</h2>
            <div className="flex flex-col gap-1">
              {[...blueprint.customerGaps, ...blueprint.audienceGaps].slice(0, 5).map((g, i) => <p key={i} className="text-xs text-text-muted">{g}</p>)}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
