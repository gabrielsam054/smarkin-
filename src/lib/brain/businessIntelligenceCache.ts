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
import { buildServiceRoleClient } from "@/lib/supabase/serviceClient";
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

// TEMPORARY, fully independent diagnostic logger — a real, separate
// service-role client, deliberately NOT the same createClient() this
// function's own logic depends on. If createClient() itself is the
// thing failing (e.g., Next.js's cookies() context lost across a deep
// async chain), this logger needs to survive that failure to actually
// report it, not go down with it.
async function debugLog(label: string, detail: string) {
  try {
    const client = buildServiceRoleClient();
    if (!client) return;
    await client.from("temp_debug_log").insert({ label, detail });
  } catch (e) {
    // Nothing more to do if even this fails — but this function's own
    // try/catch below still reports the outer failure either way.
  }
}

export async function getOrBuildBusinessIntelligence(
  userId: string,
  input: BusinessIntelligenceInput,
  executionId: string,
): Promise<BusinessIntelligenceProfile> {
  await debugLog("outer-entry", `userId param: ${userId}, productName: ${input.productName} — before createClient()`);

  try {
    const supabase = await createClient();
    await debugLog("after-createClient", "createClient() succeeded");

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

    const profile = gatherBusinessIntelligence(input);
    await debugLog("after-gather", "gatherBusinessIntelligence succeeded");

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
  } catch (outerError) {
    // The real thing this catches: createClient() itself throwing, or
    // any other exception anywhere in the block above — captured here
    // via the independent logger so it's visible even if the main
    // client is what failed.
    await debugLog("OUTER-EXCEPTION", outerError instanceof Error ? `${outerError.name}: ${outerError.message}` : String(outerError));
    throw outerError;
  }
}
