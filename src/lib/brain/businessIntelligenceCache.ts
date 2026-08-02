/**
 * Smarkin OS — Business Intelligence Cache
 *
 * gatherBusinessIntelligence() in businessIntelligenceEngine.ts is completely
 * unmodified — same signature, same synchronous, pure behavior, so every
 * existing test script from this session keeps working unmodified. This file
 * only changes HOW the profile is retrieved, never what it contains.
 *
 * Honest note: unlike every pure, in-memory function built this session,
 * this file requires a real Supabase connection and cannot be verified via
 * direct ts-node execution in this environment. It's written against the
 * exact same createClient/query patterns already proven working in
 * decision/new/actions.ts and the other migrations this session, but it
 * needs verification against the real deployed database before being
 * trusted the way the pure functions have been.
 */
import { createClient } from "@/lib/supabase/server";
import { gatherBusinessIntelligence, BusinessIntelligenceInput, BusinessIntelligenceProfile } from "../businessIntelligenceEngine";
import { messageBus } from "./messageBus";
import { traceStore } from "./diagnostics/traceStore";
import { CURRENT_DATA_VERSION } from "./dataVersion";

export { CURRENT_DATA_VERSION };

interface CachedProfile {
  product_profile: unknown;
  customer_profile: unknown;
  interest_profile: unknown;
  psychology_profile: unknown;
  journey_profile: unknown;
  knowledge_graph_profile: unknown;
  gaps: unknown;
  source_data_version: string;
}

function safelyRecordCacheMetric(executionId: string, update: Parameters<typeof traceStore.recordCacheMetric>[1]): void {
  try {
    traceStore.recordCacheMetric(executionId, update);
  } catch (diagnosticError) {
    console.error("[BusinessIntelligenceCache] Cache metric recording failed (cache lookup unaffected):", diagnosticError);
  }
}

export async function getOrBuildBusinessIntelligence(
  userId: string,
  input: BusinessIntelligenceInput,
  executionId: string,
): Promise<BusinessIntelligenceProfile> {
  const supabase = await createClient();

  const readStart = Date.now();
  const { data: cached } = await supabase
    .from("business_intelligence_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("product_name", input.productName)
    .maybeSingle<CachedProfile>();
  const readTime = Date.now() - readStart;
  safelyRecordCacheMetric(executionId, { readTime });

  if (cached && cached.source_data_version === CURRENT_DATA_VERSION) {
    messageBus.publish("cache.hit", { executionId, productName: input.productName });
    safelyRecordCacheMetric(executionId, { hit: true, miss: false });
    return {
      input,
      productProfile: cached.product_profile,
      customerProfile: cached.customer_profile,
      interestProfile: cached.interest_profile,
      psychologyProfile: cached.psychology_profile,
      journeyProfile: cached.journey_profile,
      knowledgeGraphProfile: cached.knowledge_graph_profile,
      gaps: cached.gaps,
    } as BusinessIntelligenceProfile;
  }

  // A version mismatch is a specific KIND of miss (something was cached,
  // just for an older data version) — distinguished for diagnostics, not a
  // new code path in the actual retrieval logic below, which is identical
  // for both a true miss and a version mismatch.
  const isVersionMismatch = !!cached && cached.source_data_version !== CURRENT_DATA_VERSION;
  messageBus.publish("cache.miss", { executionId, productName: input.productName });
  safelyRecordCacheMetric(executionId, { hit: false, miss: true, versionMismatch: isVersionMismatch, rebuild: true });

  // The untouched original — zero changes to its logic or output shape.
  const profile = gatherBusinessIntelligence(input);

  const writeStart = Date.now();
  // Explicit select-then-insert-or-update, not .upsert(). campaign_audiences
  // (the one other real upsert in this codebase) uses a single unified
  // "for all" RLS policy; this table uses three separate policies
  // (select/insert/update), and I can't conclusively prove from static
  // analysis alone that ON CONFLICT DO UPDATE composes safely with that
  // policy shape — a real RLS violation was observed in production logs.
  // Two simple operations, each already proven correct elsewhere in this
  // codebase, replace one operation I can't fully verify.
  const { data: existingRow } = await supabase
    .from("business_intelligence_profiles")
    .select("id")
    .eq("user_id", userId)
    .eq("product_name", input.productName)
    .maybeSingle();

  const payload = {
    user_id: userId,
    product_name: input.productName,
    product_profile: profile.productProfile,
    customer_profile: profile.customerProfile,
    interest_profile: profile.interestProfile,
    psychology_profile: profile.psychologyProfile,
    journey_profile: profile.journeyProfile,
    knowledge_graph_profile: profile.knowledgeGraphProfile,
    gaps: profile.gaps,
    source_data_version: CURRENT_DATA_VERSION,
  };

  const { error } = existingRow
    ? await supabase.from("business_intelligence_profiles").update(payload).eq("id", existingRow.id)
    : await supabase.from("business_intelligence_profiles").insert(payload);
  safelyRecordCacheMetric(executionId, { writeTime: Date.now() - writeStart });

  if (error) {
    // A cache write failure must never break the actual request — the
    // profile was already computed correctly above and can still be
    // returned; only future calls lose the benefit of the cache until the
    // next successful write.
    console.error("[BusinessIntelligenceCache] Failed to persist profile:", error.message);
  }

  return profile;
}
