/**
 * Smarkin AI — Module 6: AI Campaign Strategy Engine
 * Generates a complete Meta advertising strategy from existing database results.
 * Zero AI API calls. 100% database-driven.
 */
import DB from "./smarkin-db.json";
import type { AudienceReport, AnalysisInput } from "./engine";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CampaignObjectiveRec {
  objective: string;
  confidence: number;
  reason: string;
  strategy: string;
  source: string;
}

export interface FunnelStageRec {
  stage: string;
  creativeFocus: string;
  recommendedObjective: string;
  explanation: string;
  isCurrent: boolean;
}

export interface AdSet {
  id: string;
  name: string;
  primaryInterest: string;
  secondaryInterest: string;
  behavior: string;
  persona: string;
  ageRange: string;
  gender: string;
  location: string;
  audienceQuality: number;
  relationshipScore: number;
  confidence: number;
  audienceStrategy: string;
}

export interface CampaignStructure {
  campaignName: string;
  objective: string;
  adSets: AdSet[];
}

export interface CreativeTypeRec {
  type: string;
  reason: string;
  isRecommended: boolean;
  bestFor: string;
}

export interface CreativeAngle {
  title: string;
  emotion: string;
  painPoint: string;
  desiredOutcome: string;
  hookExample: string;
}

export interface Hook {
  text: string;
  type: "primary" | "alternative";
  emotion: string;
}

export interface CTARec {
  text: string;
  effectiveness: number;
  bestFor: string;
}

export interface OfferRec {
  offer: string;
  type: string;
  conversionLikelihood: number;
  reason: string;
}

export interface AdCopy {
  type: string;
  label: string;
  text: string;
  maxLength?: number;
}

export interface VideoIdea {
  title: string;
  type: string;
  openingHook: string;
  scenes: string[];
  endingCTA: string;
}

export interface ImageIdea {
  title: string;
  type: string;
  description: string;
  tip: string;
}

export interface BudgetRec {
  phase: string;
  dailyBudget: string;
  duration: string;
  totalBudget: string;
  reason: string;
}

export interface MetricGuide {
  metric: string;
  condition: string;
  recommendation: string;
  benchmark: string;
}

export interface ChecklistItem {
  id: string;
  item: string;
  category: string;
  required: boolean;
  checked: boolean;
}

export interface ScoreComponent {
  name: string;
  score: number;
  maxScore: number;
  reason: string;
}

export interface AIRecommendation {
  priority: string;
  quickWins: string[];
  potentialRisks: string[];
  optimizationOpportunities: string[];
}

export interface CampaignStrategy {
  executiveSummary: string;

  // Section 2
  objectiveRec: CampaignObjectiveRec;

  // Section 3
  funnelStages: FunnelStageRec[];

  // Section 4
  campaignStructure: CampaignStructure;

  // Section 5
  creativeTypes: CreativeTypeRec[];

  // Section 6
  creativeAngles: CreativeAngle[];

  // Section 7
  hooks: Hook[];

  // Section 8
  ctas: CTARec[];

  // Section 9
  offers: OfferRec[];

  // Section 10
  adCopy: AdCopy[];

  // Section 11
  videoIdeas: VideoIdea[];

  // Section 12
  imageIdeas: ImageIdea[];

  // Section 14
  budgets: BudgetRec[];

  // Section 15
  metricGuides: MetricGuide[];

  // Section 16
  checklist: ChecklistItem[];

  // Section 17
  campaignScore: number;
  scoreComponents: ScoreComponent[];

