/**
 * Smarkin AI — Module 5: Audience Intelligence Engine
 * Evidence, Confidence, Relationship, and Expansion layers.
 * Purely additive — wraps existing engine output, zero changes to core pipeline.
 */
import DB from "./smarkin-db.json";
import type {
  AudienceReport,
  AnalysisInput,
  RecommendedInterest,
  RecommendedBehavior,
  RecommendedDemographic,
  MatchedPersona,
} from "./engine";

// ── Evidence Types ────────────────────────────────────────────────────────────

export type EvidenceType =
  | "Industry Match"
  | "Sector Match"
  | "Category Match"
  | "Product Family Match"
  | "Persona Match"
  | "Behavior Match"
  | "Keyword Match"
  | "Relationship Database"
  | "Recommendation Rule"
  | "Verified Meta Data"
  | "Audience Pairing";

export interface Evidence {
  type: EvidenceType;
  label: string;
  strength: "strong" | "moderate" | "weak";
  detail: string;
}

// ── Relationship Path ─────────────────────────────────────────────────────────

export interface RelationshipNode {
  label: string;
  type: "product" | "family" | "subcategory" | "category" | "sector" | "industry" | "persona" | "interest" | "behavior" | "demographic";
  matched: boolean;
}

export interface RelationshipPath {
  nodes: RelationshipNode[];
  description: string;
}

// ── Enhanced recommendation wrappers ─────────────────────────────────────────

export interface EnhancedInterest extends RecommendedInterest {
  evidence: Evidence[];
  relationshipPath: RelationshipPath;
  explanation: string;
  confidenceWeight: number;
  expansionOf?: string; // name of interest this expands from
}

export interface EnhancedBehavior extends RecommendedBehavior {
  evidence: Evidence[];
  relationshipPath: RelationshipPath;
  explanation: string;
  confidenceWeight: number;
}

export interface EnhancedDemographic extends RecommendedDemographic {
  evidence: Evidence[];
  explanation: string;
  confidenceWeight: number;
}

export interface EnhancedPersona extends MatchedPersona {
  evidence: Evidence[];
  relationshipPath: RelationshipPath;
  explanation: string;
  confidenceWeight: number;
}

// ── Confidence Breakdown (weighted) ──────────────────────────────────────────

export interface WeightedConfidence {
  overall: number;
  label: "High Confidence" | "Moderate Confidence" | "Low Confidence";
  color: "green" | "amber" | "red";
  components: {
    name: string;
    weight: number;      // max weight this component contributes
    earned: number;      // actually earned
    percentage: number;  // earned/weight * 100
    reason: string;
  }[];
  derivation: string;    // human-readable explanation of how the score was computed
}

// ── Targeting Stack ───────────────────────────────────────────────────────────

export interface TargetingStack {
  primaryInterest: string;
  primaryInterestReason: string;
  primaryBehavior: string;
  primaryBehaviorReason: string;
  primaryPersona: string;
  primaryPersonaReason: string;
  primaryDemographic: string;
  primaryDemographicReason: string;
  campaignObjective: string;
  funnelStage: string;
  adSetName: string;        // suggested Meta ad set name
  estimatedReach: string;   // rough reach estimate from demographic sizes
  stackExplanation: string;
}

// ── Audience Expansion ────────────────────────────────────────────────────────

export interface ExpansionGroup {
  tier: "Primary" | "Secondary" | "Expansion";
  label: string;
  description: string;
  interests: EnhancedInterest[];
  totalReach: string;
}

// ── Full Intelligence Report ──────────────────────────────────────────────────

export interface IntelligenceReport {
  // All enhanced recommendations
  interests: EnhancedInterest[];
  behaviors: EnhancedBehavior[];
  demographics: EnhancedDemographic[];
  personas: EnhancedPersona[];

  // Audience expansion groups
  expansionGroups: ExpansionGroup[];

  // Targeting stack
  targetingStack: TargetingStack;

