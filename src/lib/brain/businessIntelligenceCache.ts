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

  // TEMPORARY, MORE ROBUST DIAGNOSTIC: writes directly to a real table
  // instead of console.error, since reliably finding the right Vercel
  // log line has proven difficult across many attempts. This table has
  // RLS disabled entirely, so a failure to write here would itself be
  // real, informative evidence (e.g., a genuinely broken Supabase
  // connection in this context), not just another log to search for.
  async function debugLog(label: string, detail: string) {
    try {
      await supabase.from("temp_debug_log").insert({ label, detail });
    } catch (e) {
      // Even this failing is real information — but nothing more to do
      // about it here.
    }
  }

  await debugLog("function-entry", `userId param: ${userId}, productName: ${input.productName}`);

  const readStart = Date.now();
  const { data: cached, error: readError } = await supabase
    .from("business_intelligence_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("product_name", input.productName)
    .maybeSingle<CachedProfile>();
  const readTime = Date.now() - readStart;
  safelyRecordCacheMetric(executionId, { readTime });
  await debugLog("after-read", `cached: ${cached ? "found" : "null"}, readError: ${readError?.message ?? "none"}`);

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

  const isVersionMismatch = !!cached && cached.source_data_version !== CURRENT_DATA_VERSION;
  messageBus.publish("cache.miss", { executionId, productName: input.productName });
  safelyRecordCacheMetric(executionId, { hit: false, miss: true, versionMismatch: isVersionMismatch, rebuild: true });

  let profile: BusinessIntelligenceProfile;
  try {
    profile = gatherBusinessIntelligence(input);
    await debugLog("after-gather", "gatherBusinessIntelligence succeeded");
  } catch (gatherError) {
    await debugLog("gather-EXCEPTION", gatherError instanceof Error ? gatherError.message : String(gatherError));
    throw gatherError;
  }

  const writeStart = Date.now();

  const { data: authCheck, error: authError } = await supabase.auth.getUser();
  await debugLog("auth-check", `userId param: ${userId} | auth.uid(): ${authCheck?.user?.id ?? "NULL"} | authError: ${authError?.message ?? "none"}`);

  const { data: existingRow, error: existingRowError } = await supabase
    .from("business_intelligence_profiles")
    .select("id")
    .eq("user_id", userId)
    .eq("product_name", input.productName)
    .maybeSingle();
  await debugLog("existing-row-check", `existingRow: ${existingRow ? existingRow.id : "null"} | error: ${existingRowError?.message ?? "none"}`);

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
  await debugLog("after-write", `writeError: ${error?.message ?? "none (success)"}`);

  if (error) {
    console.error("[BusinessIntelligenceCache] Failed to persist profile:", error.message);
  }

  return profile;
}