  // Section 18
  aiRecommendations: AIRecommendation;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

// ── Section 2: Campaign Objective ────────────────────────────────────────────

function buildObjectiveRec(report: AudienceReport, input: AnalysisInput): CampaignObjectiveRec {
  const objRow = (DB.campaignObjectiveDatabase as Row[]).find(
    (o) => str(o["Campaign Objective"]).toLowerCase() === (input.objective ?? "Sales").toLowerCase()
  ) ?? DB.campaignObjectiveDatabase[0] as Row;

  const industryRow = (DB.industries as Row[]).find(
    (i) => str(i["Industry Name"]).toLowerCase() === report.industry.toLowerCase()
  );

  const topInterestCount = report.interests.filter((i) => i.tier === "primary").length;
  const behaviorCount = report.behaviors.length;
  // Use extended keyword data for richer objective recommendation
  const kwRow = (DB.keywordMappingDatabase as Row[]).find(
    (k) => k["Normalized Keyword"] && 
      report.productFamily.toLowerCase().includes(str(k["Normalized Keyword"]).toLowerCase())
  );
  const kwBuyerIntent = str(kwRow?.["Buyer Intent"] ?? "");
  const kwSearchIntent = str(kwRow?.["Search Intent Type"] ?? "");

  const confidence = Math.min(99,
    70 +
    (topInterestCount >= 5 ? 10 : topInterestCount * 2) +
    (behaviorCount >= 5 ? 10 : behaviorCount * 2) +
    (report.overallScore >= 80 ? 9 : Math.floor(report.overallScore / 10))
  );

  const reasons = [
    topInterestCount >= 5 ? `${topInterestCount} high-intent interests matched` : null,
    behaviorCount >= 4 ? `${behaviorCount} verified Meta behaviors identified` : null,
    industryRow ? `Typical ${str(industryRow["Industry Name"])} objective: ${str(industryRow["Typical Campaign Objectives"])}` : null,
    report.personas.length > 0 ? `Primary persona "${report.personas[0].name}" is ${(input.objective ?? "Sales").toLowerCase()}-oriented` : null,
    kwBuyerIntent ? `Keyword database buyer intent: ${kwBuyerIntent}` : null,
    kwSearchIntent ? `Keyword search intent: ${kwSearchIntent}` : null,
  ].filter(Boolean);

  return {
    objective: str(objRow["Campaign Objective"]),
    confidence,
    reason: reasons.join(". ") || str(objRow["AI Strategy"]),
    strategy: str(objRow["AI Strategy"]),
    source: "Campaign Objective Database",
  };
}

// ── Section 3: Funnel Stages ─────────────────────────────────────────────────

function buildFunnelStages(report: AudienceReport): FunnelStageRec[] {
  return (DB.funnelRules as Row[]).map((row) => {
    const stage = str(row["Awareness Stage"]);
    const isCurrent = stage === report.funnelStage;

    const explanations: Record<string, string> = {
      "Unaware": "The audience doesn't know they have a problem. Focus on education and broad reach.",
      "Problem Aware": "The audience knows they have a problem but doesn't know your solution. Explain the problem clearly.",
      "Solution Aware": "The audience is looking for solutions. Demonstrate why yours is best.",
      "Product Aware": "The audience knows your product but hasn't bought. Highlight benefits and social proof.",
      "Most Aware": "The audience is ready to buy. A strong offer and clear CTA will convert them.",
    };

    return {
      stage,
      creativeFocus: str(row["Creative Focus"]),
      recommendedObjective: str(row["Recommended Objective"]),
      explanation: explanations[stage] ?? str(row["Creative Focus"]),
      isCurrent,
    };
  });
}

// ── Section 4: Campaign Structure ────────────────────────────────────────────

function buildCampaignStructure(
  report: AudienceReport,
  input: AnalysisInput
): CampaignStructure {
  const primary   = report.interests.filter((i) => i.tier === "primary");
  const secondary = report.interests.filter((i) => i.tier === "secondary");
  const expansion = report.interests.filter((i) => i.tier === "expansion");
  const strategies = DB.audienceStrategies as Row[];

  const adSets: AdSet[] = [
    {
      id: "adset-1",
      name: `${input.country !== "Worldwide" ? input.country + " | " : ""}${primary[0]?.name ?? "Primary"} | ${input.objective}`,
      primaryInterest: primary[0]?.name ?? "Top interest",
      secondaryInterest: primary[1]?.name ?? secondary[0]?.name ?? "—",
      behavior: report.behaviors[0]?.metaAudience ?? "—",
      persona: report.personas[0]?.name ?? "—",
      ageRange: "25–44",
      gender: "All",
      location: (input.country ?? "Worldwide") !== "Worldwide" ? (input.country ?? "Worldwide") : "Worldwide",
      audienceQuality: Math.min(99, report.overallScore + 5),
      relationshipScore: 95,
      confidence: report.overallScore,
      audienceStrategy: str(strategies[0]?.Strategy),
    },
    {
      id: "adset-2",
      name: `${secondary[0]?.name ?? "Secondary"} | Broad`,
      primaryInterest: secondary[0]?.name ?? "Secondary interest",
      secondaryInterest: secondary[1]?.name ?? expansion[0]?.name ?? "—",
      behavior: report.behaviors[1]?.metaAudience ?? report.behaviors[0]?.metaAudience ?? "—",
      persona: report.personas[1]?.name ?? report.personas[0]?.name ?? "—",
      ageRange: "18–54",
      gender: "All",
      location: (input.country ?? "Worldwide") !== "Worldwide" ? (input.country ?? "Worldwide") : "Worldwide",
      audienceQuality: Math.min(99, report.overallScore - 3),
      relationshipScore: 82,
      confidence: Math.max(60, report.overallScore - 8),
      audienceStrategy: str(strategies[0]?.Strategy),
    },
    {
      id: "adset-3",
      name: `Expansion | Lookalike Scaling`,
      primaryInterest: expansion[0]?.name ?? secondary[2]?.name ?? "Expansion interest",
      secondaryInterest: expansion[1]?.name ?? "—",
      behavior: report.behaviors[2]?.metaAudience ?? "—",
      persona: report.personas[2]?.name ?? report.personas[0]?.name ?? "—",
      ageRange: "18–65",
      gender: "All",
      location: (input.country ?? "Worldwide") !== "Worldwide" ? (input.country ?? "Worldwide") : "Worldwide",
      audienceQuality: Math.min(99, report.overallScore - 8),
      relationshipScore: 70,
      confidence: Math.max(55, report.overallScore - 15),
      audienceStrategy: str(strategies[1]?.Strategy),
    },
  ];

  return {
    campaignName: `Smarkin | ${report.productFamily || input.productName} | ${input.objective}`,
    objective: input.objective ?? "Sales",
    adSets,
  };
}

// ── Section 5: Creative Types ─────────────────────────────────────────────────

function buildCreativeTypes(report: AudienceReport, input: AnalysisInput): CreativeTypeRec[] {
  const recommendedFormat = report.bestCreativeFormat?.toLowerCase() ?? "product demonstration";

  const allTypes = [
    { type: "Product Demonstration", bestFor: "High-intent buyers comparing solutions" },
    { type: "Lifestyle", bestFor: "Awareness and aspiration-driven audiences" },
    { type: "UGC (User Generated Content)", bestFor: "Trust-building and social proof" },
    { type: "Before & After", bestFor: "Problem/solution positioning" },
    { type: "Comparison", bestFor: "Competitive markets where buyers evaluate options" },
    { type: "Problem/Solution", bestFor: "Problem-aware audiences" },
    { type: "Testimonial", bestFor: "Lead generation and consideration phase" },
    { type: "Educational", bestFor: "Awareness campaigns and thought leadership" },
  ];

  return allTypes.map((t) => {
    const isRec = t.type.toLowerCase().includes(recommendedFormat) ||
      recommendedFormat.includes(t.type.toLowerCase().split(" ")[0]);
    return {
      ...t,
      isRecommended: isRec,
      reason: isRec
        ? `Recommended based on "${input.objective}" objective and ${report.funnelStage} funnel stage`
        : `Alternative for testing in future ad sets`,
    };
  }).sort((a, b) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0));
}