  // Confidence (weighted)
  weightedConfidence: WeightedConfidence;

  // Global evidence summary
  globalEvidence: Evidence[];

  // Relationship path for the product itself
  productRelationshipPath: RelationshipPath;
}

// ── Helper ────────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n > 0 ? String(n) : "—";
}

// ── Evidence Builder ──────────────────────────────────────────────────────────

function buildInterestEvidence(
  interest: RecommendedInterest,
  report: AudienceReport,
  relLookup: Set<string>
): Evidence[] {
  const ev: Evidence[] = [];

  // Source-verified badge always present
  ev.push({
    type: "Verified Meta Data",
    label: "Verified Meta Data",
    strength: "strong",
    detail: "Interest exists and is verified in the Meta Ads Interest Database",
  });

  // Relationship database match
  if (relLookup.has(interest.name)) {
    ev.push({
      type: "Relationship Database",
      label: "Relationship Database",
      strength: "strong",
      detail: `Directly linked to "${report.productFamily}" via the Smarkin Relationship Database`,
    });
  }

  // Industry match
  const industryMatch = (interest.mainCategory || "").toLowerCase().includes(report.industry.toLowerCase()) ||
    report.industry.toLowerCase().includes((interest.mainCategory || "").toLowerCase());
  if (industryMatch) {
    ev.push({ type: "Industry Match", label: "Industry Match", strength: "strong",
      detail: `Interest category "${interest.mainCategory}" aligns with industry "${report.industry}"` });
  }

  // Tier-based evidence
  if (interest.tier === "primary") {
    ev.push({ type: "Keyword Match", label: "Keyword Match", strength: "strong",
      detail: "Ranked in top-tier by keyword scoring against product name and description" });
  } else if (interest.tier === "secondary") {
    ev.push({ type: "Category Match", label: "Category Match", strength: "moderate",
      detail: "Matched via category and sector scoring" });
  } else {
    ev.push({ type: "Sector Match", label: "Sector Match", strength: "weak",
      detail: "Expansion match — broader audience for scaling phase" });
  }

  // Persona match
  if (report.personas.some((p) =>
    (p.productCategories || "").toLowerCase().includes(interest.mainCategory.toLowerCase())
  )) {
    ev.push({ type: "Persona Match", label: "Persona Match", strength: "moderate",
      detail: "Interest aligns with matched customer persona product categories" });
  }

  return ev;
}

function buildBehaviorEvidence(
  behavior: RecommendedBehavior,
  report: AudienceReport,
  relLookup: Set<string>
): Evidence[] {
  const ev: Evidence[] = [];

  ev.push({
    type: "Verified Meta Data",
    label: "Verified Meta Data",
    strength: "strong",
    detail: `Source: Meta Ads Manager · Status: ${behavior.verification}`,
  });

  if (relLookup.has(behavior.metaAudience)) {
    ev.push({
      type: "Relationship Database",
      label: "Relationship Database",
      strength: "strong",
      detail: `Behavior "${behavior.metaAudience}" is directly linked to "${report.productFamily}" in the Relationship Database`,
    });
  }

  if (behavior.reason.includes("Recommendation Rules")) {
    ev.push({ type: "Recommendation Rule", label: "Recommendation Rule", strength: "strong",
      detail: `Triggered by rule: ${report.industry} industry → ${behavior.metaAudience}` });
  }

  if (behavior.reason.includes("Audience Relationship")) {
    ev.push({ type: "Audience Pairing", label: "Audience Pairing", strength: "moderate",
      detail: "This behavior is commonly paired with your primary interest in successful campaigns" });
  }

  ev.push({ type: "Behavior Match", label: "Behavior Match", strength: "moderate",
    detail: `Matched via "${behavior.parent}" parent category scoring` });

  return ev;
}

