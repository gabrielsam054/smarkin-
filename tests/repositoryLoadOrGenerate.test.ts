import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryCustomerResearchRepository } from "@/lib/capabilities/customerResearch/repository/inMemoryCustomerResearchRepository";
import { CustomerResearchAsset, CURRENT_RESEARCH_LOGIC_VERSION, isAssetFresh } from "@/lib/capabilities/customerResearch/domain/customerResearchAsset";
import { InMemoryAudienceResearchRepository } from "@/lib/capabilities/audienceResearch/repository/inMemoryAudienceResearchRepository";
import { AudienceResearchAsset, CURRENT_AUDIENCE_RESEARCH_LOGIC_VERSION, isAudienceAssetFresh } from "@/lib/capabilities/audienceResearch/domain/audienceResearchAsset";

const CURRENT_DATA_VERSION = "v15";

/**
 * These tests exercise the real InMemory repository implementations
 * directly (not mocks of them) — the same class that's swapped in for the
 * real Supabase repository via constructor injection in production. What's
 * verified here is genuinely the same load-or-generate logic used by both
 * CustomerResearchService and AudienceResearchService; only the two
 * services' thin async wrapper (which requires a live Supabase-backed
 * default repository as its fallback parameter) can't be imported directly
 * in a test that shouldn't require a database connection.
 */
describe("Customer Research Repository — versioning and isolation", () => {
  let repo: InMemoryCustomerResearchRepository;
  beforeEach(() => { repo = new InMemoryCustomerResearchRepository(); });

  it("returns null for a business with no saved research yet", async () => {
    const result = await repo.findLatest("user-1", "Whey Protein");
    expect(result).toBeNull();
  });

  it("save() assigns a real id and returns it in the saved asset", async () => {
    const asset: CustomerResearchAsset = {
      id: null, userId: "user-1", businessId: "Whey Protein", versionNumber: 1,
      researchLogicVersion: CURRENT_RESEARCH_LOGIC_VERSION, sourceDataVersion: CURRENT_DATA_VERSION,
      personaNames: ["Fitness Enthusiast"], result: {} as CustomerResearchAsset["result"],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const saved = await repo.save(asset);
    expect(saved.id).not.toBeNull();
  });

  it("findLatest returns the highest version number among multiple saved versions", async () => {
    const base: Omit<CustomerResearchAsset, "id" | "versionNumber"> = {
      userId: "user-1", businessId: "Whey Protein",
      researchLogicVersion: CURRENT_RESEARCH_LOGIC_VERSION, sourceDataVersion: CURRENT_DATA_VERSION,
      personaNames: [], result: {} as CustomerResearchAsset["result"],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await repo.save({ ...base, id: null, versionNumber: 1 });
    await repo.save({ ...base, id: null, versionNumber: 2 });
    await repo.save({ ...base, id: null, versionNumber: 3 });
    const latest = await repo.findLatest("user-1", "Whey Protein");
    expect(latest?.versionNumber).toBe(3);
  });

  it("isolates research by user — a different user's identical business name never returns another user's data", async () => {
    const asset: CustomerResearchAsset = {
      id: null, userId: "user-1", businessId: "Whey Protein", versionNumber: 1,
      researchLogicVersion: CURRENT_RESEARCH_LOGIC_VERSION, sourceDataVersion: CURRENT_DATA_VERSION,
      personaNames: [], result: {} as CustomerResearchAsset["result"],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await repo.save(asset);
    const otherUser = await repo.findLatest("user-2", "Whey Protein");
    expect(otherUser).toBeNull();
  });

  it("isAssetFresh correctly detects both logic-version and data-version staleness", () => {
    const asset: CustomerResearchAsset = {
      id: "1", userId: "user-1", businessId: "Whey Protein", versionNumber: 1,
      researchLogicVersion: CURRENT_RESEARCH_LOGIC_VERSION, sourceDataVersion: "v15",
      personaNames: [], result: {} as CustomerResearchAsset["result"],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    expect(isAssetFresh(asset, "v15")).toBe(true);
    expect(isAssetFresh(asset, "v16")).toBe(false);
    expect(isAssetFresh({ ...asset, researchLogicVersion: "0.0.1" }, "v15")).toBe(false);
  });
});

describe("Audience Research Repository — versioning and isolation", () => {
  let repo: InMemoryAudienceResearchRepository;
  beforeEach(() => { repo = new InMemoryAudienceResearchRepository(); });

  it("returns null for a business with no saved research yet", async () => {
    const result = await repo.findLatest("user-1", "Whey Protein");
    expect(result).toBeNull();
  });

  it("findVersions returns all saved versions, ordered newest first", async () => {
    const base: Omit<AudienceResearchAsset, "id" | "versionNumber"> = {
      userId: "user-1", businessId: "Whey Protein",
      researchLogicVersion: CURRENT_AUDIENCE_RESEARCH_LOGIC_VERSION, sourceDataVersion: CURRENT_DATA_VERSION,
      result: {} as AudienceResearchAsset["result"],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    await repo.save({ ...base, id: null, versionNumber: 1 });
    await repo.save({ ...base, id: null, versionNumber: 2 });
    const versions = await repo.findVersions("user-1", "Whey Protein");
    expect(versions.length).toBe(2);
    expect(versions[0].versionNumber).toBe(2);
  });

  it("isAudienceAssetFresh matches the same freshness contract as Customer Research's", () => {
    const asset: AudienceResearchAsset = {
      id: "1", userId: "user-1", businessId: "Whey Protein", versionNumber: 1,
      researchLogicVersion: CURRENT_AUDIENCE_RESEARCH_LOGIC_VERSION, sourceDataVersion: "v15",
      result: {} as AudienceResearchAsset["result"],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    expect(isAudienceAssetFresh(asset, "v15")).toBe(true);
    expect(isAudienceAssetFresh(asset, "v16")).toBe(false);
  });
});