// ── Section 6: Creative Angles ────────────────────────────────────────────────

function buildCreativeAngles(
  report: AudienceReport,
  input: AnalysisInput
): CreativeAngle[] {
  const persona = report.personas[0];
  const problem = report.problems[0];
  const goals   = report.customerGoals;
  const product = input.productName;

  const angles: CreativeAngle[] = [
    {
      title: "Problem → Solution",
      emotion: "Relief",
      painPoint: problem?.problem ?? `Struggling to find the right ${product}`,
      desiredOutcome: goals[0] ?? `Get the best ${product} for your needs`,
      hookExample: `Tired of ${(problem?.problem ?? "this problem").toLowerCase()}? We fixed it.`,
    },
    {
      title: "Aspiration & Lifestyle",
      emotion: "Desire",
      painPoint: `Missing out on a better life experience`,
      desiredOutcome: goals[1] ?? `Live better with ${product}`,
      hookExample: `Imagine waking up every day with ${product} working for you.`,
    },
    {
      title: "Social Proof & Trust",
      emotion: "Trust",
      painPoint: `Uncertain about which brand to trust`,
      desiredOutcome: `Feel confident in your purchase`,
      hookExample: `Join ${persona ? "thousands of " + persona.name + "s" : "our community"} who already made the switch.`,
    },
    {
      title: "Value & Savings",
      emotion: "Smart buyer satisfaction",
      painPoint: `Spending too much on inferior alternatives`,
      desiredOutcome: `Get more value for your money`,
      hookExample: `Why pay more when ${product} delivers the same — for less?`,
    },
    {
      title: "Urgency & Scarcity",
      emotion: "FOMO",
      painPoint: `Missing limited-time opportunities`,
      desiredOutcome: `Act now and save`,
      hookExample: `This offer on ${product} ends soon. Don't miss it.`,
    },
  ];

  return angles;
}