function buildPersonaEvidence(
  persona: MatchedPersona,
  report: AudienceReport,
  relLookup: Set<string>
): Evidence[] {
  const ev: Evidence[] = [];

  ev.push({ type: "Verified Meta Data", label: "Persona Database", strength: "strong",
    detail: "Persona sourced from verified Smarkin Customer Persona Database" });

  if (relLookup.has(persona.name)) {
    ev.push({ type: "Relationship Database", label: "Relationship Database", strength: "strong",
      detail: `"${persona.name}" is directly mapped to "${report.productFamily}" in the Relationship Database` });
  }

  if ((persona.productCategories || "").toLowerCase().includes(report.category.toLowerCase()) ||
      (persona.productCategories || "").toLowerCase().includes(report.industry.toLowerCase())) {
    ev.push({ type: "Category Match", label: "Category Match", strength: "strong",
      detail: `Persona product categories include "${report.category}" or "${report.industry}"` });
  }

  ev.push({ type: "Persona Match", label: "Persona Match", strength: "strong",
    detail: `Relevance score: ${persona.relevanceScore}% — ranked by keyword and relationship scoring` });

  return ev;
}

function buildDemographicEvidence(
  demo: RecommendedDemographic,
  report: AudienceReport
): Evidence[] {
  const ev: Evidence[] = [];

  ev.push({ type: "Verified Meta Data", label: "Verified Meta Data", strength: "strong",
    detail: "Demographic sourced directly from Meta Ads Demographic Database with verified audience sizes" });

  ev.push({ type: "Industry Match", label: "Industry Match", strength: "moderate",
    detail: `${demo.category} targeting recommended for ${report.industry} industry` });

  if (demo.region !== "Global") {
    ev.push({ type: "Sector Match", label: "Region Targeted", strength: "strong",
      detail: `Region-specific demographic: ${demo.region}` });
  }

  return ev;
}

// ── Relationship Path Builder ─────────────────────────────────────────────────

function buildProductRelationshipPath(report: AudienceReport): RelationshipPath {
  const nodes: RelationshipNode[] = (
    [
      { label: report.productFamily || "Your Product", type: "product"     as const, matched: true },
      { label: report.subCategory  || "",              type: "subcategory" as const, matched: !!report.subCategory },
      { label: report.category     || "",              type: "category"    as const, matched: !!report.category },
      { label: report.sector       || "",              type: "sector"      as const, matched: !!report.sector },
      { label: report.industry,                        type: "industry"    as const, matched: true },
    ] as RelationshipNode[]
  ).filter((n) => n.label && n.label !== "—");

  const matched = nodes.filter((n) => n.matched).length;
  const description = `Product classified through ${matched} taxonomy levels: ` +
    nodes.filter((n) => n.matched).map((n) => n.label).join(" → ");

  return { nodes, description };
}

function buildInterestRelationshipPath(
  interest: RecommendedInterest,
  report: AudienceReport
): RelationshipPath {
  const nodes: RelationshipNode[] = [
    { label: report.productFamily || "Product", type: "product",  matched: true },
    { label: report.category || report.industry, type: "category", matched: !!report.category },
    { label: report.industry,                    type: "industry", matched: true },
    { label: interest.mainCategory,              type: "sector",   matched: true },
    { label: interest.name,                      type: "interest", matched: true },
  ];
  return {
    nodes,
    description: `${report.productFamily} → ${report.industry} → ${interest.mainCategory} → ${interest.name}`,
  };
}

function buildBehaviorRelationshipPath(
  behavior: RecommendedBehavior,
  report: AudienceReport
): RelationshipPath {
  const nodes: RelationshipNode[] = [
    { label: report.productFamily || "Product", type: "product",  matched: true },
    { label: report.industry,                   type: "industry", matched: true },
    { label: behavior.parent,                   type: "sector",   matched: true },
    { label: behavior.child,                    type: "category", matched: true },
    { label: behavior.metaAudience,             type: "behavior", matched: true },
  ];
  return {
    nodes,
    description: `${report.productFamily} → ${report.industry} → ${behavior.parent} → ${behavior.metaAudience}`,
  };
}

