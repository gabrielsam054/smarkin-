import { describe, it, expect, beforeEach } from "vitest";
import { registerService, resolveService, isServiceRegistered, _clearRegistryForTesting } from "@/lib/brain/serviceContainer";
import { registerPipeline, buildPipeline, isCapabilityRegistered, _clearPipelinesForTesting } from "@/lib/brain/pipelineBuilder";
import { validateBrainRequest } from "@/lib/security/validation";
import type { SmarkinService } from "@/lib/brain/smarkinService";

/**
 * The Extension Rule is this architecture's central promise: a new
 * capability can be added using only registerService()/registerPipeline(),
 * with zero changes to Brain, Security Gateway, Service Container,
 * Pipeline Builder, or Message Bus. This was re-verified by hand after
 * every real capability added this project (Advertising, Customer
 * Research, Audience Research) — this test file is that same verification,
 * committed for real instead of run once and discarded.
 */
describe("Capability Registry + Extension Rule", () => {
  beforeEach(() => {
    _clearRegistryForTesting();
    _clearPipelinesForTesting();
  });

  it("registers a service and resolves it by id", () => {
    const engine: SmarkinService = {
      serviceId: "test-engine", serviceType: "engine", version: "1.0.0",
      dependsOn: [], optionalDependsOn: [], requiresBusinessIntelligence: false, requiresMemory: "none",
      execute: async () => ({ ok: true }),
    };
    registerService(engine);
    expect(isServiceRegistered("test-engine")).toBe(true);
    expect(resolveService("test-engine")).toBe(engine);
  });

  it("throws when resolving an unregistered service, rather than silently returning undefined", () => {
    expect(() => resolveService("does-not-exist")).toThrow();
  });

  it("registers a pipeline and returns its exact declared order", () => {
    const mockStep: SmarkinService = {
      serviceId: "step-a", serviceType: "engine", version: "1.0.0",
      dependsOn: [], optionalDependsOn: [], requiresBusinessIntelligence: false, requiresMemory: "none",
      execute: async () => ({}),
    };
    // registerPipeline validates every step against a real registered
    // service — each step below must exist in the Service Container first,
    // exactly like a real capability's pipeline would require.
    registerService({ ...mockStep, serviceId: "step-a" });
    registerService({ ...mockStep, serviceId: "step-b" });
    registerService({ ...mockStep, serviceId: "step-c" });
    registerPipeline("test-capability", ["step-a", "step-b", "step-c"]);
    expect(isCapabilityRegistered("test-capability")).toBe(true);
    expect(buildPipeline("test-capability")).toEqual(["step-a", "step-b", "step-c"]);
  });

  it("reports a capability as unregistered before it's registered", () => {
    expect(isCapabilityRegistered("not-yet-registered")).toBe(false);
  });

  it("validation.ts accepts a capability the moment it's registered, with zero hardcoded list to update", () => {
    expect(validateBrainRequest({ productName: "x", payload: {}, capability: "brand-new-capability" }).valid).toBe(false);
    registerService({
      serviceId: "some-engine", serviceType: "engine", version: "1.0.0",
      dependsOn: [], optionalDependsOn: [], requiresBusinessIntelligence: false, requiresMemory: "none",
      execute: async () => ({}),
    });
    registerPipeline("brand-new-capability", ["some-engine"]);
    expect(validateBrainRequest({ productName: "x", payload: {}, capability: "brand-new-capability" }).valid).toBe(true);
  });

  it("Extension Rule: a fourth capability registers and executes correctly alongside three simulated real ones, using only registerService/registerPipeline", async () => {
    // Mirrors the three real capabilities' actual dependsOn shapes, without
    // importing their real (Supabase-touching) implementations.
    const mockBI: SmarkinService = { serviceId: "business-intelligence", serviceType: "engine", version: "1.0.0", dependsOn: [], optionalDependsOn: [], requiresBusinessIntelligence: false, requiresMemory: "read-write", execute: async () => ({}) };
    const mockAdvertising: SmarkinService = { serviceId: "advertising", serviceType: "capability", version: "1.0.0", dependsOn: ["business-intelligence"], optionalDependsOn: [], requiresBusinessIntelligence: true, requiresMemory: "write", execute: async () => ({}) };
    const mockCustomerResearch: SmarkinService = { serviceId: "customer-research", serviceType: "capability", version: "1.0.0", dependsOn: ["business-intelligence"], optionalDependsOn: [], requiresBusinessIntelligence: true, requiresMemory: "write", execute: async () => ({}) };
    const mockAudienceResearch: SmarkinService = { serviceId: "audience-research", serviceType: "capability", version: "1.0.0", dependsOn: ["business-intelligence"], optionalDependsOn: [], requiresBusinessIntelligence: true, requiresMemory: "write", execute: async () => ({}) };
    [mockBI, mockAdvertising, mockCustomerResearch, mockAudienceResearch].forEach(registerService);
    registerPipeline("advertising", ["business-intelligence"]);
    registerPipeline("customer-research", ["business-intelligence"]);
    registerPipeline("audience-research", ["business-intelligence"]);

    // The fourth, brand-new capability — registered using only the public
    // registration APIs, nothing else.
    const fourthEngine: SmarkinService<{ x: number }, { doubled: number }> = {
      serviceId: "quad-engine", serviceType: "engine", version: "1.0.0",
      dependsOn: [], optionalDependsOn: [], requiresBusinessIntelligence: false, requiresMemory: "none",
      async execute(input) { return { doubled: input.x * 2 }; },
    };
    const fourthCapability: SmarkinService<{ x: number }, { doubled: number }> = {
      serviceId: "quad-cap", serviceType: "capability", version: "1.0.0",
      dependsOn: ["quad-engine"], optionalDependsOn: [], requiresBusinessIntelligence: false, requiresMemory: "none",
      async execute(input, context) { return resolveService("quad-engine").execute(input, context) as Promise<{ doubled: number }>; },
    };
    registerService(fourthEngine);
    registerService(fourthCapability);
    registerPipeline("quad-cap", ["quad-engine"]);

    expect(isCapabilityRegistered("quad-cap")).toBe(true);
    expect(buildPipeline("quad-cap")).toEqual(["quad-engine"]);
    expect(validateBrainRequest({ productName: "x", payload: { x: 5 }, capability: "quad-cap" }).valid).toBe(true);

    const result = await resolveService("quad-cap").execute({ x: 21 }, {
      executionId: "exec-test", userId: "test-user", capability: "quad-cap",
      businessIntelligence: null, bus: { dispatch: async <T>() => undefined as T, publish: () => {} },
    });
    expect(result).toEqual({ doubled: 42 });
  });
});