// ── Section 7: Hooks ──────────────────────────────────────────────────────────

function buildHooks(report: AudienceReport, input: AnalysisInput): Hook[] {
  const product = input.productName;
  const problem = report.problems[0]?.problem ?? `common ${(input.businessType ?? "Ecommerce").toLowerCase()} problems`;
  const goal    = report.customerGoals[0] ?? "achieve your goals";
  const persona = report.personas[0]?.name ?? "you";

  return [
    { text: `Every ${persona} deserves ${product}.`, type: "primary", emotion: "Aspiration" },
    { text: `Never deal with ${problem.toLowerCase()} again.`, type: "alternative", emotion: "Relief" },
    { text: `The only ${(input.businessType ?? "Ecommerce").toLowerCase()} solution you'll ever need.`, type: "alternative", emotion: "Confidence" },
    { text: `Small upgrade. ${goal.charAt(0).toUpperCase() + goal.slice(1)}.`, type: "alternative", emotion: "Simplicity" },
    { text: `What if you could ${goal.toLowerCase()} starting today?`, type: "alternative", emotion: "Curiosity" },
    { text: `This is why ${persona}s are switching to ${product}.`, type: "alternative", emotion: "Social Proof" },
  ];
}

// ── Section 8: CTAs ───────────────────────────────────────────────────────────

function buildCTAs(input: AnalysisInput): CTARec[] {
  const ctaMap: Record<string, CTARec[]> = {
    Sales: [
      { text: "Shop Now",        effectiveness: 97, bestFor: "Direct product purchases" },
      { text: "Buy Today",       effectiveness: 92, bestFor: "Urgency-driven sales" },
      { text: "Get Yours",       effectiveness: 88, bestFor: "Limited stock positioning" },
      { text: "Order Today",     effectiveness: 85, bestFor: "Ecommerce conversions" },
      { text: "See Collection",  effectiveness: 78, bestFor: "Browse-first buyers" },
      { text: "Learn More",      effectiveness: 65, bestFor: "Consideration phase" },
    ],
    Leads: [
      { text: "Get Free Quote",  effectiveness: 95, bestFor: "Service businesses" },
      { text: "Book Now",        effectiveness: 92, bestFor: "Appointment-based services" },
      { text: "Apply Now",       effectiveness: 88, bestFor: "Applications and sign-ups" },
      { text: "Download Now",    effectiveness: 85, bestFor: "Lead magnets" },
      { text: "Learn More",      effectiveness: 78, bestFor: "Warm audiences" },
      { text: "Get Started",     effectiveness: 72, bestFor: "SaaS and subscriptions" },
    ],
    Traffic: [
      { text: "Learn More",      effectiveness: 90, bestFor: "Blog and content traffic" },
      { text: "Read More",       effectiveness: 85, bestFor: "Articles and guides" },
      { text: "See More",        effectiveness: 80, bestFor: "Video content" },
      { text: "Discover",        effectiveness: 75, bestFor: "Brand discovery" },
      { text: "Explore",         effectiveness: 70, bestFor: "Category browsing" },
      { text: "Visit Now",       effectiveness: 65, bestFor: "Location-based businesses" },
    ],
    Awareness: [
      { text: "Watch Now",       effectiveness: 88, bestFor: "Video campaigns" },
      { text: "See More",        effectiveness: 82, bestFor: "Brand stories" },
      { text: "Discover",        effectiveness: 78, bestFor: "New products" },
      { text: "Learn More",      effectiveness: 74, bestFor: "Educational content" },
      { text: "Explore",         effectiveness: 68, bestFor: "Brand exploration" },
      { text: "Follow Us",       effectiveness: 60, bestFor: "Community building" },
    ],
  };

  return (ctaMap[input.objective ?? "Sales"] ?? ctaMap["Sales"]).sort((a: {effectiveness:number}, b: {effectiveness:number}) => b.effectiveness - a.effectiveness);
}

// ── Section 9: Offers ─────────────────────────────────────────────────────────