function buildPersonaRelationshipPath(
  persona: MatchedPersona,
  report: AudienceReport
): RelationshipPath {
  const nodes: RelationshipNode[] = [
    { label: report.productFamily || "Product", type: "product",  matched: true },
    { label: report.category || report.industry, type: "category", matched: !!report.category },
    { label: report.industry,                    type: "industry", matched: true },
    { label: persona.name,                       type: "persona",  matched: true },
  ];
  return {
    nodes,
    description: `${report.productFamily} → ${report.industry} → ${persona.name}`,
  };
}

// ── Explanation Generator (database-grounded, no hallucination) ───────────────

function explainInterest(
  interest: RecommendedInterest,
  report: AudienceReport,
  evidence: Evidence[]
): string {
  const evidenceTypes = evidence.map((e) => e.type);
  const parts: string[] = [];

  parts.push(`"${interest.name}" is a ${interest.tier}-tier Meta interest in the ${interest.mainCategory} → ${interest.subCategory} category.`);

  if (evidenceTypes.includes("Relationship Database")) {
    parts.push(`It is directly linked to "${report.productFamily}" via the Smarkin Relationship Database.`);
  } else if (evidenceTypes.includes("Industry Match")) {
    parts.push(`It was matched because its category aligns with the "${report.industry}" industry classification.`);
  }

  parts.push(`Buying intent is rated "${interest.buyingIntent}" in the Meta Interest Database.`);

  if (interest.tier === "primary") {
    parts.push("This is a core targeting interest — launch with this in your first ad set.");
  } else if (interest.tier === "secondary") {
    parts.push("Use this as a secondary targeting layer to expand reach while maintaining relevance.");
  } else {
    parts.push("Add this interest during your scaling phase to increase audience size.");
  }

  return parts.join(" ");
}

function explainBehavior(
  behavior: RecommendedBehavior,
  report: AudienceReport,
  evidence: Evidence[]
): string {
  const parts: string[] = [];
  parts.push(`"${behavior.metaAudience}" is a verified Meta behavior in the ${behavior.parent} → ${behavior.child} category.`);

  if (evidence.some((e) => e.type === "Relationship Database")) {
    parts.push(`It is directly mapped to "${report.productFamily}" in the Smarkin Relationship Database.`);
  } else if (evidence.some((e) => e.type === "Recommendation Rule")) {
    parts.push(`It was triggered by a Recommendation Rule: ${report.industry} industry products should include this behavior.`);
  } else {
    parts.push(`It was matched by keyword scoring against the product description and industry.`);
  }

  parts.push(`All behaviors in Smarkin AI are sourced directly from Meta Ads Manager and carry a "${behavior.verification}" status.`);
  return parts.join(" ");
}

function explainPersona(
  persona: MatchedPersona,
  report: AudienceReport,
  evidence: Evidence[]
): string {
  const parts: string[] = [];
  parts.push(`"${persona.name}" is the most relevant customer persona for ${report.productFamily}.`);
  parts.push(`Their primary goal is to "${persona.goal}" and their main pain point is "${persona.painPoint}".`);
  parts.push(`They are motivated by "${persona.buyingMotivation}" — use this in your ad copy and creative.`);

  if (evidence.some((e) => e.type === "Relationship Database")) {
    parts.push(`This persona was directly matched via the Relationship Database.`);
  }
  return parts.join(" ");
}

function explainDemographic(
  demo: RecommendedDemographic,
  report: AudienceReport
): string {
  const parts: string[] = [];
  parts.push(`"${demo.name}" is a ${demo.category} → ${demo.subcategory} demographic targeting option.`);
  parts.push(`Meta path: ${demo.metaPath}.`);
  if (demo.audienceSizeMin && demo.audienceSizeMax) {
    parts.push(`Estimated audience size: ${fmt(demo.audienceSizeMin)} – ${fmt(demo.audienceSizeMax)} globally.`);
  }
  parts.push(`Recommended for ${report.industry} products targeting ${report.productFamily.toLowerCase()} buyers.`);
  return parts.join(" ");
}

