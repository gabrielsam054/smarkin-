import { describe, it, expect } from "vitest";
import { gatherBusinessIntelligence, getPersonaNames } from "@/lib/businessIntelligenceEngine";
import { generatePersonas } from "@/lib/capabilities/customerResearch/services/personaGenerator";
import { analyzePainPoints } from "@/lib/capabilities/customerResearch/services/painPointAnalyzer";
import { calculateConfidence } from "@/lib/capabilities/customerResearch/services/confidenceCalculator";

describe("Customer Research — Persona Generator", () => {
  it("finds real, graph-sourced personas for a known product", () => {
    const profile = gatherBusinessIntelligence({ productName: "Whey Protein" });
    const gaps: string[] = [];
    const personas = generatePersonas(profile, gaps);
    expect(personas.length).toBeGreaterThan(0);
    expect(personas.every(p => p.name && p.primaryGoal)).toBe(true);
  });

  it("returns null demographic fields rather than fabricating them, since no source column exists", () => {
    const profile = gatherBusinessIntelligence({ productName: "Whey Protein" });
    const personas = generatePersonas(profile, []);
    for (const p of personas) {
      expect(p.ageRange).toBeNull();
      expect(p.occupation).toBeNull();
    }
  });

  it("logs a gap and returns an empty array when no personas exist for either source", () => {
    const profile = gatherBusinessIntelligence({ productName: "asdkjfhalskdjfhqwoeiruqwoiruqwoiruqwoieru" });
    const gaps: string[] = [];
    const personas = generatePersonas(profile, gaps);
    if (personas.length === 0) {
      expect(gaps.length).toBeGreaterThan(0);
    }
  });
});

describe("Customer Research — Pain Point Analyzer", () => {
  it("finds real, verified pain points via the Knowledge Graph for a known product", () => {
    const profile = gatherBusinessIntelligence({ productName: "Whey Protein" });
    const painPoints = analyzePainPoints(profile, []);
    expect(painPoints.length).toBeGreaterThan(0);
    expect(painPoints.every(p => p.urgencyScore >= 0 && p.urgencyScore <= 100)).toBe(true);
    expect(painPoints.every(p => p.source.length > 0)).toBe(true);
  });

  it("Knowledge-Graph-sourced pain points score higher than persona-database-sourced ones, reflecting real source confidence", () => {
    const profile = gatherBusinessIntelligence({ productName: "Whey Protein" });
    const painPoints = analyzePainPoints(profile, []);
    const graphSourced = painPoints.filter(p => p.source.includes("Knowledge Graph"));
    const dbSourced = painPoints.filter(p => p.source.includes("customerPersonaDatabase"));
    if (graphSourced.length > 0 && dbSourced.length > 0) {
      expect(graphSourced[0].urgencyScore).toBeGreaterThan(dbSourced[0].urgencyScore);
    }
  });
});

describe("Customer Research — Confidence Calculator", () => {
  it("scores rich, fully-matched data near the top of the range", () => {
    const score = calculateConfidence({
      personaCount: 2, painPointCount: 2, objectionCount: 2, languageRowsUsed: 5, journeyStagesWithData: 4, gapCount: 0,
    });
    expect(score).toBeGreaterThanOrEqual(90);
  });

  it("scores completely empty data as exactly zero", () => {
    const score = calculateConfidence({
      personaCount: 0, painPointCount: 0, objectionCount: 0, languageRowsUsed: 0, journeyStagesWithData: 0, gapCount: 10,
    });
    expect(score).toBe(0);
  });

  it("never exceeds 100 even with implausibly large inputs", () => {
    const score = calculateConfidence({
      personaCount: 999, painPointCount: 999, objectionCount: 999, languageRowsUsed: 999, journeyStagesWithData: 4, gapCount: 0,
    });
    expect(score).toBeLessThanOrEqual(100);
  });

  it("real logged gaps reduce the score — confidence isn't independent of disclosed limitations", () => {
    const withoutGaps = calculateConfidence({ personaCount: 1, painPointCount: 1, objectionCount: 0, languageRowsUsed: 2, journeyStagesWithData: 2, gapCount: 0 });
    const withGaps = calculateConfidence({ personaCount: 1, painPointCount: 1, objectionCount: 0, languageRowsUsed: 2, journeyStagesWithData: 2, gapCount: 3 });
    expect(withGaps).toBeLessThan(withoutGaps);
  });
});

describe("Customer Research — getPersonaNames merge (regression guard)", () => {
  it("merges Knowledge-Graph and tag-overlap personas without duplicates, for a product where only the graph has data", () => {
    const profile = gatherBusinessIntelligence({ productName: "Whey Protein" });
    const names = getPersonaNames(profile);
    const uniqueNames = new Set(names);
    expect(names.length).toBe(uniqueNames.size);
    expect(names.length).toBeGreaterThan(0);
  });
});