function buildOffers(report: AudienceReport, input: AnalysisInput): OfferRec[] {
  const offers: OfferRec[] = [
    {
      offer: "Free Delivery",
      type: "Convenience",
      conversionLikelihood: 92,
      reason: "Removes purchase friction — most effective for ecommerce products",
    },
    {
      offer: "20% Off First Order",
      type: "Discount",
      conversionLikelihood: 88,
      reason: "Strong first-purchase incentive for new customer acquisition",
    },
    {
      offer: "Buy One Get One",
      type: "Bundle",
      conversionLikelihood: 82,
      reason: "Increases average order value while feeling like exceptional value",
    },
    {
      offer: "Bundle & Save",
      type: "Bundle",
      conversionLikelihood: 79,
      reason: "Works well for complementary products — increases basket size",
    },
    {
      offer: "Limited-Time Offer",
      type: "Urgency",
      conversionLikelihood: 76,
      reason: "Creates FOMO and accelerates purchase decisions",
    },
    {
      offer: "Free Gift with Purchase",
      type: "Value-Add",
      conversionLikelihood: 72,
      reason: "Feels like added value without reducing perceived price",
    },
  ];

  // Boost relevant offers based on objective
  if (input.objective === "Sales") {
    offers[0].conversionLikelihood = Math.min(99, offers[0].conversionLikelihood + 5);
  }
  if (input.businessType === "Ecommerce") {
    offers.find((o) => o.offer === "Free Delivery")!.conversionLikelihood = 96;
  }

  return offers.sort((a, b) => b.conversionLikelihood - a.conversionLikelihood);
}

// ── Section 10: Ad Copy ───────────────────────────────────────────────────────

function buildAdCopy(report: AudienceReport, input: AnalysisInput): AdCopy[] {
  const product  = input.productName;
  const problem  = report.problems[0]?.problem ?? "your biggest challenge";
  const goal     = report.customerGoals[0] ?? "achieve more";
  const persona  = report.personas[0]?.name ?? "you";
  const benefit  = report.buyingMotivations[0] ?? "get results";
  const industry = report.industry;

  return [
    {
      type: "short_primary",
      label: "Short Primary Text",
      text: `Stop dealing with ${problem.toLowerCase()}. ${product} gives ${persona}s a smarter way to ${goal.toLowerCase()}. Try it today.`,
      maxLength: 125,
    },
    {
      type: "long_primary",
      label: "Long Primary Text",
      text: `Are you a ${persona} tired of ${problem.toLowerCase()}?\n\n${product} was built for people like you.\n\nHere's what you get:\n✅ ${benefit}\n✅ ${goal}\n✅ Peace of mind knowing you made the right choice\n\nJoin thousands of ${industry.toLowerCase()} professionals who already made the switch.\n\n👇 Click below to get started.`,
      maxLength: 500,
    },
    {
      type: "headline",
      label: "Headline",
      text: `${product} — Built for ${persona}s Who Demand More`,
      maxLength: 40,
    },
    {
      type: "description",
      label: "Description",
      text: `${goal}. Trusted by ${persona}s worldwide. Try ${product} risk-free today.`,
      maxLength: 30,
    },
    {
      type: "carousel",
      label: "Carousel Card Copy",
      text: `Card 1: The Problem — ${problem}\nCard 2: The Solution — ${product}\nCard 3: The Result — ${goal}\nCard 4: Social Proof — Join our community\nCard 5: CTA — Shop Now`,
    },
    {
      type: "story",
      label: "Story / Reels Caption",
      text: `POV: You finally found the solution to ${problem.toLowerCase()} 🔥\n\n${product} changed everything for me.\n\nSwipe up to see why 👆`,
    },
    {
      type: "reels",
      label: "Reels Caption",
      text: `${problem}? This changed everything 👀 #${product.replace(/\s+/g, "")} #${industry.replace(/\s+/g, "")} #metaads`,
    },
  ];
}

// ── Section 11: Video Ideas ────────────────────────────────────────────────────