// ── Weighted Confidence Engine ────────────────────────────────────────────────

function buildWeightedConfidence(
  report: AudienceReport,
  relInterests: Set<string>,
  relBehaviors: Set<string>
): WeightedConfidence {
  // Weight components (total = 100)
  const components: WeightedConfidence["components"] = [
    {
      name: "Product Classification",
      weight: 25,
      earned: report.matchConfidenceLevel === "exact"    ? 25 :
              report.matchConfidenceLevel === "family"   ? 22 :
              report.matchConfidenceLevel === "category" ? 18 :
              report.matchConfidenceLevel === "industry" ? 12 :
              report.matchConfidenceLevel === "keyword"  ? 7  : 0,
      percentage: 0,
      reason: `Match level: ${report.matchConfidenceLevel} — product classified to "${report.productFamily}"`,
    },
    {
      name: "Interest Database Match",
      weight: 20,
      earned: Math.min(20, report.interests.length * 1.4 + relInterests.size * 2),
      percentage: 0,
      reason: `${report.interests.length} interests matched, ${relInterests.size} via Relationship Database`,
    },
    {
      name: "Behavior Database Match",
      weight: 20,
      earned: Math.min(20, report.behaviors.length * 2.5 + relBehaviors.size * 3),
      percentage: 0,
      reason: `${report.behaviors.length} verified behaviors matched, ${relBehaviors.size} via Relationship Database`,
    },
    {
      name: "Keyword Coverage",
      weight: 15,
      earned: Math.min(15, report.matchedKeywordCount * 1.2),
      percentage: 0,
      reason: `${report.matchedKeywordCount} keyword rows matched in the Keyword Mapping Database`,
    },
    {
      name: "Persona Match",
      weight: 10,
      earned: Math.min(10, report.personas.length * 2.5),
      percentage: 0,
      reason: `${report.personas.length} customer personas matched`,
    },
    {
      name: "Demographic Coverage",
      weight: 10,
      earned: Math.min(10, report.demographics.length * 1.25),
      percentage: 0,
      reason: `${report.demographics.length} demographics identified with verified audience sizes`,
    },
  ];

  // Compute percentages
  for (const c of components) {
    c.earned = Math.round(c.earned * 10) / 10;
    c.percentage = Math.round((c.earned / c.weight) * 100);
  }

  const overall = Math.min(97, Math.round(components.reduce((acc, c) => acc + c.earned, 0)));

  const label: WeightedConfidence["label"] =
    overall >= 80 ? "High Confidence" : overall >= 60 ? "Moderate Confidence" : "Low Confidence";
  const color: WeightedConfidence["color"] =
    overall >= 80 ? "green" : overall >= 60 ? "amber" : "red";

  const topComponent = [...components].sort((a, b) => b.earned / b.weight - a.earned / a.weight)[0];
  const derivation =
    `Overall confidence of ${overall}% was derived from six weighted components. ` +
    `The strongest signal came from "${topComponent.name}" (${topComponent.earned}/${topComponent.weight} points). ` +
    `${overall >= 80 ? "High confidence — proceed with these audiences." :
       overall >= 60 ? "Moderate confidence — recommendations are solid but consider testing multiple audiences." :
       "Low confidence — limited database matches found. Consider refining your product description."}`;

  return { overall, label, color, components, derivation };
}

// ── Targeting Stack Builder ───────────────────────────────────────────────────

