/**
 * Smarkin OS — Customer Research Repository (Supabase implementation)
 *
 * Same createClient()/query pattern already proven in businessIntelligenceCache.ts
 * and every migration this session. Cannot be verified via direct execution
 * in this sandbox (no live Supabase connection) — written against proven
 * patterns, needs verification against the real deployed database, same
 * honest disclosure as every Supabase-touching file since Phase 1.
 */
import { createClient } from "@/lib/supabase/server";
import { CustomerResearchRepository } from "./customerResearchRepository";
import { CustomerResearchAsset } from "../domain/customerResearchAsset";

interface CustomerResearchRow {
  id: string;
  user_id: string;
  business_id: string;
  version_number: number;
  research_version: string;
  source_data_version: string;
  persona_data: unknown;
  pain_points: unknown;
  desires: unknown;
  motivations: unknown;
  objections: unknown;
  journey: unknown;
  language: unknown;
  recommendations: unknown;
  confidence: number;
  gaps: unknown;
  created_at: string;
  updated_at: string;
}

function rowToAsset(row: CustomerResearchRow): CustomerResearchAsset {
  return {
    id: row.id,
    userId: row.user_id,
    businessId: row.business_id,
    versionNumber: row.version_number,
    researchLogicVersion: row.research_version,
    sourceDataVersion: row.source_data_version,
    personaNames: (row.persona_data as { name: string }[] | undefined)?.map(p => p.name) ?? [],
    result: {
      customerPersonas: row.persona_data,
      painPoints: row.pain_points,
      desires: row.desires,
      buyingMotivations: row.motivations,
      buyingObjections: row.objections,
      journey: row.journey,
      languagePatterns: row.language,
      recommendedMessaging: row.recommendations,
      confidenceScore: row.confidence,
      gaps: row.gaps,
    } as unknown as CustomerResearchAsset["result"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseCustomerResearchRepository implements CustomerResearchRepository {
  async findLatest(userId: string, businessId: string): Promise<CustomerResearchAsset | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customer_research")
      .select("*")
      .eq("user_id", userId)
      .eq("business_id", businessId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle<CustomerResearchRow>();

    if (error) {
      console.error("[SupabaseCustomerResearchRepository] findLatest failed:", error.message);
      return null; // treated as a cache miss, never as a fatal error — matches businessIntelligenceCache.ts's read-failure isolation
    }
    return data ? rowToAsset(data) : null;
  }

  async findVersions(userId: string, businessId: string): Promise<CustomerResearchAsset[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customer_research")
      .select("*")
      .eq("user_id", userId)
      .eq("business_id", businessId)
      .order("version_number", { ascending: false });

    if (error) {
      console.error("[SupabaseCustomerResearchRepository] findVersions failed:", error.message);
      return [];
    }
    return (data as CustomerResearchRow[] ?? []).map(rowToAsset);
  }

  async save(asset: CustomerResearchAsset): Promise<CustomerResearchAsset> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customer_research")
      .insert({
        user_id: asset.userId,
        business_id: asset.businessId,
        research_version: asset.researchLogicVersion, // the only real column for this value - migration 018, not 019
        version_number: asset.versionNumber,
        source_data_version: asset.sourceDataVersion,
        persona_data: asset.result.customerPersonas,
        pain_points: asset.result.painPoints,
        desires: asset.result.desires,
        motivations: asset.result.buyingMotivations,
        objections: asset.result.buyingObjections,
        journey: asset.result.buyingStage,
        language: asset.result.languagePatterns,
        recommendations: asset.result.recommendedMessaging,
        confidence: asset.result.confidenceScore,
        gaps: asset.result.gaps,
      })
      .select()
      .single<CustomerResearchRow>();

    if (error || !data) {
      // A persistence failure must never break the caller — the asset was
      // already correctly generated; return it unpersisted rather than
      // throw, same "diagnostics/persistence failures can't break real
      // execution" isolation used throughout this codebase.
      console.error("[SupabaseCustomerResearchRepository] save failed:", error?.message);
      return asset;
    }
    return rowToAsset(data);
  }
}