function buildVideoIdeas(report: AudienceReport, input: AnalysisInput): VideoIdea[] {
  const product = input.productName;
  const problem = report.problems[0]?.problem ?? "the problem";
  const persona = report.personas[0]?.name ?? "customer";

  return [
    {
      title: "Product Demonstration",
      type: "Demo",
      openingHook: `Watch this before buying any ${(input.businessType ?? "Ecommerce").toLowerCase()} product`,
      scenes: [
        "Close-up of product unboxing",
        "Step-by-step product demonstration",
        "Before and after comparison",
        "Key features highlighted with text overlays",
      ],
      endingCTA: `Tap the link to get yours — limited stock available`,
    },
    {
      title: "Problem / Solution",
      type: "Problem/Solution",
      openingHook: `This is why ${persona}s are frustrated with ${problem.toLowerCase()}`,
      scenes: [
        "Show the problem in a relatable scenario",
        "Introduce the product as the solution",
        "Show the transformation",
        "Customer reaction / result",
      ],
      endingCTA: `Stop struggling — try ${product} today`,
    },
    {
      title: "Lifestyle / Aspiration",
      type: "Lifestyle",
      openingHook: `What life looks like after you discover ${product}`,
      scenes: [
        "Aspirational lifestyle shots",
        "Product integrated naturally into daily life",
        "Happy customer enjoying the outcome",
        "Logo and product shot",
      ],
      endingCTA: `This could be you — shop now`,
    },
    {
      title: "Customer Testimonial",
      type: "Testimonial",
      openingHook: `I was skeptical about ${product} until this happened`,
      scenes: [
        "Real customer sharing their before state",
        "The discovery of the product",
        "Results and transformation",
        "Direct recommendation to viewer",
      ],
      endingCTA: `Join thousands of happy customers today`,
    },
    {
      title: "Comparison / Why Us",
      type: "Comparison",
      openingHook: `${product} vs everything else — honest comparison`,
      scenes: [
        "Side-by-side comparison with alternatives",
        "Key differentiators highlighted",
        "Price and value comparison",
        "Clear winner reveal",
      ],
      endingCTA: `The choice is clear — shop ${product} now`,
    },
  ];
}

// ── Section 12: Image Ideas ───────────────────────────────────────────────────

function buildImageIdeas(report: AudienceReport, input: AnalysisInput): ImageIdea[] {
  const product = input.productName;
  const industry = report.industry;

  return [
    {
      title: "Hero Product Shot",
      type: "Hero",
      description: `Clean white or gradient background. Product centered, well-lit, with key benefit text overlaid. Product name and CTA visible.`,
      tip: `Use the primary color palette of your brand. Bold headline drives 40% higher CTR.`,
    },
    {
      title: "Lifestyle Context",
      type: "Lifestyle",
      description: `${product} shown in natural use. Real person (matching ${report.personas[0]?.name ?? "target persona"}) using the product in an aspirational setting.`,
      tip: `UGC-style images outperform studio shots by up to 3x in conversion rate.`,
    },
    {
      title: "Flat Lay / Overhead",
      type: "Flat Lay",
      description: `Overhead view of ${product} arranged with complementary items. Clean background — white, marble, or textured surface. Styled to match ${industry} aesthetic.`,
      tip: `Works especially well on Instagram and in carousel format.`,
    },
    {
      title: "Close-Up Detail",
      type: "Close-Up",
      description: `Macro shot highlighting the key feature or quality indicator of ${product}. Text overlay: "The difference is in the detail."`,
      tip: `Builds trust and justifies premium pricing — use when differentiating on quality.`,
    },
    {
      title: "Before & After Split",
      type: "Before & After",
      description: `Left panel: the problem state. Right panel: the result with ${product}. Bold text separating the two.`,
      tip: `Before/after images are among the highest-performing ad formats for conversion.`,
    },
  ];
}

// ── Section 14: Budget ────────────────────────────────────────────────────────

function buildBudgets(input: AnalysisInput): BudgetRec[] {
  const isB2B    = ["SaaS", "Service", "Coaching", "Real Estate"].includes(input.businessType ?? "");
  const testBudget  = isB2B ? "$30" : "$20";
  const scaleBudget = isB2B ? "$150" : "$100";

  return [
    {
      phase: "Testing Phase",
      dailyBudget: testBudget + "/day",
      duration: "7–14 days",
      totalBudget: isB2B ? "$210–$420" : "$140–$280",
      reason: `Minimum required to exit the Meta learning phase and gather statistically significant data across all 3 ad sets`,
    },
    {
      phase: "Scaling Phase",
      dailyBudget: scaleBudget + "/day",
      duration: "Ongoing",
      totalBudget: "Increase 20–30% every 3–5 days based on ROAS",
      reason: `Scale winners by duplicating best-performing ad sets rather than increasing existing budgets`,
    },
    {
      phase: "Retargeting",
      dailyBudget: "$10–$20/day",
      duration: "Ongoing",
      totalBudget: "10–15% of total campaign budget",
      reason: `Allocate a portion to retarget website visitors and video viewers with a stronger offer`,
    },
  ];
}