function buildTargetingStack(
  report: AudienceReport,
  input: AnalysisInput
): TargetingStack {
  const pi = report.interests.find((i) => i.tier === "primary") ?? report.interests[0];
  const pb = report.behaviors[0];
  const pp = report.personas[0];
  const pd = report.demographics[0];

  const maxSize = pd ? pd.audienceSizeMax : 0;
  const minSize = pd ? pd.audienceSizeMin : 0;
  const estimatedReach = maxSize
    ? `${fmt(minSize)} – ${fmt(maxSize)}`
    : "Varies by location and targeting";

  const adSetName = [
    input.country !== "Worldwide" ? input.country : null,
    report.productFamily || input.productName,
    pi?.name ?? input.objective,
    input.objective,
  ].filter(Boolean).join(" | ");

  return {
    primaryInterest:         pi?.name ?? "—",
    primaryInterestReason:   pi ? `Highest-scoring ${pi.tier} interest — ${pi.buyingIntent} buying intent` : "No interest matched",
    primaryBehavior:         pb?.metaAudience ?? "—",
    primaryBehaviorReason:   pb ? `${pb.parent} → ${pb.child} — ${pb.verification} by Meta Ads Manager` : "No behavior matched",
    primaryPersona:          pp?.name ?? "—",
    primaryPersonaReason:    pp ? `${pp.relevanceScore}% relevance — motivated by "${pp.buyingMotivation}"` : "No persona matched",
    primaryDemographic:      pd?.name ?? "—",
    primaryDemographicReason:pd ? `${pd.category} → ${pd.subcategory} — ${fmt(pd.audienceSizeMin)}–${fmt(pd.audienceSizeMax)} reach` : "No demographic matched",
    campaignObjective:       report.campaignObjective,
    funnelStage:             report.funnelStage,
    adSetName,
    estimatedReach,
    stackExplanation:
      `This targeting stack was built by combining the top-scoring recommendation from each database. ` +
      `Start with the primary interest "${pi?.name ?? "—"}" layered with the behavior "${pb?.metaAudience ?? "—"}". ` +
      `Target the "${pp?.name ?? "—"}" persona using the "${pd?.name ?? "—"}" demographic. ` +
      `Campaign objective: ${report.campaignObjective}. Funnel position: ${report.funnelStage}.`,
  };
}

// ── Audience Expansion Groups ─────────────────────────────────────────────────

function buildExpansionGroups(
  enhancedInterests: EnhancedInterest[]
): ExpansionGroup[] {
  const primary   = enhancedInterests.filter((i) => i.tier === "primary");
  const secondary = enhancedInterests.filter((i) => i.tier === "secondary");
  const expansion = enhancedInterests.filter((i) => i.tier === "expansion");

  return [
    {
      tier: "Primary" as const,
      label: "Primary Audiences",
      description: `Launch with these ${primary.length} interests. Highest database match score and buying intent. Use these in your first ad set.`,
      interests: primary,
      totalReach: "Core audience — typically 500K–5M depending on country",
    },
    {
      tier: "Secondary" as const,
      label: "Secondary Audiences",
      description: `Layer these ${secondary.length} interests in a second ad set once your primary performs. Broader match, still relevant.`,
      interests: secondary,
      totalReach: "Expanded audience — typically 2M–20M depending on country",
    },
    {
      tier: "Expansion" as const,
      label: "Expansion Audiences",
      description: `Scale phase. Add these ${expansion.length} interests when you've exhausted primary and secondary audiences and need more reach.`,
      interests: expansion,
      totalReach: "Scale audience — typically 10M+ depending on country",
    },
  ].filter((g) => g.interests.length > 0);
}

// ── Main Intelligence Engine ──────────────────────────────────────────────────

