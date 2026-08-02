import { describe, it, expect } from "vitest";
import { matchInterests } from "@/lib/capabilities/audienceResearch/services/interestMatcher";
import { matchBehaviors } from "@/lib/capabilities/audienceResearch/services/behaviorMatcher";
import { matchDemographics } from "@/lib/capabilities/audienceResearch/services/demographicMatcher";
import { evaluatePlatforms } from "@/lib/capabilities/audienceResearch/services/platformRecommendationService";
import { generateStrategies } from "@/lib/capabilities/audienceResearch/services/strategyGenerator";
import { generateAudienceInsights } from "@/lib/capabilities/audienceResearch/services/audienceInsightGenerator";
import { calculateAudienceConfidence } from "@/lib/capabilities/audienceResearch/services/confidenceCalculator";
import { collectEvidence } from "@/lib/capabilities/audienceResearch/services/evidenceCollector";
import { discoverAudienceCandidates } from "@/lib/capabilities/audienceResearch/services/audienceDiscoveryService";

describe("Audience Research — Interest Matcher", () => {
  it("finds real metaAdsInterest rows for a known persona name", () => {
    const { interests, rowsUsed } = matchInterests("Fitness Enthusiast", []);
    expect(interests.length).toBeGreaterThan(0);
    expect(rowsUsed).toBeGreaterThan(0);
    expect(interests.every(i => i.source === "metaAdsInterest")).toBe(true);
  });

  it("logs a real gap instead of returning fabricated interests for gibberish input", () => {
    const gaps: string[] = [];
    const { interests } = matchInterests("zzzqxwvyy nonsense input", gaps);
    expect(interests.length).toBe(0);
    expect(gaps.length).toBeGreaterThan(0);
  });
});

describe("Audience Research — Behavior Matcher", () => {
  it("finds real behaviors when the description genuinely overlaps real Match Keywords", () => {
    const { behaviors } = matchBehaviors("Frequent Traveler", "lives abroad and travels often", []);
    expect(behaviors.length).toBeGreaterThan(0);
    expect(behaviors.every(b => b.source === "behaviors")).toBe(true);
  });

  it("honestly reports no match rather than a weak fabricated one, for input with no real keyword overlap", () => {
    const gaps: string[] = [];
    const { behaviors } = matchBehaviors("Fitness Enthusiast", "Improve fitness", gaps);
    expect(behaviors.length).toBe(0);
    expect(gaps.length).toBeGreaterThan(0);
  });
});

describe("Audience Research — Demographic Matcher", () => {
  it("finds real audience-size numbers for a known demographic", () => {
    const { demographics } = matchDemographics("University Students", "students in university", []);
    expect(demographics.length).toBeGreaterThan(0);
    const withSize = demographics.find(d => d.sizeMin !== null && d.sizeMax !== null);
    expect(withSize).toBeDefined();
    expect(withSize!.sizeMin).toBeGreaterThan(0);
  });
});

describe("Audience Research — Platform Recommendation", () => {
  it("finds real platform suitability scores for a known industry", () => {
    const { platforms } = evaluatePlatforms("Health & Fitness", []);
    expect(platforms.length).toBeGreaterThan(0);
    expect(platforms.every(p => p.suitability > 0 && p.suitability <= 100)).toBe(true);
  });

  it("never recommends a platform with a zero real suitability score", () => {
    const { platforms } = evaluatePlatforms("Health & Fitness", []);
    expect(platforms.every(p => p.suitability > 0)).toBe(true);
  });
});

describe("Audience Research — Strategy Generator", () => {
  it("returns all real rows from the audienceStrategies reference table", () => {
    const { strategies } = generateStrategies([]);
    expect(strategies.length).toBe(6);
    expect(strategies.every(s => s.source === "audienceStrategies")).toBe(true);
  });
});

describe("Audience Research — Audience Insight Generator", () => {
  it("derives real insights from Customer Research's actual objections and pain points", () => {
    const objections = [{ category: "price", objection: "Too Expensive" }];
    const painPoints = [{ description: "Lack of Energy", urgencyScore: 85 }];
    const insights = generateAudienceInsights(objections, painPoints, []);
    expect(insights.length).toBeGreaterThan(0);
    expect(insights.some(i => i.category === "price-sensitivity")).toBe(true);
  });

  it("logs a gap and returns nothing fabricated when no objections or pain points exist", () => {
    const gaps: string[] = [];
    const insights = generateAudienceInsights([], [], gaps);
    expect(insights.length).toBe(0);
    expect(gaps.length).toBeGreaterThan(0);
  });
});

describe("Audience Research — Confidence Calculator", () => {
  it("scores rich, fully-matched data highly", () => {
    const score = calculateAudienceConfidence({
      audienceCount: 2, interestCount: 5, behaviorCount: 3, demographicCount: 4, platformCount: 5, strategyCount: 6, gapCount: 0,
    });
    expect(score).toBeGreaterThan(70);
  });

  it("scores empty data as zero", () => {
    const score = calculateAudienceConfidence({
      audienceCount: 0, interestCount: 0, behaviorCount: 0, demographicCount: 0, platformCount: 0, strategyCount: 0, gapCount: 5,
    });
    expect(score).toBe(0);
  });
});

describe("Audience Research — Evidence Collector", () => {
  it("marks matched as exactly rowsUsed > 0, never independently asserted", () => {
    const evidence = collectEvidence([
      { label: "A", table: "t1", rowsUsed: 5 },
      { label: "B", table: "t2", rowsUsed: 0 },
    ]);
    expect(evidence[0].matched).toBe(true);
    expect(evidence[1].matched).toBe(false);
  });
});

describe("Audience Research — Audience Discovery", () => {
  it("seeds one candidate per real persona, without re-deriving personas itself", () => {
    const personas = [{ name: "Fitness Enthusiast", primaryGoal: "Improve fitness" }, { name: "Bodybuilder", primaryGoal: "Build muscle" }];
    const candidates = discoverAudienceCandidates(personas, []);
    expect(candidates.length).toBe(2);
    expect(candidates[0].name).toBe("Fitness Enthusiast");
  });

  it("logs a gap and returns nothing when no personas are provided", () => {
    const gaps: string[] = [];
    const candidates = discoverAudienceCandidates([], gaps);
    expect(candidates.length).toBe(0);
    expect(gaps.length).toBeGreaterThan(0);
  });
});