// ── Section 15: Optimization ──────────────────────────────────────────────────

function buildMetricGuides(): MetricGuide[] {
  const benchmarks: Record<string, string> = {
    CTR:       "> 1.0% (ecom), > 0.5% (B2B)",
    CPC:       "< $1.50 (ecom), < $5 (B2B)",
    CPM:       "$5–$15 (average Meta CPM)",
    CPA:       "< 30% of product price (ecom)",
    ROAS:      "> 3x (ecom minimum to scale)",
    Frequency: "< 3.0 (above = creative fatigue)",
  };

  return (DB.optimisationRules as Row[]).map((rule) => ({
    metric: str(rule.Metric),
    condition: str(rule.Condition),
    recommendation: str(rule.Recommendation),
    benchmark: benchmarks[str(rule.Metric)] ?? "Varies by industry",
  }));
}

// ── Section 16: Checklist ─────────────────────────────────────────────────────

function buildChecklist(input: AnalysisInput): ChecklistItem[] {
  return [
    { id: "pixel",    item: "Meta Pixel Installed",          category: "Tracking",   required: true,  checked: false },
    { id: "capi",     item: "Conversions API Connected",     category: "Tracking",   required: true,  checked: false },
    { id: "landing",  item: "Landing Page Ready & Tested",   category: "Creative",   required: true,  checked: false },
    { id: "images",   item: "Product Images Uploaded",       category: "Creative",   required: true,  checked: false },
    { id: "copy",     item: "Ad Copy Written & Reviewed",    category: "Creative",   required: true,  checked: false },
    { id: "tracking", item: "Conversion Tracking Verified",  category: "Tracking",   required: true,  checked: false },
    { id: "payment",  item: "Payment Gateway Tested",        category: "Store",      required: true,  checked: false },
    { id: "mobile",   item: "Landing Page Mobile Friendly",  category: "Store",      required: true,  checked: false },
    { id: "audience", item: "Audiences Built in Meta",       category: "Targeting",  required: true,  checked: false },
    { id: "budget",   item: "Daily Budget Set",              category: "Campaign",   required: true,  checked: false },
    { id: "bm",       item: "Business Manager Verified",     category: "Account",    required: true,  checked: false },
    { id: "catalog",  item: "Product Catalog Connected",     category: "Store",      required: input.businessType === "Ecommerce", checked: false },
    { id: "video",    item: "Video Creative Ready",          category: "Creative",   required: false, checked: false },
    { id: "utm",      item: "UTM Parameters Added",          category: "Tracking",   required: false, checked: false },
    { id: "cbo",      item: "Campaign Budget Optimisation Enabled", category: "Campaign", required: false, checked: false },
  ];
}

// ── Section 17: Campaign Score ────────────────────────────────────────────────

function buildCampaignScore(
  report: AudienceReport,
  objectiveConf: number
): { score: number; components: ScoreComponent[] } {
  const components: ScoreComponent[] = [
    {
      name: "Audience Intelligence",
      score: Math.min(20, Math.round(report.overallScore / 5)),
      maxScore: 20,
      reason: `Overall audience confidence: ${report.overallScore}%`,
    },
    {
      name: "Interest Coverage",
      score: Math.min(15, report.interests.length),
      maxScore: 15,
      reason: `${report.interests.length} verified interests matched`,
    },
    {
      name: "Behavior Coverage",
      score: Math.min(15, report.behaviors.length * 2),
      maxScore: 15,
      reason: `${report.behaviors.length} verified Meta behaviors identified`,
    },
    {
      name: "Persona Match",
      score: Math.min(15, report.personas.length * 4),
      maxScore: 15,
      reason: `${report.personas.length} customer personas identified`,
    },
    {
      name: "Strategy Clarity",
      score: Math.min(20, Math.round(objectiveConf / 5)),
      maxScore: 20,
      reason: `Campaign objective confidence: ${objectiveConf}%`,
    },
    {
      name: "Creative Readiness",
      score: 12,
      maxScore: 15,
      reason: "Creative strategy, hooks, angles, and copy generated",
    },
  ];

  const total = Math.min(97, components.reduce((acc, c) => acc + c.score, 0));
  return { score: total, components };
}

// ── Section 18: AI Recommendations ───────────────────────────────────────────

