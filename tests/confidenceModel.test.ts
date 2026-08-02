import { describe, it, expect } from "vitest";
import { confidenceTier, confidenceLabel, stringConfidenceToScore } from "@/lib/confidence";
import { recommendNextAction, BusinessProfile } from "@/lib/decisionEngine";
import { analyzeMarketingReasoning } from "@/lib/marketingReasoningEngine";

/**
 * Regression guard for the exact bug this sprint fixed: ConfidenceRing and
 * ConfidenceBadge each had their own, different tier thresholds before
 * this file existed. Any future component computing a confidence tier
 * must go through confidenceTier() — these tests pin its exact behavior
 * so a future edit can't silently reintroduce a second, disagreeing set
 * of thresholds.
 */
describe("Shared Confidence Model", () => {
  it("agrees on a single threshold for high/medium/low, with no gaps or overlaps", () => {
    expect(confidenceTier(100)).toBe("high");
    expect(confidenceTier(75)).toBe("high");
    expect(confidenceTier(74)).toBe("medium");
    expect(confidenceTier(45)).toBe("medium");
    expect(confidenceTier(44)).toBe("low");
    expect(confidenceTier(0)).toBe("low");
  });

  it("produces a human label consistent with the tier", () => {
    expect(confidenceLabel(90)).toBe("High Confidence");
    expect(confidenceLabel(60)).toBe("Moderate Confidence");
    expect(confidenceLabel(10)).toBe("Low Confidence");
  });

  it("converts Decision Engine's real string confidence values to representative numeric scores", () => {
    expect(stringConfidenceToScore("High")).toBe(85);
    expect(stringConfidenceToScore("Medium")).toBe(60);
    expect(stringConfidenceToScore("Low")).toBe(30);
    expect(stringConfidenceToScore("high")).toBe(85); // case-insensitive
  });

  it("never crashes on an unrecognized confidence string, defaulting to the low tier rather than 0 or 100", () => {
    expect(stringConfidenceToScore("something-unexpected")).toBe(30);
  });
});

describe("Decision Engine — channelConfidenceScore (additive field, Priority 6)", () => {
  it("is present alongside the original string field, correctly derived from it, without altering the string", () => {
    const businessProfile: BusinessProfile = {
      industry: "Health & Fitness", businessModel: "B2C", budgetRange: "$2,000-$10,000/month",
      weeklyHours: "10 hours/week", teamSize: "2-5 people", marketingExperience: "Intermediate",
      existingAssets: "Established", businessStage: "Growth", goal: "Sales",
    };
    const reasoning = analyzeMarketingReasoning(["Fitness Enthusiast", "Bodybuilder"]);
    const decision = recommendNextAction(businessProfile, reasoning);

    expect(typeof decision.channelConfidence).toBe("string");
    expect(typeof decision.channelConfidenceScore).toBe("number");
    expect(decision.channelConfidenceScore).toBeGreaterThanOrEqual(0);
    expect(decision.channelConfidenceScore).toBeLessThanOrEqual(100);
    expect(decision.channelConfidenceScore).toBe(stringConfidenceToScore(decision.channelConfidence));
  });
});