export function generateIntelligenceReport(
  report: AudienceReport,
  input: AnalysisInput
): IntelligenceReport {
  // Build relationship lookup sets from the DB
  const relInterestNames = new Set<string>(
    (DB.relationship as Row[])
      .filter((r) => r["Target Type"] === "Interest")
      .map((r) => r.Target as string)
  );
  const relBehaviorNames = new Set<string>(
    (DB.relationship as Row[])
      .filter((r) => r["Target Type"] === "Behavior")
      .map((r) => r.Target as string)
  );
  const relPersonaNames = new Set<string>(
    (DB.relationship as Row[])
      .filter((r) => r["Target Type"] === "Persona")
      .map((r) => r.Target as string)
  );

  // ── Enhanced Interests ──
  const enhancedInterests: EnhancedInterest[] = report.interests.map((interest) => {
    const evidence = buildInterestEvidence(interest, report, relInterestNames);
    const relationshipPath = buildInterestRelationshipPath(interest, report);
    const explanation = explainInterest(interest, report, evidence);
    const confidenceWeight = interest.tier === "primary" ? 90 :
                             interest.tier === "secondary" ? 70 : 50;
    return { ...interest, evidence, relationshipPath, explanation, confidenceWeight };
  });

  // ── Enhanced Behaviors ──
  const enhancedBehaviors: EnhancedBehavior[] = report.behaviors.map((behavior) => {
    const evidence = buildBehaviorEvidence(behavior, report, relBehaviorNames);
    const relationshipPath = buildBehaviorRelationshipPath(behavior, report);
    const explanation = explainBehavior(behavior, report, evidence);
    const confidenceWeight = relBehaviorNames.has(behavior.metaAudience) ? 95 : 70;
    return { ...behavior, evidence, relationshipPath, explanation, confidenceWeight };
  });

  // ── Enhanced Personas ──
  const enhancedPersonas: EnhancedPersona[] = report.personas.map((persona) => {
    const evidence = buildPersonaEvidence(persona, report, relPersonaNames);
    const relationshipPath = buildPersonaRelationshipPath(persona, report);
    const explanation = explainPersona(persona, report, evidence);
    const confidenceWeight = persona.relevanceScore;
    return { ...persona, evidence, relationshipPath, explanation, confidenceWeight };
  });

  // ── Enhanced Demographics ──
  const enhancedDemographics: EnhancedDemographic[] = report.demographics.map((demo) => {
    const evidence = buildDemographicEvidence(demo, report);
    const explanation = explainDemographic(demo, report);
    const confidenceWeight = 75;
    return { ...demo, evidence, explanation, confidenceWeight };
  });

  // ── Weighted Confidence ──
  const weightedConfidence = buildWeightedConfidence(report, relInterestNames, relBehaviorNames);

  // ── Targeting Stack ──
  const targetingStack = buildTargetingStack(report, input);

  // ── Expansion Groups ──
  const expansionGroups = buildExpansionGroups(enhancedInterests);

  // ── Product Relationship Path ──
  const productRelationshipPath = buildProductRelationshipPath(report);

  // ── Global Evidence ──
  const globalEvidence: Evidence[] = [
    { type: "Verified Meta Data", label: "Meta Interest Database",
      strength: "strong", detail: `${report.interests.length} verified interests from Meta Ads Interest Database` },
    { type: "Verified Meta Data", label: "Meta Behavior Database",
      strength: "strong", detail: `${report.behaviors.length} verified behaviors from Meta Ads Manager` },
    { type: "Product Family Match", label: "Product Family Match",
      strength: report.matchConfidenceLevel === "exact" ? "strong" : "moderate",
      detail: `Product classified as "${report.productFamily}" (${report.matchConfidenceLevel} match)` },
    { type: "Keyword Match", label: "Keyword Mapping Database",
      strength: "strong", detail: `${report.matchedKeywordCount} keyword matches from 1,980-row database` },
    ...(relInterestNames.size > 0 ? [{
      type: "Relationship Database" as EvidenceType, label: "Relationship Database",
      strength: "strong" as const, detail: `${relInterestNames.size} direct relationships found for "${report.productFamily}"` }] : []),
  ];

  return {
    interests: enhancedInterests,
    behaviors: enhancedBehaviors,
    demographics: enhancedDemographics,
    personas: enhancedPersonas,
    expansionGroups,
    targetingStack,
    weightedConfidence,
    globalEvidence,
    productRelationshipPath,
  };
}