function buildAIRecommendations(
  report: AudienceReport,
  input: AnalysisInput
): AIRecommendation {
  const topInterest = report.interests[0]?.name ?? "your primary interest";
  const topBehavior = report.behaviors[0]?.metaAudience ?? "your top behavior";
  const topPersona  = report.personas[0]?.name ?? "your primary persona";

  return {
    priority: `Launch Ad Set 1 immediately with "${topInterest}" as the primary interest, combined with the "${topBehavior}" behavior. This combination has the highest database confidence score and will deliver the fastest results.`,
    quickWins: [
      `Use "Free Delivery" as your lead offer — it removes the #1 purchase objection`,
      `Start with a Product Demonstration video for Ad Set 1`,
      `Target ${topPersona}s aged 25–44 as your highest-quality starting segment`,
      `Set a ${report.funnelStage === "Most Aware" ? "$20" : "$30"}/day budget per ad set to exit the learning phase in 7 days`,
    ],
    potentialRisks: [
      `Audience overlap between Ad Set 1 and 2 — set up Audience Overlap tool in Meta to monitor`,
      `${report.matchedKeywordCount < 5 ? "Limited keyword matches — consider refining your product description for better targeting accuracy" : "Monitor frequency cap — pause and refresh creatives when frequency exceeds 3.0"}`,
      `Learning phase disruption — avoid editing campaigns in the first 7 days after launch`,
    ],
    optimizationOpportunities: [
      `After 7 days: duplicate best-performing ad set and scale by 25% budget increase`,
      `Week 2: Add a retargeting ad set targeting website visitors with a stronger offer`,
      `Week 3: Test Lookalike Audiences (1–3%) from your customer list if available`,
      `Month 2: Launch a catalog campaign for ${input.businessType === "Ecommerce" ? "dynamic product ads" : "service showcase"}`,
    ],
  };
}

// ── Main Generator ────────────────────────────────────────────────────────────

export function generateCampaignStrategy(
  report: AudienceReport,
  input: AnalysisInput
): CampaignStrategy {
  const objectiveRec     = buildObjectiveRec(report, input);
  const funnelStages     = buildFunnelStages(report);
  const campaignStructure = buildCampaignStructure(report, input);
  const creativeTypes    = buildCreativeTypes(report, input);
  const creativeAngles   = buildCreativeAngles(report, input);
  const hooks            = buildHooks(report, input);
  const ctas             = buildCTAs(input);
  const offers           = buildOffers(report, input);
  const adCopy           = buildAdCopy(report, input);
  const videoIdeas       = buildVideoIdeas(report, input);
  const imageIdeas       = buildImageIdeas(report, input);
  const budgets          = buildBudgets(input);
  const metricGuides     = buildMetricGuides();
  const checklist        = buildChecklist(input);
  const { score, components } = buildCampaignScore(report, objectiveRec.confidence);
  const aiRecommendations = buildAIRecommendations(report, input);

  const recCreative = creativeTypes.find((c) => c.isRecommended)?.type ?? "Product Demonstration";
  const primaryCount = report.interests.filter((i) => i.tier === "primary").length;
  const secCount     = report.interests.filter((i) => i.tier === "secondary").length;
  const expCount     = report.interests.filter((i) => i.tier === "expansion").length;

  const executiveSummary =
    `Based on the analysis of "${input.productName}", Smarkin recommends a ${objectiveRec.objective} campaign ` +
    `targeting ${report.personas[0]?.name ?? "high-intent"} audiences within the ${report.industry} industry. ` +
    `The campaign should launch with ${primaryCount} Primary Interest${primaryCount > 1 ? "s" : ""}, ` +
    `${secCount} Secondary Interest${secCount > 1 ? "s" : ""}, and ${expCount} Expansion Audience${expCount > 1 ? "s" : ""} ` +
    `structured across 3 ad sets. ` +
    `Recommended creative: ${recCreative}. ` +
    `Campaign readiness score: ${score}/97. ` +
    `Confidence: ${objectiveRec.confidence}%.`;

  return {
    executiveSummary,
    objectiveRec,
    funnelStages,
    campaignStructure,
    creativeTypes,
    creativeAngles,
    hooks,
    ctas,
    offers,
    adCopy,
    videoIdeas,
    imageIdeas,
    budgets,
    metricGuides,
    checklist,
    campaignScore: score,
    scoreComponents: components,
    aiRecommendations,
  };
}
